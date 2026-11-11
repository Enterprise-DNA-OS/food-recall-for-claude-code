create table products (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 gtin text not null default '', unit text not null check(unit in ('each','kg','litre')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table locations (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 contact text not null default '', phone text not null default '', email text not null default '',
 address text not null default '', country text not null check(country in ('AU','NZ')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table lots (
 id uuid primary key default gen_random_uuid(), code text not null unique, product_id uuid not null references products,
 supplier text not null, date_mark date not null, quantity numeric(14,3) not null check(quantity>0),
 held numeric(14,3) not null default 0 check(held>=0), samples numeric(14,3) not null default 0 check(samples>=0),
 source_ref text not null, check(held+samples<=quantity),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table shipments (
 id uuid primary key default gen_random_uuid(), code text not null unique, lot_id uuid not null references lots,
 destination_id uuid not null references locations, quantity numeric(14,3) not null check(quantity>0),
 shipped_on date not null check(shipped_on<=current_date), source_ref text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table recalls (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 mode text not null check(mode in ('exercise','live')), jurisdiction text not null check(jurisdiction in ('AU','NZ')),
 owner text not null, reason text not null, started_on date not null check(started_on<=current_date),
 response_due date not null, status text not null default 'open' check(status in ('open','closed')),
 close_ref text, reviewer text, closed_at timestamptz,
 check(response_due>=started_on),
 check((status='open' and closed_at is null) or (status='closed' and close_ref is not null and reviewer is not null and closed_at is not null)),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table recall_lots (
 id uuid primary key default gen_random_uuid(), recall_id uuid not null references recalls, lot_id uuid not null references lots,
 unique(recall_id,lot_id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table recipients (
 id uuid primary key default gen_random_uuid(), recall_id uuid not null references recalls,
 lot_id uuid not null references lots, location_id uuid not null references locations,
 quantity numeric(14,3) not null check(quantity>0), contact_snapshot jsonb not null,
 unique(recall_id,lot_id,location_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table communications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references recipients,
 kind text not null check(kind in ('notified','acknowledged')), occurred_at timestamptz not null check(occurred_at<=now()),
 method text not null, reference text not null unique, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table recoveries (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references recipients,
 disposition text not null check(disposition in ('returned','destroyed','consumed')),
 quantity numeric(14,3) not null check(quantity>0), reference text not null unique, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table reports (
 id uuid primary key default gen_random_uuid(), recall_id uuid not null references recalls,
 kind text not null check(kind in ('interim','final')), reference text not null, recorded_on date not null check(recorded_on<=current_date),
 actor text not null, unique(recall_id,kind),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table plans (
 id uuid primary key default gen_random_uuid(), code text not null unique, jurisdiction text not null check(jurisdiction in ('AU','NZ')),
 owner text not null, reference text not null, reviewed_on date not null check(reviewed_on<=current_date), review_due date not null,
 check(review_due>=reviewed_on),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), recall_id uuid not null references recalls, body text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table imports (
 id uuid primary key default gen_random_uuid(), sha256 text not null unique, source_name text not null, row_count integer not null,
 mapping jsonb not null, raw_rows jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_log (
 id uuid primary key default gen_random_uuid(), table_name text not null, record_id uuid not null,
 action text not null, actor text not null, before_row jsonb, after_row jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_change() returns trigger language plpgsql as $$
begin
 if TG_OP='UPDATE' then NEW.updated_at=now(); end if;
 insert into audit_log(table_name,record_id,action,actor,before_row,after_row)
 values(TG_TABLE_NAME,coalesce(NEW.id,OLD.id),TG_OP,coalesce(nullif(current_setting('recall.actor',true),''),'database operator'),
 case when TG_OP='INSERT' then null else to_jsonb(OLD) end,case when TG_OP='DELETE' then null else to_jsonb(NEW) end);
 return coalesce(NEW,OLD);
end $$;
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'History is append-only; retain original records and record corrections separately'; end $$;
create function guard_shipment() returns trigger language plpgsql as $$
declare l lots;
begin
 select * into l from lots where id=NEW.lot_id for update;
 if exists(select 1 from recall_lots rl join recalls r on r.id=rl.recall_id where rl.lot_id=NEW.lot_id and r.status='open') then
 raise exception 'Lot is in an open recall or exercise; finish the reviewed process before recording more distribution'; end if;
 if NEW.quantity + coalesce((select sum(quantity) from shipments where lot_id=NEW.lot_id),0)+l.held+l.samples>l.quantity then raise exception 'Distribution exceeds lot quantity after holds and samples'; end if;
 return NEW;
end $$;
create trigger shipment_guard before insert on shipments for each row execute function guard_shipment();
create function guard_scope() returns trigger language plpgsql as $$
begin
 perform 1 from lots where id=NEW.lot_id for update;
 if (select status from recalls where id=NEW.recall_id)<>'open' then raise exception 'Recall is closed'; end if;
 if exists(select 1 from recall_lots rl join recalls r on r.id=rl.recall_id where rl.lot_id=NEW.lot_id and r.status='open') then raise exception 'Lot already has an open recall or exercise'; end if;
 return NEW;
end $$;
create trigger scope_guard before insert on recall_lots for each row execute function guard_scope();
create function snapshot_recipients() returns trigger language plpgsql as $$ begin
 insert into recipients(recall_id,lot_id,location_id,quantity,contact_snapshot)
 select NEW.recall_id,NEW.lot_id,s.destination_id,sum(s.quantity),to_jsonb(l)
 from shipments s join locations l on l.id=s.destination_id where s.lot_id=NEW.lot_id group by s.destination_id,l.id;
 return NEW;
end $$;
create trigger scope_snapshot after insert on recall_lots for each row execute function snapshot_recipients();
create function guard_response() returns trigger language plpgsql as $$
declare rec recipients;
begin
 select * into rec from recipients where id=NEW.recipient_id for update;
 if (select status from recalls where id=rec.recall_id)<>'open' then raise exception 'Recall is closed'; end if;
 if TG_TABLE_NAME='recoveries' then
 if NEW.quantity+coalesce((select sum(quantity) from recoveries where recipient_id=NEW.recipient_id),0)>rec.quantity then raise exception 'Recovery exceeds distributed quantity'; end if;
 end if;
 return NEW;
end $$;
create trigger recovery_guard before insert on recoveries for each row execute function guard_response();
create trigger communication_guard before insert on communications for each row execute function guard_response();
create view recovery_balance as
select r.id recall_id,r.code recall,r.mode,r.owner,r.status,r.response_due,x.id recipient_id,l.code lot,p.name product,p.unit,
 loc.code destination,x.contact_snapshot->>'name' destination_name,x.quantity distributed,
 coalesce((select sum(quantity) from recoveries v where v.recipient_id=x.id and disposition='returned'),0) returned,
 coalesce((select sum(quantity) from recoveries v where v.recipient_id=x.id and disposition='destroyed'),0) destroyed,
 coalesce((select sum(quantity) from recoveries v where v.recipient_id=x.id and disposition='consumed'),0) consumed,
 x.quantity-coalesce((select sum(quantity) from recoveries v where v.recipient_id=x.id),0) unaccounted,
 exists(select 1 from communications c where c.recipient_id=x.id and kind='notified') notified,
 exists(select 1 from communications c where c.recipient_id=x.id and kind='acknowledged') acknowledged
from recipients x join recalls r on r.id=x.recall_id join lots l on l.id=x.lot_id join products p on p.id=l.product_id join locations loc on loc.id=x.location_id;
create view lot_balance as
select l.id,l.code lot,p.name product,p.unit,l.supplier,l.date_mark,l.quantity,l.held,l.samples,
 coalesce((select sum(quantity) from shipments s where s.lot_id=l.id),0) distributed,
 l.quantity-l.held-l.samples-coalesce((select sum(quantity) from shipments s where s.lot_id=l.id),0) undistributed
from lots l join products p on p.id=l.product_id;
create view record_checks as
select r.code recall,r.owner,'PLAN-MISSING' rule,'No current recall plan reference for this jurisdiction' finding from recalls r where r.status='open'
 and not exists(select 1 from plans p where p.jurisdiction=r.jurisdiction and p.review_due>=current_date)
union all
select r.code,r.owner,'CONTACT-GAP','Recipient '||l.code||' lacks contact, phone or address in the recall snapshot' from recipients x join recalls r on r.id=x.recall_id join locations l on l.id=x.location_id where r.status='open' and (coalesce(x.contact_snapshot->>'contact','')='' or coalesce(x.contact_snapshot->>'phone','')='' or coalesce(x.contact_snapshot->>'address','')='')
union all
select recall,owner,'NOTIFY-EVIDENCE','No notification record: '||destination||' / '||lot from recovery_balance where status='open' and not notified
union all
select recall,owner,'ACK-EVIDENCE','No acknowledgement record: '||destination||' / '||lot from recovery_balance where status='open' and not acknowledged
union all
select recall,owner,'RESPONSE-OVERDUE','Local follow-up date passed: '||destination||' / '||lot from recovery_balance where status='open' and response_due<current_date and (not acknowledged or unaccounted>0)
union all
select r.code,r.owner,'AU-INTERIM','Interim report reference missing after two weeks' from recalls r where r.status='open' and r.jurisdiction='AU' and r.started_on+14<current_date and not exists(select 1 from reports p where p.recall_id=r.id and p.kind='interim')
union all
select r.code,r.owner,'AU-FINAL','Final report reference missing after four weeks' from recalls r where r.status='open' and r.jurisdiction='AU' and r.started_on+28<current_date and not exists(select 1 from reports p where p.recall_id=r.id and p.kind='final');
create function guard_close() returns trigger language plpgsql as $$ begin
 if OLD.status='closed' then raise exception 'Closed recall is immutable'; end if;
 if NEW.status='closed' then
 if not exists(select 1 from recall_lots where recall_id=OLD.id) then raise exception 'Recall has no scope'; end if;
 if exists(select 1 from recovery_balance where recall_id=OLD.id and (unaccounted<>0 or not notified or not acknowledged)) then raise exception 'Unaccounted stock or communication evidence prevents closure'; end if;
 if exists(select 1 from record_checks where recall=OLD.code) then raise exception 'Open record checks prevent closure'; end if;
 end if;
 return NEW;
end $$;
create trigger close_guard before update on recalls for each row execute function guard_close();
do $$ declare t text; begin
 foreach t in array array['products','locations','lots','shipments','recalls','recall_lots','recipients','communications','recoveries','reports','plans','notes','imports'] loop
 execute format('create trigger record_audit before insert or update or delete on %I for each row execute function audit_change()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['products','locations','lots','shipments','recall_lots','recipients','communications','recoveries','reports','plans','notes','imports','audit_log'] loop
 execute format('create trigger history_guard before update or delete on %I for each row execute function immutable_record()',t);
 end loop;
end $$;
alter table audit_log enable row level security;
revoke all on audit_log,recovery_balance,lot_balance,record_checks from public;

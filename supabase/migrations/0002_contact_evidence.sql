create table contact_verifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references recipients,
 contact text not null check(length(trim(contact))>0), phone text not null check(length(trim(phone))>0),
 address text not null check(length(trim(address))>0), reference text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table contact_verifications enable row level security;
revoke all on contact_verifications from public;
create trigger record_audit before insert on contact_verifications for each row execute function audit_change();
create trigger history_guard before update or delete on contact_verifications for each row execute function immutable_record();
create or replace function guard_response() returns trigger language plpgsql as $$
declare rec recipients;
begin
 select * into rec from recipients where id=NEW.recipient_id;
 perform 1 from recalls where id=rec.recall_id for update;
 select * into rec from recipients where id=NEW.recipient_id for update;
 if (select status from recalls where id=rec.recall_id)<>'open' then raise exception 'Recall is closed'; end if;
 if TG_TABLE_NAME='recoveries' then
 if NEW.quantity+coalesce((select sum(quantity) from recoveries where recipient_id=NEW.recipient_id),0)>rec.quantity then raise exception 'Recovery exceeds distributed quantity'; end if;
 end if;
 return NEW;
end $$;
create trigger contact_guard before insert on contact_verifications for each row execute function guard_response();
create or replace function guard_scope() returns trigger language plpgsql as $$
begin
 perform 1 from recalls where id=NEW.recall_id for update;
 perform 1 from lots where id=NEW.lot_id for update;
 if (select status from recalls where id=NEW.recall_id)<>'open' then raise exception 'Recall is closed'; end if;
 if exists(select 1 from recall_lots rl join recalls r on r.id=rl.recall_id where rl.lot_id=NEW.lot_id and r.status='open') then raise exception 'Lot already has an open recall or exercise'; end if;
 return NEW;
end $$;
create or replace view record_checks as
select r.code recall,r.owner,'PLAN-MISSING' rule,'No current recall plan reference for this jurisdiction' finding from recalls r where r.status='open'
 and not exists(select 1 from plans p where p.jurisdiction=r.jurisdiction and p.review_due>=current_date)
union all
select r.code,r.owner,'CONTACT-GAP','Recipient '||l.code||' lacks contact, phone or address evidence' from recipients x join recalls r on r.id=x.recall_id join locations l on l.id=x.location_id where r.status='open' and (coalesce(x.contact_snapshot->>'contact','')='' or coalesce(x.contact_snapshot->>'phone','')='' or coalesce(x.contact_snapshot->>'address','')='') and not exists(select 1 from contact_verifications c where c.recipient_id=x.id)
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
create view distribution_contacts as
select x.recall_id,r.code recall,l.code lot,p.unit,d.code destination,x.quantity,
 x.contact_snapshot->>'name' business,
 coalesce(c.contact,x.contact_snapshot->>'contact') contact,
 coalesce(c.phone,x.contact_snapshot->>'phone') phone,
 coalesce(c.address,x.contact_snapshot->>'address') address,
 c.reference verification_reference
from recipients x join recalls r on r.id=x.recall_id join lots l on l.id=x.lot_id join products p on p.id=l.product_id join locations d on d.id=x.location_id
left join lateral(select * from contact_verifications v where v.recipient_id=x.id order by v.created_at desc,v.id desc limit 1)c on true;
revoke all on distribution_contacts from public;

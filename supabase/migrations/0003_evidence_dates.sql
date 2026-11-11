create or replace function guard_response() returns trigger language plpgsql as $$
declare rec recipients; r recalls;
begin
 select * into rec from recipients where id=NEW.recipient_id;
 select * into r from recalls where id=rec.recall_id for update;
 select * into rec from recipients where id=NEW.recipient_id for update;
 if r.status<>'open' then raise exception 'Recall is closed'; end if;
 if TG_TABLE_NAME='recoveries' then
 if NEW.quantity+coalesce((select sum(quantity) from recoveries where recipient_id=NEW.recipient_id),0)>rec.quantity then raise exception 'Recovery exceeds distributed quantity'; end if;
 elsif TG_TABLE_NAME='communications' then
 if NEW.occurred_at::date<r.started_on then raise exception 'Communication predates the recall'; end if;
 end if;
 return NEW;
end $$;
create function guard_report() returns trigger language plpgsql as $$
declare r recalls;
begin
 select * into r from recalls where id=NEW.recall_id for update;
 if r.status<>'open' then raise exception 'Recall is closed'; end if;
 if NEW.recorded_on<r.started_on then raise exception 'Report predates the recall'; end if;
 return NEW;
end $$;
create trigger report_guard before insert on reports for each row execute function guard_report();
create or replace function guard_close() returns trigger language plpgsql as $$ begin
 if OLD.status='closed' then raise exception 'Closed recall is immutable'; end if;
 if NEW.status='closed' then
 if not exists(select 1 from recall_lots where recall_id=OLD.id) then raise exception 'Recall has no scope'; end if;
 if exists(select 1 from recovery_balance where recall_id=OLD.id and (unaccounted<>0 or not notified or not acknowledged)) then raise exception 'Unaccounted stock or communication evidence prevents closure'; end if;
 if exists(select 1 from record_checks where recall=OLD.code) then raise exception 'Open record checks prevent closure'; end if;
 if OLD.jurisdiction='AU' and not exists(select 1 from reports where recall_id=OLD.id and kind='final') then raise exception 'Final report reference required by local closure policy'; end if;
 end if;
 return NEW;
end $$;

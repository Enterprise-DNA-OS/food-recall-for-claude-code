do $$
declare p uuid; l1 uuid; l2 uuid; a uuid; b uuid; r uuid; x uuid;
begin
 if exists(select 1 from products where code='DEMO-SOUP') then return; end if;
 perform set_config('recall.actor','fictional demo seed',true);
 insert into products(code,name,gtin,unit) values('DEMO-SOUP','Roasted pumpkin soup 500g','DEMO-GTIN','each') returning id into p;
 insert into locations(code,name,contact,phone,email,address,country) values('DEMO-NORTH','North Quay Foods','Ari Chen','+61 2 5550 0101','ari@example.invalid','1 Fictional Lane, Sydney NSW','AU') returning id into a;
 insert into locations(code,name,contact,phone,email,address,country) values('DEMO-SOUTH','South Quay Foods','','','','2 Fictional Lane, Melbourne VIC','AU') returning id into b;
 insert into lots(code,product_id,supplier,date_mark,quantity,held,samples,source_ref) values('DEMO-BATCH-A',p,'Fictional Pantry',current_date+30,1000,100,10,'DEMO production A') returning id into l1;
 insert into lots(code,product_id,supplier,date_mark,quantity,held,samples,source_ref) values('DEMO-BATCH-B',p,'Fictional Pantry',current_date+60,600,50,5,'DEMO production B') returning id into l2;
 insert into shipments(code,lot_id,destination_id,quantity,shipped_on,source_ref) values
 ('DEMO-DEL-A1',l1,a,500,current_date-25,'DEMO delivery A1'),('DEMO-DEL-A2',l1,b,300,current_date-24,'DEMO delivery A2'),('DEMO-DEL-B1',l2,a,200,current_date-5,'DEMO delivery B1');
 insert into recalls(code,name,mode,jurisdiction,owner,reason,started_on,response_due) values('DEMO-EXERCISE','Pumpkin soup trace exercise','exercise','AU','Mara','Fictional label mismatch exercise, no real product affected',current_date-20,current_date-19) returning id into r;
 insert into recall_lots(recall_id,lot_id) values(r,l1);
 select id into x from recipients where recall_id=r and location_id=a;
 insert into communications(recipient_id,kind,occurred_at,method,reference,actor) values(x,'notified',now()-interval '20 days','exercise phone record','DEMO-NOTIFY-A','Mara'),(x,'acknowledged',now()-interval '19 days','exercise reply','DEMO-ACK-A','Mara');
 insert into recoveries(recipient_id,disposition,quantity,reference,actor) values(x,'returned',350,'DEMO-RETURN-A','Mara'),(x,'consumed',50,'DEMO-CONSUMED-A','Mara');
 insert into plans(code,jurisdiction,owner,reference,reviewed_on,review_due) values('DEMO-PLAN','AU','Mara','Fictional recall plan revision 2',current_date-400,current_date-30);
 insert into notes(recall_id,body,actor) values(r,'Exercise only. Verify contacts before the next practice run.','Mara');
end $$;

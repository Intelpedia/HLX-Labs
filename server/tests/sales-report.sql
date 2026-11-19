-- Transactional fixtures: never leave orders or codes behind.
begin;
insert into public.cleffo_discount_codes(code,discount_type,amount) values('VERIFY_SALES','fixed',10);
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,discount_code,discount_cents,shipping_cents,total_cents,payment_state,created_at)
values
('VERIFY_SALES_PAID',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-SKU","name":"Fixture","qty":2,"price":46.67},{"sku":"VERIFY-SKU","name":"Fixture","qty":1,"price":46.66}]','{}','{}',15000,'VERIFY_SALES',1000,1500,15500,'completed','2100-01-01T12:00:00Z'),
('VERIFY_SALES_NO_CODE',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-SKU-2","name":"Fixture 2","qty":1,"price":30}]','{}','{}',3000,null,0,1500,4500,'completed','2100-01-01T12:00:00Z'),
('VERIFY_SALES_TEST',gen_random_uuid(),'fixture','fixture',true,'[{"sku":"VERIFY-SKU","name":"Fixture","qty":1,"price":50}]','{}','{}',5000,'VERIFY_SALES',0,1500,6500,'test_completed','2100-01-01T12:00:00Z'),
('VERIFY_SALES_PENDING',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-SKU","name":"Fixture","qty":1,"price":50}]','{}','{}',5000,'VERIFY_SALES',0,1500,6500,'pending','2100-01-01T12:00:00Z');
insert into public.orders(transaction_id,order_number,payment_status,total,currency,items,created_at,payment_provider) values
('VERIFY-TXN-PAID','VERIFY_SALES_PAID','paid',155,'USD','[]','2100-01-01T12:00:00Z','cleffo'),
('VERIFY-TXN-TEST','VERIFY_SALES_TEST','paid',65,'USD','[]','2100-01-01T12:00:00Z','cleffo'),
('VERIFY-TXN-LEGACY','VERIFY_SALES_LEGACY','paid',55,'USD','[{"sku":"VERIFY-SKU-3","name":"Legacy","qty":2,"price":20}]','2100-01-01T12:00:00Z','historical');
insert into public.orders(transaction_id,order_number,payment_status,total,currency,items,created_at,payment_provider)
values ('VERIFY-TXN-TAGADA','VERIFY_TAGADA_EXCLUDED','paid',999,'USD','[{"sku":"VERIFY-SKU","name":"Excluded","qty":99,"price":10}]','2100-01-01T12:00:00Z','tagada');
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,total_cents,payment_state,created_at)
values ('VERIFY_FEBRUARY',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-SKU","name":"Fixture","qty":1,"price":10}]','{}','{}',1000,1000,'completed','2100-02-01T12:00:00Z');
do $$ declare r jsonb; p jsonb; begin
 r:=public.hlx_sales_report(null,0,'2100-01-01','2100-01-01');
 if (r#>>'{overview,paid_orders}')::int<>3 or (r#>>'{overview,units}')::int<>6 or
 (r#>>'{overview,product_sales_cents}')::int<>21000 or (r#>>'{overview,paid_total_cents}')::int<>25500 then raise exception 'Totals, test exclusion, or deduplication failed'; end if;
 select x into p from jsonb_array_elements(r->'products') x where x->>'sku'='VERIFY-SKU';
 if (p->>'units')::int<>3 or (p->>'paid_orders')::int<>1 or (p->>'product_sales_cents')::int<>14000 or (p->>'min_unit_cents')::int<>4666 or (p->>'max_unit_cents')::int<>4667 then raise exception 'Split SKU prices or quantities incorrect'; end if;
 if (r#>>'{monthly,0,paid_orders}')::int<>3 or (r#>>'{monthly,0,units}')::int<>6 or (r#>>'{monthly,0,paid_total_cents}')::int<>25500 then raise exception 'Monthly aggregation failed'; end if;
 r:=public.hlx_sales_report(null,0,'2100-01-01','2100-02-01','asc');
 if r#>>'{monthly,0,month}'<>'2100-01' or r#>>'{monthly,1,month}'<>'2100-02' or r#>>'{orders,0,order_number}'='VERIFY_FEBRUARY' then raise exception 'Ascending order failed'; end if;
 r:=public.hlx_sales_report(null,0,'2100-01-01','2100-02-01','desc');
 if r#>>'{orders,0,order_number}'<>'VERIFY_FEBRUARY' or r#>>'{monthly,0,month}'<>'2100-02' then raise exception 'Descending order failed'; end if;
 r:=public.hlx_sales_report('VERIFY_SALES',0,'2100-01-01','2100-01-01');
 if (r->>'total_orders')::int<>1 then raise exception 'Code filter failed'; end if;
 r:=public.hlx_sales_report(null,0,'2100-01-02','2100-01-02');
 if (r->>'total_orders')::int<>0 or jsonb_array_length(r->'products')<40 then raise exception 'Date filter or zero-sales catalog failed'; end if;
 if has_function_privilege('anon','public.hlx_sales_report(text,integer,date,date,text)','execute') or has_function_privilege('authenticated','public.hlx_sales_report(text,integer,date,date,text)','execute') then raise exception 'Report exposed to customers'; end if;
end $$;
rollback;

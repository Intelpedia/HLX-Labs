-- Test only: fixtures and settings are rolled back.
begin;
update public.hlx_cost_settings set processing_rate=0.07,label_cents=400,free_shipping_threshold_cents=20000,free_shipping_cost_cents=1500;
insert into public.hlx_product_costs(sku,unit_cost_cents) values('VERIFY-COST-SKU',1000);
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,discount_cents,shipping_cents,tax_cents,total_cents,payment_state,created_at) values
('VERIFY_COST_BELOW',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-COST-SKU","name":"Fixture","qty":2,"price":90}]','{}','{}',19999,1999,1500,100,19600,'completed','2200-01-01T12:00:00Z'),
('VERIFY_COST_EXACT',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-COST-SKU","name":"Fixture","qty":2,"price":50},{"sku":"VERIFY-COST-SKU","name":"Fixture","qty":1,"price":50}]','{}','{}',20000,5000,0,0,15000,'completed','2200-01-01T12:00:00Z'),
('VERIFY_COST_ABOVE',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-COST-SKU","name":"Fixture","qty":1,"price":200}]','{}','{}',20001,1,0,1600,21600,'completed','2200-01-01T12:00:00Z');
do $$ declare r jsonb; o jsonb; p jsonb; begin
 r:=public.hlx_sales_report(null,0,'2200-01-01','2200-01-01');
 if (r#>>'{costs,product_cost_cents}')::int is distinct from 6000 or (r#>>'{costs,label_cost_cents}')::int is distinct from 2400 or (r#>>'{costs,processing_fee_cents}')::int is distinct from 3934 or (r#>>'{costs,shipping_expense_cents}')::int is distinct from 3000 or (r#>>'{costs,estimated_profit_cents}')::int is distinct from 37666 then raise exception 'Cost totals incorrect'; end if;
 select x into o from jsonb_array_elements(r->'orders') x where x->>'order_number'='VERIFY_COST_EXACT';
 if (o->>'shipping_expense_cents')::int is distinct from 1500 or (o->>'estimated_profit_cents')::int is distinct from 8250 then raise exception 'Threshold must use original subtotal, including exactly $200'; end if;
 select x into o from jsonb_array_elements(r->'orders') x where x->>'order_number'='VERIFY_COST_BELOW';
 if (o->>'shipping_expense_cents')::int is distinct from 0 or (o->>'processing_fee_cents')::int is distinct from 1372 then raise exception 'Below-threshold expense or fee basis incorrect'; end if;
 if (r#>>'{monthly,0,estimated_profit_cents}')::int is distinct from 37666 then raise exception 'Monthly profit incorrect'; end if;
 select x into p from jsonb_array_elements(r->'products') x where x->>'sku'='VERIFY-COST-SKU';
 if (p->>'direct_margin_cents')::int is distinct from 44600 then raise exception 'Product direct margin incorrect'; end if;
 if has_table_privilege('anon','public.hlx_product_costs','select') or has_table_privilege('authenticated','public.hlx_product_costs','select') or has_table_privilege('anon','public.hlx_cost_settings','select') then raise exception 'Costs exposed to public clients'; end if;
end $$;
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,total_cents,payment_state,created_at)
values ('VERIFY_COST_MISSING',gen_random_uuid(),'fixture','fixture',false,'[{"sku":"VERIFY-MISSING-COST","name":"Missing","qty":1,"price":10}]','{}','{}',1000,2500,'completed','2200-01-01T12:00:00Z');
do $$ declare r jsonb; begin
 r:=public.hlx_sales_report(null,0,'2200-01-01','2200-01-01');
 if r#>>'{costs,estimated_profit_cents}' is not null or (r#>>'{costs,orders_missing_costs}')::int is distinct from 1 or r#>>'{monthly,0,estimated_profit_cents}' is not null then raise exception 'Missing costs incorrectly treated as zero'; end if;
end $$;
rollback;

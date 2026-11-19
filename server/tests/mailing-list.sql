-- Transactional read/export regression. No messages are sent or persistent contacts created.
begin;
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,total_cents,payment_state)
values
('CONTACT_VERIFY_A',gen_random_uuid(),'fixture','fixture',false,'[]','{"email":"  Unique-Contact-QA@example.invalid  "}','{}',1000,1000,'completed'),
('CONTACT_VERIFY_B',gen_random_uuid(),'fixture','fixture',false,'[]','{"email":"unique-contact-qa@EXAMPLE.invalid"}','{}',1000,1000,'completed'),
('CONTACT_VERIFY_TEST',gen_random_uuid(),'fixture','fixture',true,'[]','{"email":"excluded-contact-qa@example.invalid"}','{}',1000,1000,'test_completed'),
('CONTACT_VERIFY_PENDING',gen_random_uuid(),'fixture','fixture',false,'[]','{"email":"pending-contact-qa@example.invalid"}','{}',1000,1000,'pending');
insert into public.orders(transaction_id,order_number,payment_status,total,currency,items,payment_provider,provider_payload)
values ('CONTACT-TXN-LEGACY','CONTACT_VERIFY_LEGACY','paid',10,'USD','[]','tagada','{"customer":{"email":"unique-contact-qa@example.invalid"}}'),
('CONTACT-TXN-TEST','CONTACT_VERIFY_TEST','paid',10,'USD','[]','cleffo','{"customer":{"email":"excluded-contact-qa@example.invalid"}}');
insert into public.cleffo_sessions(order_number,request_id,request_hash,access_hash,is_test,items,customer,ship_to,subtotal_cents,total_cents,payment_state)
select 'CONTACT_VERIFY_ACCOUNT',gen_random_uuid(),'fixture','fixture',false,'[]',jsonb_build_object('email','  '||upper(email)||' '),'{}',1000,1000,'completed' from auth.users where deleted_at is null and email is not null limit 1;
do $$ declare r jsonb; c jsonb; begin
 r:=public.hlx_mailing_list(0,true);
 select x into c from jsonb_array_elements(r->'contacts') x where x->>'email'='unique-contact-qa@example.invalid';
 if (c->>'paid_orders')::int is distinct from 3 or c->>'has_purchase'<>'true' then raise exception 'Purchase normalization or legacy merge failed'; end if;
 if (select count(*) from jsonb_array_elements(r->'contacts') x where x->>'email'='unique-contact-qa@example.invalid')<>1 then raise exception 'Duplicate email'; end if;
 if exists(select 1 from jsonb_array_elements(r->'contacts') x where x->>'email' in ('excluded-contact-qa@example.invalid','pending-contact-qa@example.invalid')) then raise exception 'Test/pending emails included'; end if;
 if not exists(select 1 from jsonb_array_elements(r->'contacts') x where (x->>'has_account')::boolean and (x->>'has_purchase')::boolean) then raise exception 'Account/purchase merge failed'; end if;
 if (select count(*) from jsonb_array_elements(r->'contacts'))<>(r->>'total_contacts')::int then raise exception 'Export missing contacts'; end if;
 if has_function_privilege('anon','public.hlx_mailing_list(integer,boolean)','execute') or has_function_privilege('authenticated','public.hlx_mailing_list(integer,boolean)','execute') then raise exception 'Contact data exposed'; end if;
end $$;
rollback;

-- Only the authenticated administrator Edge Function may call this contact export.
create or replace function public.hlx_mailing_list(page_offset integer default 0, export_all boolean default false)
returns jsonb language sql stable security invoker set search_path = '' as $$
with purchase_emails as (
 select customer->>'email' as email,order_number,created_at
 from public.cleffo_sessions where not is_test and payment_state='completed'
 union all
 select provider_payload#>>'{customer,email}',order_number,created_at
 from public.orders o where payment_status='paid'
 and not exists(select 1 from public.cleffo_sessions c where c.order_number=o.order_number)
), raw_contacts as (
 select email,created_at as seen_at,true as account,false as purchase,email_confirmed_at is not null as confirmed,null::text as order_number from auth.users where deleted_at is null
 union all
 select email,created_at,false,true,false,order_number from purchase_emails
), normalized as (
 select lower(btrim(email)) as email,seen_at,account,purchase,confirmed,order_number from raw_contacts
 where lower(btrim(email)) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
), contacts as (
 select email,bool_or(account) as has_account,bool_or(purchase) as has_purchase,bool_or(confirmed) as account_confirmed,
 count(distinct order_number) as paid_orders,min(seen_at) as first_seen,max(seen_at) as last_seen,'not_recorded'::text as marketing_consent
 from normalized group by email
), contact_page as (
 select * from contacts order by email limit case when export_all then null else 100 end offset case when export_all then 0 else greatest(0,page_offset) end
)
select jsonb_build_object('contacts',coalesce((select jsonb_agg(to_jsonb(c) order by email) from contact_page c),'[]'::jsonb),
 'total_contacts',(select count(*) from contacts),'account_contacts',(select count(*) from contacts where has_account),
 'purchase_contacts',(select count(*) from contacts where has_purchase),'page_size',100);
$$;
revoke all on function public.hlx_mailing_list(integer,boolean) from public,anon,authenticated;
grant execute on function public.hlx_mailing_list(integer,boolean) to service_role;

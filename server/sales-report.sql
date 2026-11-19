-- Read-only, server-only reporting API. Keep sections additive for future tools.
create or replace function public.hlx_sales_report(selected_code text default null, page_offset integer default 0, start_date date default null, end_date date default null)
returns jsonb language sql stable security invoker set search_path = '' as $$
with live as (
 select order_number,created_at,discount_code,subtotal_cents,discount_cents,shipping_cents,tax_cents,total_cents,payment_state,items,'Cleffo'::text as source,true as breakdown_known
 from public.cleffo_sessions where not is_test and payment_state='completed' and currency='USD'
), historical as (
 select o.order_number,o.created_at,null::text as discount_code,
 coalesce((select sum(round((i->>'price')::numeric*100)*(i->>'qty')::int) from jsonb_array_elements(o.items) i),0)::bigint as subtotal_cents,
 0 as discount_cents,0 as shipping_cents,0 as tax_cents,round(o.total*100)::bigint as total_cents,'completed'::text as payment_state,o.items,
 coalesce(o.payment_provider,'Historical')::text as source,false as breakdown_known
 from public.orders o where o.payment_status='paid' and o.currency='USD'
 and not exists(select 1 from public.cleffo_sessions c where c.order_number=o.order_number)
), paid as (
 select * from live union all select * from historical
), dated as (
 select * from paid where (start_date is null or (created_at at time zone 'America/New_York')::date>=start_date)
 and (end_date is null or (created_at at time zone 'America/New_York')::date<=end_date)
), filtered as (
 select * from dated where selected_code is null or discount_code=selected_code
), lines as (
 select p.order_number,p.created_at,coalesce(nullif(i->>'sku',''),'PRODUCT-'||coalesce(i->>'id',i->>'name')) as sku,
 i->>'name' as name,coalesce(i->>'selectedOption','') as size,(i->>'qty')::integer as qty,
 round((i->>'price')::numeric*100)::bigint as unit_cents
 from filtered p cross join lateral jsonb_array_elements(p.items) i
), product_sales as (
 select sku,max(name) as name,max(size) as size,sum(qty) as units,count(distinct order_number) as paid_orders,
 sum(qty*unit_cents) as product_sales_cents,min(unit_cents) as min_unit_cents,max(unit_cents) as max_unit_cents,
 round(sum(qty*unit_cents)::numeric/nullif(sum(qty),0)) as average_unit_cents
 from lines group by sku
), catalog as (
 select sku,max(name) as name,max(size) as size,max(unit_cents) as current_unit_cents,bool_or(active) as active
 from public.cleffo_catalog group by sku
), products as (
 select coalesce(c.sku,p.sku) as sku,coalesce(c.name,p.name) as name,coalesce(c.size,p.size) as size,
 c.current_unit_cents,coalesce(c.active,false) as active,coalesce(p.units,0) as units,coalesce(p.paid_orders,0) as paid_orders,
 coalesce(p.product_sales_cents,0) as product_sales_cents,p.min_unit_cents,p.max_unit_cents,p.average_unit_cents
 from catalog c full join product_sales p on c.sku=p.sku
), summaries as (
 select c.code,count(p.order_number) as paid_orders,coalesce(sum(p.subtotal_cents-p.discount_cents),0) as product_sales_cents,
 coalesce(sum(p.discount_cents),0) as discounts_cents,coalesce(sum(p.total_cents),0) as paid_total_cents
 from public.cleffo_discount_codes c left join dated p on p.discount_code=c.code
 where c.code not like 'QA\_%' escape '\' group by c.code
), order_page as (
 select * from filtered order by created_at desc,order_number desc limit 50 offset greatest(0,page_offset)
)
select jsonb_build_object(
 'version',1,
 'overview',(select jsonb_build_object('paid_orders',count(*),'units',coalesce((select sum(qty) from lines),0),
 'product_sales_cents',coalesce(sum(subtotal_cents-discount_cents),0),'discounts_cents',coalesce(sum(discount_cents),0),
 'shipping_cents',coalesce(sum(shipping_cents),0),'tax_cents',coalesce(sum(tax_cents),0),
 'paid_total_cents',coalesce(sum(total_cents),0),'average_order_cents',coalesce(round(avg(total_cents)),0),
 'historical_orders',count(*) filter(where not breakdown_known)) from filtered),
 'products',coalesce((select jsonb_agg(to_jsonb(p) order by p.product_sales_cents desc,p.name,p.sku) from products p),'[]'::jsonb),
 'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.code) from summaries s),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc,o.order_number desc) from order_page o),'[]'::jsonb),
 'total_orders',(select count(*) from filtered),'page_size',50,
 'coverage',jsonb_build_object('currency','USD','timezone','America/New_York','historical_test_status','unavailable','refunds_included',false)
);
$$;
revoke all on function public.hlx_sales_report(text,integer,date,date) from public,anon,authenticated;
grant execute on function public.hlx_sales_report(text,integer,date,date) to service_role;

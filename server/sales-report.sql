-- Read-only, server-only reporting API. Keep sections additive for future tools.
drop function if exists public.hlx_sales_report(text,integer,date,date);
create or replace function public.hlx_sales_report(selected_code text default null, page_offset integer default 0, start_date date default null, end_date date default null, date_sort text default 'desc')
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
 and lower(coalesce(o.payment_provider,'')) not in ('tagada','tagadapay')
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
), monthly_totals as (
 select to_char(created_at at time zone 'America/New_York','YYYY-MM') as month,
 count(*) as paid_orders,
 sum(coalesce((select sum((i->>'qty')::int) from jsonb_array_elements(items) i),0)) as units,
 sum(subtotal_cents) as gross_revenue_cents,sum(subtotal_cents-discount_cents) as net_revenue_cents,
 sum(subtotal_cents-discount_cents) as product_sales_cents,sum(discount_cents) as discounts_cents,
 sum(shipping_cents) as shipping_cents,sum(tax_cents) as tax_cents,sum(total_cents) as paid_total_cents,
 round(avg(total_cents)) as average_order_cents
 from filtered group by to_char(created_at at time zone 'America/New_York','YYYY-MM')
), month_bounds as (
 select date_trunc('month',coalesce(start_date,(select min((created_at at time zone 'America/New_York')::date) from filtered)))::date as first_month,
 date_trunc('month',coalesce(end_date,(select max((created_at at time zone 'America/New_York')::date) from filtered)))::date as last_month
), month_calendar as (
 select d::date as month_date,to_char(d,'YYYY-MM') as month from month_bounds b cross join lateral generate_series(b.first_month::timestamp,b.last_month::timestamp,interval '1 month') d
), monthly_filled as (
 select c.month,coalesce(m.paid_orders,0) as paid_orders,coalesce(m.units,0) as units,
 coalesce(m.gross_revenue_cents,0) as gross_revenue_cents,coalesce(m.net_revenue_cents,0) as net_revenue_cents,
 coalesce(m.product_sales_cents,0) as product_sales_cents,coalesce(m.discounts_cents,0) as discounts_cents,
 coalesce(m.shipping_cents,0) as shipping_cents,coalesce(m.tax_cents,0) as tax_cents,coalesce(m.paid_total_cents,0) as paid_total_cents,m.average_order_cents,
 ((start_date is not null and start_date>c.month_date) or
 (end_date is not null and end_date<(c.month_date+interval '1 month - 1 day')::date) or
 c.month_date=date_trunc('month',now() at time zone 'America/New_York')::date) as partial_month
 from month_calendar c left join monthly_totals m using(month)
), monthly_previous as (
 select m.*,lag(net_revenue_cents) over(order by month) as previous_net_cents,
 lag(gross_revenue_cents) over(order by month) as previous_gross_cents,
 lag(paid_orders) over(order by month) as previous_orders,lag(units) over(order by month) as previous_units
 from monthly_filled m
), monthly as (
 select m.*,round((net_revenue_cents-previous_net_cents)*100.0/nullif(previous_net_cents,0),1) as net_growth_percent,
 round((gross_revenue_cents-previous_gross_cents)*100.0/nullif(previous_gross_cents,0),1) as gross_growth_percent,
 round((paid_orders-previous_orders)*100.0/nullif(previous_orders,0),1) as order_growth_percent,
 round((units-previous_units)*100.0/nullif(previous_units,0),1) as unit_growth_percent from monthly_previous m
), product_trend as (
 select sku,sum(qty) filter(where date_trunc('month',created_at at time zone 'America/New_York')::date=b.last_month) as current_units,
 sum(qty) filter(where date_trunc('month',created_at at time zone 'America/New_York')::date=(b.last_month-interval '1 month')::date) as previous_units,
 sum(qty*unit_cents) filter(where date_trunc('month',created_at at time zone 'America/New_York')::date=b.last_month) as current_net_cents,
 sum(qty*unit_cents) filter(where date_trunc('month',created_at at time zone 'America/New_York')::date=(b.last_month-interval '1 month')::date) as previous_net_cents
 from lines cross join month_bounds b group by sku
), products_with_trend as (
 select p.*,coalesce(t.current_units,0) as current_month_units,
 case when b.first_month<b.last_month then coalesce(t.previous_units,0) end as previous_month_units,
 case when b.first_month<b.last_month then round((coalesce(t.current_net_cents,0)-coalesce(t.previous_net_cents,0))*100.0/nullif(t.previous_net_cents,0),1) end as net_growth_percent
 from products p left join product_trend t using(sku) cross join month_bounds b
), order_page as (
 select * from filtered order by case when date_sort='asc' then created_at end asc,case when date_sort<>'asc' then created_at end desc,order_number desc limit 50 offset greatest(0,page_offset)
)
select jsonb_build_object(
 'version',3,
 'trend_period',(select jsonb_build_object('current_month',to_char(last_month,'YYYY-MM'),'previous_month',to_char(last_month-interval '1 month','YYYY-MM')) from month_bounds),
 'monthly',coalesce((select jsonb_agg(to_jsonb(m) order by case when date_sort='asc' then m.month end asc,case when date_sort<>'asc' then m.month end desc) from monthly m),'[]'::jsonb),
 'overview',(select jsonb_build_object('paid_orders',count(*),'units',coalesce((select sum(qty) from lines),0),
 'gross_revenue_cents',coalesce(sum(subtotal_cents),0),'net_revenue_cents',coalesce(sum(subtotal_cents-discount_cents),0),
 'product_sales_cents',coalesce(sum(subtotal_cents-discount_cents),0),'discounts_cents',coalesce(sum(discount_cents),0),
 'shipping_cents',coalesce(sum(shipping_cents),0),'tax_cents',coalesce(sum(tax_cents),0),
 'paid_total_cents',coalesce(sum(total_cents),0),'average_order_cents',coalesce(round(avg(total_cents)),0),
 'historical_orders',count(*) filter(where not breakdown_known)) from filtered),
 'products',coalesce((select jsonb_agg(to_jsonb(p) order by p.product_sales_cents desc,p.name,p.sku) from products_with_trend p),'[]'::jsonb),
 'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.code) from summaries s),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(o) order by case when date_sort='asc' then o.created_at end asc,case when date_sort<>'asc' then o.created_at end desc,o.order_number desc) from order_page o),'[]'::jsonb),
 'total_orders',(select count(*) from filtered),'page_size',50,
 'coverage',jsonb_build_object('currency','USD','timezone','America/New_York','historical_test_status','unavailable','refunds_included',false,'revenue_definition','Merchandise only; gross before recorded discounts, net after recorded discounts and before refunds. Shipping and tax excluded.')
);
$$;
revoke all on function public.hlx_sales_report(text,integer,date,date,text) from public,anon,authenticated;
grant execute on function public.hlx_sales_report(text,integer,date,date,text) to service_role;

-- Server-only report; the Edge Function validates the signed-in administrator first.
create or replace function public.hlx_discount_report(selected_code text default null, page_offset integer default 0)
returns jsonb language sql stable security invoker set search_path = '' as $$
with paid as (
 select order_number, created_at, discount_code, subtotal_cents, discount_cents,
 shipping_cents, tax_cents, total_cents, payment_state
 from public.cleffo_sessions
 where is_test = false and payment_state = 'completed' and discount_code is not null
), summaries as (
 select c.code, count(p.order_number) as paid_orders,
 coalesce(sum(p.subtotal_cents-p.discount_cents),0) as product_sales_cents,
 coalesce(sum(p.discount_cents),0) as discounts_cents,
 coalesce(sum(p.total_cents),0) as paid_total_cents
 from public.cleffo_discount_codes c left join paid p on p.discount_code=c.code
 where c.code not like 'QA\_%' escape '\'
 group by c.code
), filtered as (
 select * from paid where selected_code is null or discount_code=selected_code
), order_page as (
 select * from filtered order by created_at desc,order_number desc
 limit 50 offset greatest(0,page_offset)
)
select jsonb_build_object(
 'summary',coalesce((select jsonb_agg(to_jsonb(s) order by s.code) from summaries s),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(to_jsonb(o) order by o.created_at desc,o.order_number desc) from order_page o),'[]'::jsonb),
 'total_orders',(select count(*) from filtered),
 'page_size',50
);
$$;
revoke all on function public.hlx_discount_report(text,integer) from public,anon,authenticated;
grant execute on function public.hlx_discount_report(text,integer) to service_role;

-- Private reporting inputs. Product purchase prices are loaded separately, never in public source.
create table public.hlx_product_costs (
 sku text primary key,
 unit_cost_cents integer not null check(unit_cost_cents >= 0),
 updated_at timestamptz not null default now()
);
alter table public.hlx_product_costs enable row level security;
revoke all on public.hlx_product_costs from public,anon,authenticated;
grant all on public.hlx_product_costs to service_role;
create table public.hlx_cost_settings (
 singleton boolean primary key default true check(singleton),
 processing_rate numeric(8,6) not null check(processing_rate between 0 and 1),
 label_cents integer not null check(label_cents >= 0),
 free_shipping_threshold_cents integer not null check(free_shipping_threshold_cents >= 0),
 free_shipping_cost_cents integer not null check(free_shipping_cost_cents >= 0),
 updated_at timestamptz not null default now()
);
alter table public.hlx_cost_settings enable row level security;
revoke all on public.hlx_cost_settings from public,anon,authenticated;
grant all on public.hlx_cost_settings to service_role;
insert into public.hlx_cost_settings(singleton,processing_rate,label_cents,free_shipping_threshold_cents,free_shipping_cost_cents)
values(true,0.07,400,20000,1500);

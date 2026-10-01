-- HLX Labs permanent order history
-- Run once in Supabase Dashboard -> SQL Editor.
-- Browser clients may READ only their own orders. Order INSERT/UPDATE is reserved for the server/service role.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  order_number text not null unique,
  created_at timestamptz not null default now(),
  payment_status text not null default 'paid',
  transaction_id text not null unique,
  currency text not null default 'USD',
  total numeric(12,2) not null check (total >= 0),
  items jsonb not null default '[]'::jsonb,
  payment_provider text not null default 'TagadaPay',
  provider_payload jsonb
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

alter table public.orders enable row level security;

revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
grant all on table public.orders to service_role;

drop policy if exists "Researchers can view their own orders" on public.orders;
create policy "Researchers can view their own orders"
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.orders is 'Verified HLX Labs orders. Written only by trusted backend/webhook; customers can read only their own rows.';

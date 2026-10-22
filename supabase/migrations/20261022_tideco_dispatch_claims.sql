-- LIVE fulfillment safety: one supplier submission attempt per Tagada order.
-- Apply before deploying the updated tideco-dispatch function.
create table if not exists public.tideco_dispatch_claims (
  order_number text primary key,
  claimed_at timestamptz not null default now(),
  state text not null default 'claimed',
  response_code integer,
  last_error text,
  updated_at timestamptz not null default now()
);
alter table public.tideco_dispatch_claims enable row level security;
revoke all on public.tideco_dispatch_claims from anon, authenticated;
grant select, insert, update on public.tideco_dispatch_claims to service_role;

create or replace function public.claim_tideco_dispatch(p_order_number text)
returns boolean language plpgsql security definer
set search_path = public
as $$
begin
  if p_order_number is null or btrim(p_order_number) = '' then
    raise exception 'order number required';
  end if;
  insert into public.tideco_dispatch_claims(order_number)
  values (p_order_number)
  on conflict (order_number) do nothing;
  return found;
end;
$$;
revoke all on function public.claim_tideco_dispatch(text) from public, anon, authenticated;
grant execute on function public.claim_tideco_dispatch(text) to service_role;

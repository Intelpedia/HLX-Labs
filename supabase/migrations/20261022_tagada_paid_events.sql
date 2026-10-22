-- Required by the deployed TagadaPay order/paid webhook.
-- Run in Supabase SQL Editor.
create table if not exists public.tagada_paid_events (
  event_id text primary key,
  order_id text not null,
  event_created_at timestamptz,
  order_payload jsonb not null,
  processing_status text not null default 'pending_mapping',
  created_at timestamptz not null default now()
);
create index if not exists tagada_paid_events_order_id_idx on public.tagada_paid_events (order_id);
alter table public.tagada_paid_events enable row level security;
-- No browser/user policies: server-side service-role access only.
notify pgrst, 'reload schema';

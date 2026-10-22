-- Apply in the Supabase SQL Editor before deploying the TideCo webhook.
alter table public.orders add column if not exists shipment_status text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists shipping_carrier text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists tracking_updated_at timestamptz;
-- Keep existing RLS policies. The webhook uses the server-side service role.

-- Required for safe order upserts and order-level fulfillment idempotency.
-- Check for duplicate order_number values before applying this migration.
create unique index if not exists orders_order_number_unique_idx on public.orders (order_number);

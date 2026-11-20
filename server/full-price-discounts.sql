-- Keep the regular price when setting a temporary sale price in unit_cents.
alter table public.cleffo_catalog
  add column if not exists regular_unit_cents integer check (regular_unit_cents > 0);

update public.cleffo_catalog
set regular_unit_cents = unit_cents
where regular_unit_cents is null;

comment on column public.cleffo_catalog.regular_unit_cents is
  'Regular price in cents. A lower unit_cents is a sale price and is excluded from all discount codes.';

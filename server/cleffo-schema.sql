create table public.cleffo_catalog (
  cart_key text primary key,
  product_id integer not null,
  option_key text not null,
  name text not null,
  size text not null,
  sku text not null,
  unit_cents integer not null check (unit_cents > 0),
  image text not null,
  active boolean not null default true
);
alter table public.cleffo_catalog enable row level security;
revoke all on public.cleffo_catalog from public, anon, authenticated;
grant all on public.cleffo_catalog to service_role;
create table public.cleffo_sessions (
  order_number text primary key,
  request_id uuid not null unique,
  request_hash text not null,
  user_id uuid references auth.users(id),
  access_hash text not null,
  created_at timestamptz not null default now(),
  is_test boolean not null,
  items jsonb not null,
  customer jsonb not null,
  ship_to jsonb not null,
  subtotal_cents integer not null,
  tax_cents integer not null default 0,
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null,
  currency text not null default 'USD',
  reference text unique,
  payment_link text,
  payment_state text not null default 'creating',
  fulfillment_state text not null default 'pending',
  verified_payment jsonb,
  updated_at timestamptz not null default now()
);
alter table public.cleffo_sessions enable row level security;
revoke all on public.cleffo_sessions from public, anon, authenticated;
grant all on public.cleffo_sessions to service_role;
alter table public.orders alter column user_id drop not null;
create or replace function public.cleffo_server_config() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
  raise exception 'Server access required';
 end if;
 return (select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
 where name in ('CLEFFO_API_KEY','CLEFFO_SIGNATURE_KEY','CLEFFO_CLIENT_KEY','CLEFFO_BASE_URL','CLEFFO_TIDECO_TEST_MODE'));
end;
$$;
revoke all on function public.cleffo_server_config() from public, anon, authenticated;
grant execute on function public.cleffo_server_config() to service_role;
insert into public.cleffo_catalog(cart_key, product_id, option_key, name, size, sku, unit_cents, image, active) values
('1::0',1,'0','HLR-3','10mg','RetaGLP3-10mg',5000,'https://hlxlabs.com/assets/RETATRUTIDE.JPG',true),
('1::1',1,'1','HLR-3','12mg','RetaGLP3-12mg',6000,'https://hlxlabs.com/assets/RETATRUTIDE.JPG',true),
('1::2',1,'2','HLR-3','20mg','RetaGLP3-20mg',9000,'https://hlxlabs.com/assets/RETATRUTIDE.JPG',true),
('1::3',1,'3','HLR-3','30mg','RetaGLP3-30mg',12000,'https://hlxlabs.com/assets/RETATRUTIDE.JPG',true),
('2::0',2,'0','HLT-2','10mg','Tirz-10mg',5000,'https://hlxlabs.com/assets/TIRZEPATIDE.JPG',true),
('2::1',2,'1','HLT-2','30mg','Tirz-30mg',7000,'https://hlxlabs.com/assets/TIRZEPATIDE.JPG',true),
('2::2',2,'2','HLT-2','40mg','tirz-40mg',8000,'https://hlxlabs.com/assets/TIRZEPATIDE.JPG',true),
('2::3',2,'3','HLT-2','60mg','TIRZ-60mg-2ml',10000,'https://hlxlabs.com/assets/TIRZEPATIDE.JPG',true),
('3::default',3,'default','HLS-1','10mg','Sema-10mg',5000,'https://hlxlabs.com/assets/HLS-1.jpeg',true),
('4::default',4,'default','Cagrilintide','10mg','CAG-10MG',8000,'https://hlxlabs.com/assets/CAGRILINTIDE.jpg',true),
('5::0',5,'0','Tesamorelin','10mg','Tesa-10mg',7000,'https://hlxlabs.com/assets/Tesareal.jpg',true),
('5::1',5,'1','Tesamorelin','20mg','Tesa-20mg',9000,'https://hlxlabs.com/assets/Tesareal.jpg',true),
('5::2',5,'2','Tesamorelin','30mg','Tesa-30mg',12000,'https://hlxlabs.com/assets/Tesareal.jpg',true),
('6::default',6,'default','Ipamorelin','10mg','Ipa-10mg',5000,'https://hlxlabs.com/assets/IPAMORELIN.jpg',true),
('7::default',7,'default','CJC-1295','10mg','CJC1295-NO DAC-10mg',7000,'https://hlxlabs.com/assets/CJC-1295.jpg',true),
('8::default',8,'default','Sermorelin','10mg','Serm-10mg',8000,'https://hlxlabs.com/assets/SERMORELIN.jpg',true),
('9::default',9,'default','GHRP-2','10mg','GHRP-2-10mg',6000,'https://hlxlabs.com/assets/GHRP-2.jpg',true),
('10::default',10,'default','GHRP-6','10mg','GHRP-6-10mg',5000,'https://hlxlabs.com/assets/GHRP-6.jpg',true),
('11::default',11,'default','BPC-157','10mg','BPC157-10mg',6000,'https://hlxlabs.com/assets/BPC-157.jpg',true),
('12::default',12,'default','TB-500','10mg','TB500-10mg',7000,'https://hlxlabs.com/assets/TB-500.jpg',true),
('13::default',13,'default','GHK-Cu','50mg','GHK-Cu-50mg',5000,'https://hlxlabs.com/assets/GHK-Cu.jpg',true),
('14::default',14,'default','KPV','10mg','KPV-10MG',5000,'https://hlxlabs.com/assets/KPV.jpg',true),
('15::default',15,'default','Semax','10mg','Semax-10mg',5000,'https://hlxlabs.com/assets/SEMAX.jpg',true),
('16::default',16,'default','Selank','10mg','Selank-10mg',5000,'https://hlxlabs.com/assets/SELANK.jpg',true),
('17::default',17,'default','SNAP-8','10mg','Snap-8-10mg',5000,'https://hlxlabs.com/assets/SNAP-8.jpg',true),
('18::0',18,'0','MOTS-C','10mg','MOTSc-10mg',7000,'https://hlxlabs.com/assets/Motsreal.jpg',true),
('18::1',18,'1','MOTS-C','40mg','MOTSc-40mg',12000,'https://hlxlabs.com/assets/Motsreal.jpg',true),
('19::default',19,'default','Epithalon','10mg','Epi-10mg',5000,'https://hlxlabs.com/assets/EPITHALON.png',true),
('20::0',20,'0','NAD+','500mg','NAD-500mg',7000,'https://hlxlabs.com/assets/NAD+.png',true),
('21::default',21,'default','Thymosin Alpha-1','10mg','TA-1-10mg',6000,'https://hlxlabs.com/assets/THYMOSIN ALPHA-1.png',true),
('22::default',22,'default','PT-141','10mg','PT141-10mg',5000,'https://hlxlabs.com/assets/PT-141.jpg',true),
('23::default',23,'default','Kisspeptin','10mg','Kiss-10mg',5000,'https://hlxlabs.com/assets/KISSPEPTIN.jpg',true),
('24::default',24,'default','Melanotan I','10mg','MT-1 10mg',5500,'https://hlxlabs.com/assets/MELANOTAN.jpg',true),
('25::default',25,'default','Melanotan II','10mg','MT-2 10mg',5500,'https://hlxlabs.com/assets/MELANOTAN.jpg',true),
('26::default',26,'default','DSIP','10mg','DSIP-10mg',6000,'https://hlxlabs.com/assets/DSIP.png',true),
('27::default',27,'default','VIP','10mg','VIP-10mg',6000,'https://hlxlabs.com/assets/VIP.jpg',true),
('29::default',29,'default','GLOW (GHK-Cu / TB-500 / BPC-157)','50/10/10mg','GLOW-50-10-10mg',8000,'https://hlxlabs.com/assets/GLOW.jpg',true),
('30::default',30,'default','Wolverine Stack (BPC-157 / TB-500)','10/10mg','Wolv-10-10mg',7500,'https://hlxlabs.com/assets/Wolverine.jpg',true),
('31::0',31,'0','CJC-1295-IPA','5/5mg','CJP-IPA-5-5mg',7000,'https://hlxlabs.com/assets/CJC-1295-IPA.jpg',true),
('31::1',31,'1','CJC-1295-IPA','10/10mg','CJC-IPA-10-10mg',10000,'https://hlxlabs.com/assets/CJC-1295-IPA.jpg',true),
('32::default',32,'default','KLOW-Cu (GHK-Cu / KPV / TB-500 / BPC-157)','50/10/10/10mg','KLOW-50-10-10-10',10000,'https://hlxlabs.com/assets/KLOW.jpg',true),
('33::0',33,'0','SS-31','10mg','SS-31-10mg',6000,'https://hlxlabs.com/assets/SS-31.jpg',true),
('33::1',33,'1','SS-31','30mg','SS-31-30mg',12000,'https://hlxlabs.com/assets/SS-31.jpg',true),
('34::default',34,'default','IGF-1 LR3','1mg','IGF-1-LR3-1mg',8500,'https://hlxlabs.com/assets/IGF-1 LR3.jpg',true);

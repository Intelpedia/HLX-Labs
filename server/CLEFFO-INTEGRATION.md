# Cleffo integration

The deployed `cleffo-payments` Edge Function uses Cleffo development credentials stored encrypted in Supabase Vault. No processor secrets belong in this repository or browser JavaScript. The service-role-only `cleffo_server_config` RPC retrieves the four Cleffo settings from Vault.

## Current state

- Test checkout page: `/cleffo-checkout.html`. Add products to the normal cart, then open this page.
- Guest return page: `/cleffo-return.html`. It reads a checkout-specific token from the original browser and requests verified payment status. The token is not placed in the URL.
- The cart now routes to Cleffo test checkout. The TagadaPay SDK and payment creation code have been removed. The deployed `tagada-webhook` endpoint returns HTTP 410. Legacy processor secrets are unused and may still be stored in the project until removed through Supabase secret management.
- All 44 size variants are mapped to the supplied TideCo SKU list in `cleffo_catalog`.
- Shipping is $15 for product subtotals below $200 and free starting at $200. Cleffo receives shipping as a separate payment line, excluded from supplier SKU lines. A live sales-tax service connection is still required.
- Test payments use `test_completed` and are not written as paid live orders.

## Endpoints

Base: `https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/cleffo-payments`

- `POST /checkout`: customer and shipping information, product IDs/option keys, quantities, an idempotency UUID, and a random access token. Prices and supplier SKUs come from the server catalog.
- `POST /webhook`: Cleffo webhook configured automatically as `metadata.notify_url` when creating a payment link. Checks `X-Cleffo-Timestamp` and HMAC-SHA256 `X-Cleffo-Signature` using the API key. Also independently retrieves Cleffo payment status and checks order ID, reference, amount, currency, and test mode.
- `POST /status`: requires order number and original access token. Returns payment and fulfillment state without shipping/contact information.
- `GET /health`: reports configured environment and supplier configuration presence without exposing secrets.

## Verification completed

Cleffo created a development payment link successfully. Repeating the same request returned the same payment session. Reusing a request ID with a changed cart was rejected. Unsigned webhooks and invalid status tokens were rejected. A signed supplier connectivity probe returned HTTP 202 with `paid:false`. Unit checks cover mismatched payment totals, test-payment state, test/live supplier separation, duplicate fulfillment, and webhook HMAC.

## Remaining verification and activation

1. Complete a test hosted payment using payment details provided by Cleffo. Verify Cleffo calls the webhook and the return page confirms the test state.
2. Confirm the TideCo connection is in supplier test mode before enabling paid test dispatch. Unconfirmed supplier mode uses an unpaid held order. The current environment does not report `HLX_TEST_MODE=true`. Completed test payments are sent to TideCo with `paid:false` and recorded as `test_held`, so they can be inspected without authorizing shipment.
3. Reconcile the held probe with TideCo using its order ID if needed. It must stay unpaid.
4. Obtain Cleffo production credentials and confirm shipping/tax rules. Live checkout is currently guarded because only test pricing is configured.
5. Activate real payments after validating the full live configuration. The cart already routes to Cleffo test checkout.

## Catalog maintenance

`server/cleffo-catalog.json` records the server-side price/SKU snapshot used for this integration. Update `public.cleffo_catalog` when changing storefront sizes, prices, or availability. Match `cart_key` to product ID and option key. Never accept a browser-submitted sale price or supplier SKU.

## Local regression checks

Node.js 24 or later:

```sh
node --test server/tests/cleffo-payments.test.cjs
```

`server/cleffo-schema.sql` records the schema and initial catalog without credentials. The schema was applied through Supabase migration history. Do not rerun this bootstrap on a project that already has these tables.

## Retry handling

Reusing a checkout request first refreshes provider payment status. Closed sessions return `CHECKOUT_CLOSED`, and the browser makes one new request with a new idempotency ID and access token. Completed sessions return to their existing status page. Duplicate supplier deliveries remain blocked.

## Supplier test approval

The user confirmed TideCo has been notified that incoming orders are tests and will not be fulfilled. `CLEFFO_TIDECO_TEST_MODE=true` is stored in Vault. Completed Cleffo test payments are sent with `paid:true` and note `TEST — DO NOT FULFILL`, and recorded as `test_accepted`. A previously held order is updated using its original supplier order ID. This does not change Cleffo from development mode.

## Production checkout activation

The merchant requested removing the live guard and configuring tax in the processor panel. Checkout uses the configured production credentials. Shipping is $15 below $200, free at $200 or more. The API sends base tax 0; processor-panel automatic tax behavior must be verified with Cleffo. The verified status API may report a higher tax-inclusive amount, which is saved as the final total and tax difference. Cleffo test and outage labels have been removed. TideCo remains under the supplier hold reported by the merchant.


### Discount codes

The checkout Apply button uses the server `/quote` endpoint. Checkout validates the code again against the private `cleffo_discount_codes` table. Manage codes in Supabase: uppercase `code`, `discount_type` of `percent` or `fixed`, and `amount` in percent or USD respectively. Optional `expires_at` and `minimum_subtotal_cents` restrict redemption; set `active=false` to disable. No customer codes are seeded.

Discounts apply only to merchandise, capped at its subtotal. The $200 free-shipping qualification uses the original merchandise subtotal. Exact cent allocation may split a SKU into two price rows while preserving total quantity. Cleffo receives the reduced product prices, matching reduced totals, and `metadata.discount_code`; it does not need a native coupon feature. The session records the original subtotal, code, and discount. Payment verification subtracts the discount before comparing the amount paid; supplier lines use discounted unit prices. Tax, if configured at the processor, is additional. Zero-total orders are not supported by this payment-link flow.

### Private discount reports

`discount-report.html` uses the separate `discount-report` Edge Function. Every request verifies the Supabase access token using `auth.getUser` and requires a confirmed account with server-managed `app_metadata.hlx_admin === true`. Customer-editable metadata is never trusted. Grant this role only to an explicitly confirmed business administrator using the Supabase Admin API; ordinary customers cannot access reports. Account shows a report link for administrators.

Apply `server/discount-report.sql` to install the service-role-only reporting RPC. It counts live `completed` payments with discount codes, excludes tests/pending checkouts, aggregates all-time metrics by code, and paginates paid orders in groups of 50. No customer contact or address data is returned. Product sales exclude shipping and tax; paid totals include both. These payment figures do not net later refunds. Dates display in the viewer's local time. Responses are not cached. The page supports code filtering and manual refresh.

### Sales reporting extensions

The same private page now uses `hlx_sales_report` (`server/sales-report.sql`). It includes all live completed USD Cleffo payments, plus legacy `orders` recorded paid that have no corresponding Cleffo session. Matching session IDs are excluded from the legacy branch even for test/pending sessions to avoid duplicates or counting tests. Historical test status and historical discount/shipping/tax breakdowns are unavailable and explicitly labeled; do not infer them. Later refunds and costs are not modeled.

Date boundaries are inclusive New York calendar days. Code/date filters affect overview, products, and order lists; code summaries compare all codes within the date range. Product rows group by SKU, sum actual discounted unit-price × quantity, and count distinct orders even when cent allocation splits an item. Catalog joins include unsold variants and retain sold retired SKUs. Current prices come from the catalog, actual sale price ranges and weighted averages from saved order lines.

`discount-report.js` handles authentication, filters, and transport. `sales-report-ui.js` contains the section registry and rendering. The versioned JSON response separates overview, products, summary, orders, and coverage so additional reporting sections can be added without changing payment processing. Keep the same server-side administrator guard for every future section.

Regression: `node --test server/tests/discount-report.test.cjs server/tests/cleffo-payments.test.cjs`. Run `server/tests/sales-report.sql` as a transaction against the database to verify aggregation, date/code filters, split prices, deduplication, catalog coverage, and access grants; it rolls all fixtures back.

Monthly reporting update: Tagada/TagadaPay orders are excluded from every sales-report section (original order records remain untouched). The RPC now accepts `date_sort` (`asc` or `desc`), applying it before order pagination and to monthly rows. `monthly` aggregates the same filtered paid-order set by New York calendar month, showing only months with sales. Narrow date ranges produce partial-month totals. The UI date-order selector applies to both tables; per-code summaries remain code-sorted and products remain revenue-sorted. SQL regression fixtures verify Tagada exclusion, monthly totals, and both sort directions.

Revenue and sales trends: overview/monthly `gross_revenue_cents` is recorded merchandise subtotal before discounts; `net_revenue_cents` subtracts recorded discounts. Both exclude shipping and tax. Refunds/returns are not yet captured, so the UI labels net revenue as before refunds; neither number is profit or processor settlement proceeds. Do not subtract estimated fees or infer missing legacy adjustments.

Monthly calendar rows include zero-sales months between the selected boundaries (or first/last recorded sale if unbounded). Growth compares adjacent displayed calendar months; zero/missing baselines yield null, shown as a dash. The current calendar month and filtered partial months are labeled. Comparisons are raw filtered-period totals, not normalized daily rates. Product trend columns compare the final selected month against its preceding month within the same filter, with distinct unit counts and net revenue percentage changes. The chart and table share the same monthly results and preserve private access.

### Private cost and profit estimates

Apply `server/cost-schema.sql` once before the cost-aware report definition. `hlx_product_costs` stores purchase cost cents by exact supplier SKU; `hlx_cost_settings` stores the processing percentage, label fee per vial, and inclusive original-subtotal shipping threshold/expense. Both tables are RLS-enabled, with all public/customer privileges revoked. Load supplier CSV data into this table privately using only the `Your price` column; never commit wholesale amounts or supplier sheets into the public repository. Blank prices remain absent, not zero. Suggested retail and label-ready flags do not affect purchase costs or selling prices.

The report keeps merchandise net revenue separate from estimated profit. Processing fees are rounded per order on the entire amount charged (including tax/shipping). Labels use total vial quantity, including split discount-price rows. The specified free-shipping expense applies when the original merchandise subtotal meets the threshold, even after discounts. No below-threshold shipping expense has been supplied, and customer shipping charges are not included in merchandise revenue. Profit therefore means net merchandise revenue less the specific supplied costs, before refunds/other overhead; it is not settlement or accounting net income.

Current product costs/settings are applied to the selected paid-order history; no historical cost snapshots are implied. Monthly and per-order cost/profit figures use the same rules. Product direct margin deducts purchase and label costs only, before order-level fees/shipping (avoids arbitrary allocation). Unknown sold SKU costs make the affected order/month/overall profit unavailable, with a missing-SKU warning. Zero-sales SKUs show zero direct margin and their current purchase price where known.

Regression: run `server/tests/profit-report.sql` transactionally; it verifies cent rounding, tax/shipping fee basis, multiple/split vial rows, pre-discount shipping eligibility including exactly the threshold, monthly totals, direct margins, private cost-table grants, and missing-cost behavior. All fixtures roll back.

### Mailing list export

`server/mailing-list.sql` installs the service-role-only `hlx_mailing_list` RPC. The existing `discount-report` Edge Function validates the current confirmed administrator before serving `view=contacts` (100-row pages) or `view=contacts&download=csv` (all unique rows). Anonymous and ordinary authenticated roles cannot call the RPC directly. Responses and downloads use no-store. No customer email values are stored in source or static files.

Sources: non-deleted Supabase accounts (including unconfirmed accounts), live completed Cleffo purchases, and historical paid orders with no matching Cleffo session. This contact list intentionally includes historical Tagada buyers independently of the sales-report exclusion. Test sessions, linked test-order duplicates, abandoned checkouts, null/blank/malformed addresses are excluded. Trimmed lowercase email is the deduplication key; aliases and plus tags are not rewritten. Purchase count uses distinct order numbers. CSV includes email, account/purchase source flags, account confirmation, paid-order count, first/last seen, and marketing_consent=not_recorded. Neither purchasing nor registration is treated as marketing opt-in; no messages or third-party mailing-platform uploads occur.

`mailing-list.js` loads contacts only on request and downloads the CSV with the administrator's access token, never a token in the URL. The list ignores sales date/code filters, clears on sign-out/access-reset, and neutralizes CSV spreadsheet formula prefixes. Run `server/tests/mailing-list.sql` transactionally to verify normalization, account/purchase deduplication, historical sources, test/pending exclusion, complete exports, and restricted grants. Fixtures roll back.

Discount codes apply only to full-price variants. Run `server/full-price-discounts.sql` when upgrading an existing catalog. Set `regular_unit_cents` to the normal price when creating a variant or changing its regular price. To run a sale, keep the regular price and lower `unit_cents`. A variant without a separate regular price is treated as full price.

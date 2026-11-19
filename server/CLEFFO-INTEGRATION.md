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

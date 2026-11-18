# Cleffo integration

The deployed `cleffo-payments` Edge Function uses Cleffo development credentials stored encrypted in Supabase Vault. No processor secrets belong in this repository or browser JavaScript. The service-role-only `cleffo_server_config` RPC retrieves the four Cleffo settings from Vault.

## Current state

- Test checkout page: `/cleffo-checkout.html`. Add products to the normal cart, then open this page.
- Guest return page: `/cleffo-return.html`. It reads a checkout-specific token from the original browser and requests verified payment status. The token is not placed in the URL.
- The cart now routes to Cleffo test checkout. The TagadaPay SDK and payment creation code have been removed. The deployed `tagada-webhook` endpoint returns HTTP 410. Legacy processor secrets are unused and may still be stored in the project until removed through Supabase secret management.
- All 44 size variants are mapped to the supplied TideCo SKU list in `cleffo_catalog`.
- Test totals currently use product subtotal with zero tax and zero shipping. Live tax and shipping policy must be implemented before activating real payments.
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

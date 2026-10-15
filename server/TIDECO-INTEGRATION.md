# HLX Labs – TagadaPay → TideCo fulfillment (preparation)

Status: **NOT LIVE**. No automatic fulfillment or TagadaPay webhook is configured by these files.

## Order of operations

1. Obtain TagadaPay's **official webhook event schema, signature-verification instructions and checkout shipping-field mapping**. Do not trust browser-provided `verified:true` or `payment_status` as proof of payment.
2. Implement a TagadaPay webhook that authenticates the webhook, confirms final successful payment, maps product SKUs, records shipping information, and upserts a paid order in Supabase using service-role credentials. Deduplicate by payment transaction ID and order number.
3. Configure TideCo's brand key and secret API key in **Supabase Edge Function secrets** (never GitHub, HTML or browser JavaScript).
4. Set `HLX_FULFILLMENT_SECRET` to a separate random server-to-server secret. Configure `TIDECO_DISPATCH_ENABLED=false` initially.
5. Deploy `supabase/functions/tideco-dispatch/index.ts` as a server-only endpoint. It looks up an existing paid order in Supabase and requires a server secret, complete shipping details, and valid supplier SKUs. It refuses dispatch while disabled.
6. In TideCo **test mode**, set `TIDECO_DISPATCH_ENABLED=true` only after verifying the checkout webhook and testing order persistence. Invoke dispatch **from trusted backend only**, passing JSON `{"orderNumber":"HLX-..."}` with header `x-hlx-fulfillment-secret`. Verify HTTP 202 acceptance and supplier SKU mappings.
7. After supplier confirmation, explicitly approve live fulfillment and set up tracking polling or signed callbacks (HMAC-SHA256 of raw body with TideCo callback secret).

## Important safeguards

- The current `server/supabase-orders.sql` stores `provider_payload` but has no dedicated shipping address fields. The future trusted webhook must populate `provider_payload.customer`, `provider_payload.shipTo`, and `provider_payload.paidAt`, or migrate to separate secure fields. Never expose full addresses through client-facing order history.
- Existing `app.js` browser `HLXOrders.completeOrder` is **not** a verified payment webhook and must never trigger supplier dispatch.
- TideCo documents order ID deduplication, but keep local dispatch status, attempt count, and last error in a future fulfillment table for operational reliability.
- Do not expose the TideCo API key, TagadaPay webhook signing secret, Supabase service-role key, or internal dispatch secret.
- TideCo's documented order endpoint: `POST https://api.tidecotech.com/intake/order/<brand key>`. Tracking is available via polling or a signed callback.

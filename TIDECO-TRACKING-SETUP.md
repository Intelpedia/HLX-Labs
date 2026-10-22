# TideCo tracking callback setup

**Important:** This repository contains the webhook source, but it is NOT deployed by Porkbun/GitHub Connect. Deploy it separately to Supabase.

## 1. Database
In Supabase Dashboard > SQL Editor, run `supabase/migrations/20261022_tideco_tracking.sql`. Confirm the existing `orders` table has a unique `order_number` and that TideCo is given the same order number when fulfillment is requested.

## 2. Deploy function
In Supabase Dashboard > Edge Functions, create/deploy a function named `tideco-tracking` using `supabase/functions/tideco-tracking/index.ts` (or deploy with the Supabase CLI). Disable **Verify JWT** for this function because TideCo cannot supply a Supabase user JWT. Authentication instead uses the webhook shared secret.

With the CLI:
```sh
supabase login
supabase link --project-ref ttmwcwuzrqemsqfwkkyw
supabase functions deploy tideco-tracking --no-verify-jwt
```

## 3. Set secret
Generate a strong random secret (at least 32 random bytes) and set it in Supabase Edge Function secrets as `TIDECO_TRACKING_SECRET`. Do not put it in GitHub, website JavaScript, or chat. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the function environment; confirm they are available.

## 4. Send TideCo the actual endpoint
`https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/tideco-tracking`

Ask TideCo to POST JSON with `Authorization: Bearer <your shared secret>` or `x-webhook-secret: <your shared secret>`. Example:
```json
{
  "order_number": "EXACT-HLX-ORDER-NUMBER",
  "tracking_number": "TEST-TRACKING-123",
  "carrier": "UPS",
  "shipment_status": "shipped",
  "tracking_url": "https://www.ups.com/"
}
```
Accepted statuses: pending, processing, shipped, in_transit, out_for_delivery, delivered, exception, returned, cancelled. The endpoint requires the exact order number and does not create orders.

**Confirm TideCo's real webhook payload and authentication options before enabling production.** If their format differs, adapt the handler. Do not give TideCo the earlier proposed `https://hlxlabs.com/api/webhooks/tideco-tracking` URL: Porkbun static hosting does not serve it.

## 5. Test
Use a real existing TEST order number in Supabase and a test tracking number. Confirm HTTP 200 and updated columns in `orders`. A 401 means secret mismatch; 400 means payload fields do not match; 404 means order number does not exist; 500 means database setup/permissions need checking. Do not test with a customer's production order.

## 6. Customer order history
The account page reads the `orders` table through Supabase RLS. The frontend can display shipment status and tracking once deployed. Never use the service-role key in frontend JavaScript.

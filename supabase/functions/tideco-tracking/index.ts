// TideCo -> HLX Labs shipment tracking callback.
// Deploy with JWT verification disabled; TideCo authenticates using the shared secret.
// Never expose the secret in browser code.
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
const asText = (v: unknown) => typeof v === "string" ? v.trim() : "";
const pick = (obj: Record<string, unknown>, ...keys: string[]) =>
  keys.map(k => asText(obj[k])).find(Boolean) || "";
const validStatus = new Set(["pending", "processing", "shipped", "in_transit", "out_for_delivery", "delivered", "exception", "returned", "cancelled"]);

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expected = Deno.env.get("TIDECO_TRACKING_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expected || !url || !serviceKey) return json({ error: "Webhook not configured" }, 503);

  // Constant-time digest comparison avoids direct string timing leaks.
  const supplied = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-webhook-secret") || "";
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(expected), digest(supplied)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  if (!supplied || difference !== 0) return json({ error: "Unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 65536) return json({ error: "Payload too large" }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw Error("Expected object");
    payload = parsed as Record<string, unknown>;
  } catch { return json({ error: "Invalid JSON object" }, 400); }

  // Only accept explicit identifiers; never infer which customer's order to update.
  const orderNumber = pick(payload, "order_number", "orderNumber", "merchant_order_id", "merchantOrderId");
  const trackingNumber = pick(payload, "tracking_number", "trackingNumber");
  const carrier = pick(payload, "carrier", "shipping_carrier", "shippingCarrier");
  const status = pick(payload, "shipment_status", "shipmentStatus", "status").toLowerCase().replace(/[ -]/g, "_");
  const trackingUrl = pick(payload, "tracking_url", "trackingUrl");
  if (!orderNumber || !trackingNumber || !validStatus.has(status)) {
    return json({ error: "Required: order_number, tracking_number, valid shipment_status" }, 400);
  }
  if (trackingUrl && (!/^https:\/\//i.test(trackingUrl) || trackingUrl.length > 2048))
    return json({ error: "Invalid tracking URL" }, 400);
  if ([orderNumber, trackingNumber, carrier].some(x => x.length > 200))
    return json({ error: "Field too long" }, 400);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: orders, error: lookupError } = await supabase.from("orders").select("id").eq("order_number", orderNumber).limit(2);
  if (lookupError) { console.error("Order lookup failed", lookupError.code); return json({ error: "Database lookup failed" }, 500); }
  if (!orders?.length) return json({ error: "Order not found" }, 404);
  if (orders.length !== 1) return json({ error: "Ambiguous order number" }, 409);

  const { error } = await supabase.from("orders").update({
    shipment_status: status,
    tracking_number: trackingNumber,
    shipping_carrier: carrier || null,
    tracking_url: trackingUrl || null,
    tracking_updated_at: new Date().toISOString()
  }).eq("id", orders[0].id);
  if (error) { console.error("Tracking update failed", error.code); return json({ error: "Database update failed" }, 500); }
  return json({ ok: true });
});

// TideCo -> HLX Labs shipment tracking callback.
// Deploy with JWT verification disabled; TideCo authenticates using X-Tideco-Signature HMAC-SHA256.
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

  // Verify HMAC of the EXACT raw request body before parsing JSON.
  const raw = await request.text();
  if (raw.length > 65536) return json({ error: "Payload too large" }, 413);
  const signature = request.headers.get("x-tideco-signature") || "";
  const match = /^sha256=([a-f0-9]{64})$/i.exec(signature.trim());
  if (!match) return json({ error: "Unauthorized" }, 401);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(expected), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const supplied = Uint8Array.from(match[1].match(/.{2}/g)!, h => parseInt(h, 16));
  let difference = 0;
  for (let i = 0; i < mac.length; i++) difference |= mac[i] ^ supplied[i];
  if (difference !== 0) return json({ error: "Unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try {
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

async function verifySignature(raw: string, supplied: string | null, secret: string) {
  if (!supplied || !/^sha256=[a-f0-9]{64}$/i.test(supplied)) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(raw)
  ));
  const receivedHex = supplied.slice(7);
  const received = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    received[i] = parseInt(receivedHex.slice(i * 2, i * 2 + 2), 16);
  }
  return constantTimeEqual(mac, received);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("WEBHOOK_SECRET") || Deno.env.get("TAGADA_WEBHOOK_SECRET");
  const accessToken = Deno.env.get("TAGADA_ACCESS_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !accessToken || !supabaseUrl || !serviceKey) {
    console.error("Required webhook configuration missing");
    return json({ error: "Configuration incomplete" }, 503);
  }

  try {
    const raw = await req.text();
    if (raw.length > 131072) return json({ error: "Payload too large" }, 413);
    if (!await verifySignature(raw, req.headers.get("x-tagadapay-signature"), secret)) {
      return json({ error: "Bad signature" }, 401);
    }

    let event: { id?: string; type?: string; createdAt?: string; data?: { orderId?: string } };
    try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (typeof event?.id !== "string" || !event.id ||
        typeof event.type !== "string") return json({ error: "Invalid event" }, 400);
    if (event.type !== "order/paid") return json({ received: true, ignored: true });

    const orderId = event.data?.orderId;
    if (typeof orderId !== "string" || !orderId) return json({ error: "Missing order ID" }, 400);

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // An existing event is already recorded. Never change excluded or processed
    // events, and never re-dispatch on duplicate delivery.
    const { data: existing, error: lookupError } = await db
      .from("tagada_paid_events")
      .select("event_id,order_id,processing_status")
      .eq("event_id", event.id).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      if (existing.order_id !== orderId) {
        console.error("Event ID reused with a different order ID");
        return json({ error: "Event/order mismatch" }, 409);
      }
      return json({ received: true, duplicate: true, status: existing.processing_status });
    }

    // Never use the webhook payload alone as evidence of payment.
    const response = await fetch(
      `https://api.tagada.io/api/public/v1/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000) }
    );
    if (!response.ok) {
      console.error("Tagada order lookup failed:", response.status);
      return json({ error: "Order lookup failed" }, 503);
    }
    const result = await response.json();
    const order = result?.order;
    if (!order || typeof order !== "object" || Array.isArray(order)) {
      return json({ error: "Order missing from API response" }, 503);
    }

    // Store verified-signature event and provider order for later reconciliation.
    // Do not assume the provider's payment-status field without its API schema.
    // Do not dispatch to TideCo here: supplier SKU mapping is not yet validated.
    const { error: saveError } = await db.from("tagada_paid_events").upsert({
      event_id: event.id,
      order_id: orderId,
      event_created_at: event.createdAt || null,
      order_payload: order,
      processing_status: "pending_mapping",
    }, { onConflict: "event_id", ignoreDuplicates: true });
    if (saveError) throw saveError;

    return json({ received: true, saved: true, fulfillment: "disabled_pending_mapping" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});

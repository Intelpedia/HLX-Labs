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

    // Existing excluded test events were returned above and are never dispatched.
    // Only the Tagada API's independently retrieved paid state authorizes fulfillment.
    if (order.status !== "paid" || !order.paidAt || order.draft === true ||
        order.refundedAt || order.cancelledAt) {
      return json({ received: true, ignored: true, reason: "not_eligible_for_fulfillment" });
    }
    const orderNumber = String(order.orderNumber || order.id || orderId);
    if (!orderNumber || String(order.id) !== orderId) {
      return json({ error: "Provider order ID mismatch" }, 409);
    }
    const payments = Array.isArray(order.payments) ? order.payments : [];
    const paidPayment = payments.find((p: Record<string, unknown>) =>
      p && typeof p.id === "string" && (p.status === "paid" || p.status === "succeeded" || p.status === "success"));
    if (!paidPayment) return json({ error: "Verified paid transaction unavailable" }, 409);

    const address = order.shippingAddress;
    const customerInfo = order.customer;
    if (!address || typeof address !== "object" || !customerInfo ||
        typeof customerInfo !== "object") {
      return json({ error: "Customer or shipping address unavailable" }, 409);
    }
    const customerName = [address.firstName || customerInfo.firstName, address.lastName || customerInfo.lastName]
      .filter((v: unknown) => typeof v === "string" && v.trim()).join(" ").trim();
    const shipName = [address.firstName, address.lastName]
      .filter((v: unknown) => typeof v === "string" && v.trim()).join(" ").trim() || customerName;
    const shipTo = {
      name: shipName,
      line1: address.address1,
      line2: address.address2 || "",
      city: address.city,
      state: address.state,
      zip: String(address.postal || ""),
      country: address.country,
    };
    const customer = { name: customerName, email: customerInfo.email || address.email || "", phone: "" };
    if (!customer.name || !customer.email || !shipTo.name || !shipTo.line1 || !shipTo.zip ||
        !shipTo.city || !shipTo.state || shipTo.country !== "US") {
      return json({ error: "Incomplete shipping information" }, 409);
    }
    if (!Array.isArray(order.items) || !order.items.length)
      return json({ error: "No order items" }, 409);
    const items = order.items.map((item: Record<string, unknown>) => ({
      name: typeof item.productName === "string" ? item.productName : String(item.sku || ""),
      sku: item.sku,
      qty: Number(item.quantity),
      price: Number(item.amount) / 100 / Number(item.quantity),
    }));
    if (items.some((item: { sku: unknown; qty: number; price: number }) =>
      typeof item.sku !== "string" || !item.sku.trim() ||
      !Number.isInteger(item.qty) || item.qty < 1 ||
      !Number.isFinite(item.price) || item.price < 0))
      return json({ error: "Invalid supplier SKU, quantity, or price" }, 409);

    // Persist the event first, so retries can be reconciled without repeating shipments.
    const { error: saveError } = await db.from("tagada_paid_events").upsert({
      event_id: event.id, order_id: orderId,
      event_created_at: event.createdAt || null,
      order_payload: order, processing_status: "verified_paid",
    }, { onConflict: "event_id", ignoreDuplicates: true });
    if (saveError) throw saveError;

    const orderRecord = {
      order_number: orderNumber,
      payment_status: "paid",
      transaction_id: String(paidPayment.id),
      currency: String(order.currency || "USD"),
      total: Number(order.paidAmount || 0) / 100,
      items,
      payment_provider: "tagada",
      provider_payload: { customer, shipTo, paidAt: order.paidAt, providerOrderId: orderId },
    };
    const { data: prior, error: priorError } = await db.from("orders")
      .select("id,transaction_id,payment_status").eq("order_number", orderNumber).maybeSingle();
    if (priorError) throw priorError;
    if (prior && prior.transaction_id && prior.transaction_id !== orderRecord.transaction_id)
      return json({ error: "Conflicting transaction for order" }, 409);
    const write = prior
      ? await db.from("orders").update(orderRecord).eq("id", prior.id)
      : await db.from("orders").insert(orderRecord);
    if (write.error) throw write.error;

    // Do not dispatch unless the explicitly configured supplier allowlist contains every SKU.\n    const allowed = new Set((Deno.env.get("TIDECO_ALLOWED_SKUS") || "").split(",").map(v => v.trim()).filter(Boolean));\n    if (!allowed.size || items.some((item: {sku: string}) => !allowed.has(item.sku))) {\n      await db.from("tagada_paid_events").update({processing_status:"sku_review"}).eq("event_id",event.id);\n      return json({received:true,orderSaved:true,fulfillment:"sku_review"},503);\n    }\n    const dispatchSecret = Deno.env.get("HLX_FULFILLMENT_SECRET");
    if (!dispatchSecret) return json({ error: "Fulfillment secret missing; order saved" }, 503);
    const dispatch = await fetch(supabaseUrl + "/functions/v1/tideco-dispatch", {
      method: "POST",
      headers: { "content-type": "application/json", "x-hlx-fulfillment-secret": dispatchSecret },
      body: JSON.stringify({ orderNumber }),
      signal: AbortSignal.timeout(20000),
    });
    const status = dispatch.status;
    await db.from("tagada_paid_events").update({
      processing_status: status === 200 ? "dispatched" : "dispatch_review",
    }).eq("event_id", event.id);
    if (!dispatch.ok) {
      console.error("Dispatch not completed; check tideco_dispatch_claims", status);
      return json({ received: true, orderSaved: true, dispatchStatus: status }, 503);
    }
    return json({ received: true, orderSaved: true, dispatched: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});

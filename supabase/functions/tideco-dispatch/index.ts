// HLX Labs -> TideCo. Server-to-server only; never call from browser.
// Deploy with JWT verification disabled only if a separate trusted server secret is configured.
// This function intentionally refuses orders without a matching verified payment record.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("HLX_FULFILLMENT_SECRET");
  if (!secret || req.headers.get("x-hlx-fulfillment-secret") !== secret)
    return new Response("Unauthorized", { status: 401 });
  const apiKey = Deno.env.get("TIDECO_API_KEY");
  const brandKey = Deno.env.get("TIDECO_BRAND_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !brandKey || !supabaseUrl || !serviceKey)
    return new Response("Server configuration incomplete", { status: 503 });
  let payload: { orderNumber?: string };
  try { payload = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (typeof payload.orderNumber !== "string" || !payload.orderNumber)
    return new Response("orderNumber required", { status: 400 });

  const db = createClient(supabaseUrl, serviceKey);
  const { data: order, error } = await db.from("orders")
    .select("order_number,payment_status,transaction_id,items,provider_payload")
    .eq("order_number", payload.orderNumber).single();
  if (error || !order) return new Response("Order not found", { status: 404 });
  // This is not a substitute for the payment webhook verifying TagadaPay's signature.
  if (order.payment_status !== "paid" || !order.transaction_id)
    return new Response("Verified paid order required", { status: 409 });
  const provider = order.provider_payload || {};
  // Shipping data must be populated by a trusted checkout/payment webhook.
  const customer = provider.customer;
  const shipTo = provider.shipTo;
  if (!customer?.name || !shipTo?.line1 || !shipTo?.zip)
    return new Response("Shipping details not yet available from verified checkout", { status: 409 });
  const lines = (Array.isArray(order.items) ? order.items : []).map((item: Record<string, unknown>) => ({
    sku: item.sku, qty: Number(item.qty), price: Number(item.price)
  }));
  if (!lines.length || lines.some((l) => typeof l.sku !== "string" || !l.sku || !Number.isInteger(l.qty) || l.qty < 1))
    return new Response("Verified order has missing or invalid supplier SKUs", { status: 409 });

  // Safe by default: deployment alone cannot dispatch live orders.
  if (Deno.env.get("TIDECO_DISPATCH_ENABLED") !== "true")
    return Response.json({ ok: false, status: "disabled", message: "TideCo dispatch is disabled until test-mode approval" }, { status: 409 });
  const response = await fetch(`https://api.tidecotech.com/intake/order/${encodeURIComponent(brandKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      orderId: order.order_number, paid: true, paidAt: provider.paidAt || null,
      customer, shipTo, lines, note: provider.note || ""
    })
  });
  const body = await response.text();
  // Do not return supplier response body to untrusted callers.
  if (response.status !== 202) {
    console.error("TideCo dispatch rejected:", response.status, body.slice(0, 1000));
    return Response.json({ ok: false, status: response.status }, { status: 502 });
  }
  return Response.json({ ok: true, status: "accepted", orderNumber: order.order_number });
});

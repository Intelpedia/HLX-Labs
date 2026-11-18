import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const site = "https://hlxlabs.com";
const project = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(project, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const encoder = new TextEncoder();
const cors = {
  "Access-Control-Allow-Origin": site,
  "Access-Control-Allow-Headers": "content-type,authorization,apikey",
  "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
  "Cache-Control": "no-store",
};
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors });
}
async function hash(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {
    name: "HMAC", hash: "SHA-256",
  }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
async function config() {
  const { data, error } = await admin.rpc("cleffo_server_config");
  if (error || !data?.CLEFFO_API_KEY || !data?.CLEFFO_SIGNATURE_KEY || !data?.CLEFFO_CLIENT_KEY) {
    throw new Error("Payment configuration unavailable");
  }
  if (!["https://apis-dev.cleffo.com", "https://apis.cleffo.com"].includes(data.CLEFFO_BASE_URL)) {
    throw new Error("Invalid payment environment");
  }
  return data;
}
async function session(orderNumber: string) {
  const { data, error } = await admin.from("cleffo_sessions").select("*")
    .eq("order_number", orderNumber).maybeSingle();
  if (error) throw new Error("Order lookup unavailable");
  return data;
}
async function update(orderNumber: string, values: Record<string, unknown>) {
  const { error } = await admin.from("cleffo_sessions").update({
    ...values, updated_at: new Date().toISOString(),
  }).eq("order_number", orderNumber);
  if (error) throw new Error("Could not save payment state");
}

async function checkout(req: Request, input: any, cfg: any) {
  if (req.headers.get("origin") && req.headers.get("origin") !== site) {
    return json({ error: "Use the HLX Labs checkout" }, 403);
  }
  if (!/^[a-f0-9-]{36}$/i.test(input.request_id || "") ||
      !/^[a-f0-9]{64}$/i.test(input.access_token || "")) {
    return json({ error: "Invalid checkout request" }, 400);
  }
  const customer = {
    name: text(input.customer?.name), email: text(input.customer?.email).toLowerCase(),
    phone: text(input.customer?.phone).replace(/\D/g, ""),
  };
  const shipTo = {
    name: customer.name, line1: text(input.shipTo?.line1), line2: text(input.shipTo?.line2),
    city: text(input.shipTo?.city), state: text(input.shipTo?.state, 2).toUpperCase(),
    zip: text(input.shipTo?.zip, 10), country: "US",
  };
  if (!customer.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) ||
      !/^\d{8,15}$/.test(customer.phone) || !shipTo.line1 || !shipTo.city ||
      !/^[A-Z]{2}$/.test(shipTo.state) || !/^\d{5}(-\d{4})?$/.test(shipTo.zip)) {
    return json({ error: "Enter your contact information and a complete US shipping address" }, 400);
  }
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 50) {
    return json({ error: "Your cart is empty or too large" }, 400);
  }
  const requested = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100 ||
        typeof item.cart_key !== "string") return json({ error: "Invalid cart item" }, 400);
    const qty = (requested.get(item.cart_key) || 0) + item.qty;
    if (qty > 100) return json({ error: "Quantity exceeds checkout limit" }, 400);
    requested.set(item.cart_key, qty);
  }
  const { data: catalog, error: catalogError } = await admin.from("cleffo_catalog")
    .select("*").in("cart_key", Array.from(requested.keys()));
  if (catalogError) throw new Error("Catalog unavailable");
  if (catalog.length !== requested.size || catalog.some((p: any) => !p.active)) {
    return json({ error: "A selected size is unavailable. Refresh your cart." }, 409);
  }
  const items = catalog.map((p: any) => ({
    id: p.product_id, optionKey: p.option_key, name: p.name, selectedOption: p.size,
    sku: p.sku, qty: requested.get(p.cart_key), price: p.unit_cents / 100, image: p.image,
  })).sort((a: any, b: any) => (String(a.id) + a.optionKey).localeCompare(String(b.id) + b.optionKey));
  const subtotal = items.reduce((sum: number, p: any) => sum + Math.round(p.price * 100) * p.qty, 0);
  const isTest = cfg.CLEFFO_BASE_URL === "https://apis-dev.cleffo.com";
  // Live tax/shipping policy must be configured before accepting real payments.
  if (!isTest) return json({ error: "Live checkout configuration is not complete" }, 503);
  const accessHash = await hash(input.access_token);
  const requestHash = await hash(JSON.stringify({ items, customer, shipTo, accessHash }));
  const { data: prior, error: priorError } = await admin.from("cleffo_sessions")
    .select("*").eq("request_id", input.request_id).maybeSingle();
  if (priorError) throw new Error("Checkout lookup unavailable");
  if (prior) {
    if (!same(prior.request_hash, requestHash)) return json({ error: "Cart changed. Start a new checkout." }, 409);
    if (!prior.payment_link) return json({ error: "Checkout is being prepared. Retry shortly." }, 409);
    const checked = await verifyPayment(prior, cfg);
    if (["cancelled", "failed", "expired"].includes(checked.payment_state)) {
      return json({ error: "The previous checkout is closed. Start a new checkout.", code: "CHECKOUT_CLOSED" }, 409);
    }
    if (["completed", "test_completed"].includes(checked.payment_state)) {
      await fulfill(checked);
      return json({ payment_link: site + "/cleffo-return.html?order=" + prior.order_number,
        order_number: prior.order_number, is_test: prior.is_test });
    }
    return json({ payment_link: prior.payment_link, order_number: prior.order_number, is_test: prior.is_test });
  }
  let userId = null;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    const { data } = await admin.auth.getUser(bearer);
    if (data.user?.email_confirmed_at && data.user.email?.toLowerCase() === customer.email) userId = data.user.id;
  }
  const orderNumber = "HLXCLF" + crypto.randomUUID().replaceAll("-", "");
  const { error: insertError } = await admin.from("cleffo_sessions").insert({
    order_number: orderNumber, request_id: input.request_id, request_hash: requestHash,
    access_hash: accessHash, user_id: userId, is_test: isTest,
    items, customer, ship_to: shipTo, subtotal_cents: subtotal, total_cents: subtotal,
  });
  if (insertError?.code === "23505") return json({ error: "Checkout is being prepared. Retry shortly." }, 409);
  if (insertError) throw new Error("Could not save checkout");
  const address = {
    address_line_1: shipTo.line1, address_line_2: shipTo.line2,
    city: shipTo.city, state: shipTo.state, postal_code: shipTo.zip, country: shipTo.country,
  };
  const payload = {
    data: {
      merchant_order_id: orderNumber,
      customer_detail: { name: customer.name, email: customer.email, phone_no: customer.phone,
        shipping_address: address },
      products: items.map((p: any) => ({ name: p.name + " " + p.selectedOption,
        product_id: p.sku, quantity: p.qty, price: p.price, image: p.image })),
      price: { sub_total: subtotal / 100, tax: 0, total: subtotal / 100, currency: "USD" },
    },
    metadata: { source: "api", cleffo_client_key: cfg.CLEFFO_CLIENT_KEY,
      redirect_url: site + "/cleffo-return.html?order=" + orderNumber,
      notify_url: project + "/functions/v1/cleffo-payments/webhook" },
  };
  const raw = JSON.stringify(payload);
  let response: Response;
  try {
    response = await fetch(cfg.CLEFFO_BASE_URL + "/api/payment-link", {
      method: "POST", headers: { "Content-Type": "application/json",
        "x-api-key": cfg.CLEFFO_API_KEY, "x-signature": await hmac(cfg.CLEFFO_SIGNATURE_KEY, raw) },
      body: raw, signal: AbortSignal.timeout(20000),
    });
  } catch {
    await update(orderNumber, { payment_state: "creation_unknown" });
    return json({ error: "Payment provider did not respond. Contact support before retrying." }, 502);
  }
  const result = await response.json();
  const link = result?.data?.payment_link;
  const reference = result?.data?.transaction_reference_number;
  if (!response.ok || result.status !== true || typeof link !== "string" ||
      !link.startsWith("https://") || typeof reference !== "string") {
    await update(orderNumber, { payment_state: "creation_failed" });
    console.error("Cleffo link creation rejected", response.status);
    return json({ error: "Payment provider could not prepare checkout. Please contact support." }, 502);
  }
  await update(orderNumber, { reference, payment_link: link, payment_state: "pending" });
  return json({ payment_link: link, order_number: orderNumber, is_test: isTest });
}

async function verifyPayment(saved: any, cfg: any) {
  if (!saved.reference) return saved;
  const response = await fetch(cfg.CLEFFO_BASE_URL + "/api/payment-link/" +
    encodeURIComponent(saved.reference) + "/status", {
    headers: { "x-api-key": cfg.CLEFFO_API_KEY }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Payment verification unavailable");
  const result = await response.json();
  const paid = result.data;
  if (result.status !== true || paid?.transaction_reference_number !== saved.reference ||
      paid.merchant_order_id !== saved.order_number ||
      String(paid.currency).toUpperCase() !== saved.currency ||
      !Number.isFinite(Number(paid.total_amount)) ||
      Math.round(Number(paid.total_amount) * 100) !== saved.total_cents) {
    throw new Error("Payment details do not match checkout");
  }
  if (paid.payment_status !== "completed") {
    if (["failed", "cancelled", "expired"].includes(paid.payment_status) && !["completed", "test_completed"].includes(saved.payment_state)) {
      await update(saved.order_number, { payment_state: paid.payment_status });
      return { ...saved, payment_state: paid.payment_status };
    }
    return saved;
  }
  await update(saved.order_number, { payment_state: saved.is_test ? "test_completed" : "completed",
    verified_payment: paid });
  return { ...saved, payment_state: saved.is_test ? "test_completed" : "completed", verified_payment: paid };
}
async function fulfill(saved: any) {
  if (!["completed", "test_completed"].includes(saved.payment_state)) return;
  if (!["pending", "test_ready"].includes(saved.fulfillment_state)) return;
  const testMode = Deno.env.get("HLX_TEST_MODE");
  const heldTest = saved.is_test && testMode !== "true";
  if (!saved.is_test && testMode !== "false") throw new Error("Supplier environment mismatch");
  const secret = Deno.env.get("HLX_FULFILLMENT_SECRET");
  const supplierKey = Deno.env.get("TIDECO_API_KEY");
  if (heldTest ? !supplierKey : !secret) throw new Error("Supplier connection is not configured");
  // Reserve once before contacting the supplier. Uncertain deliveries require reconciliation.
  const { data: claimed, error } = await admin.from("cleffo_sessions")
    .update({ fulfillment_state: "claimed" }).eq("order_number", saved.order_number)
    .in("fulfillment_state", ["pending", "test_ready"]).select("order_number");
  if (error) throw new Error("Could not reserve fulfillment");
  if (!claimed?.length) return;
  try {
    if (!saved.is_test) {
      const { error: saveError } = await admin.from("orders").upsert({
        user_id: saved.user_id, order_number: saved.order_number, payment_status: "paid",
        transaction_id: saved.reference, currency: saved.currency, total: saved.total_cents / 100,
        items: saved.items, payment_provider: "cleffo",
        provider_payload: { customer: saved.customer, shipTo: saved.ship_to,
          paidAt: new Date().toISOString(), providerOrderId: saved.reference },
      }, { onConflict: "order_number", ignoreDuplicates: true });
      if (saveError) {
        await update(saved.order_number, { fulfillment_state: "pending" });
        throw new Error("Could not save paid order");
      }
    }
    const supplierUrl = heldTest
      ? "https://api.tidecotech.com/intake/order/" + encodeURIComponent(Deno.env.get("TIDECO_BRAND_KEY") || "hlx-labs-8dab17")
      : project + "/functions/v1/tideco-order-intake";
    const response = await fetch(supplierUrl, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + (heldTest ? supplierKey : secret) },
      body: JSON.stringify({ orderId: saved.order_number, paid: !heldTest, paidAt: new Date().toISOString(),
        customer: saved.customer, shipTo: saved.ship_to,
        lines: saved.items.map((p: any) => ({ sku: p.sku, qty: p.qty, price: p.price })),
        note: saved.is_test ? "TEST — DO NOT FULFILL" : "" }),
      signal: AbortSignal.timeout(20000),
    });
    await update(saved.order_number, { fulfillment_state: response.status === 202 ?
      (heldTest ? "test_held" : saved.is_test ? "test_accepted" : "accepted") : "review" });
    if (response.status !== 202) throw new Error("Supplier did not accept the order");
  } catch (error) {
    const current = await session(saved.order_number);
    if (current.fulfillment_state === "claimed") await update(saved.order_number, { fulfillment_state: "unknown" });
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const path = new URL(req.url).pathname.split("/").pop();
  try {
    const cfg = await config();
    if (req.method === "GET" && path === "health") {
      return json({ configured: true, mode: cfg.CLEFFO_BASE_URL.includes("-dev") ? "test" : "live",
        supplier_test_mode: Deno.env.get("HLX_TEST_MODE") === "true",
        supplier_configured: !!Deno.env.get("HLX_FULFILLMENT_SECRET") && !!Deno.env.get("TIDECO_API_KEY") });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const raw = await req.text();
    if (raw.length > 32768) return json({ error: "Request too large" }, 413);
    if (path === "webhook") {
      const timestamp = req.headers.get("X-Cleffo-Timestamp") || "";
      const signature = req.headers.get("X-Cleffo-Signature") || "";
      if (!/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
          !/^[a-f0-9]{64}$/.test(signature) ||
          !same(signature, await hmac(cfg.CLEFFO_API_KEY, timestamp + "." + raw))) {
        return json({ error: "Invalid webhook signature" }, 401);
      }
      const event = JSON.parse(raw);
      if (event.status !== true || event.data?.payment_status !== "completed") return json({ received: true });
      const saved = await session(text(event.data.merchant_order_id));
      if (!saved || event.data.transaction_reference_number !== saved.reference ||
          typeof event.data.is_test !== "boolean" || event.data.is_test !== saved.is_test) {
        return json({ error: "Payment session mismatch" }, 409);
      }
      const verified = await verifyPayment(saved, cfg);
      await fulfill(verified);
      return json({ received: true });
    }
    const input = JSON.parse(raw);
    if (path === "checkout") return await checkout(req, input, cfg);
    if (path === "status") {
      const saved = await session(text(input.order_number));
      if (!saved || typeof input.access_token !== "string" ||
          !same(saved.access_hash, await hash(input.access_token))) return json({ error: "Order unavailable" }, 404);
      const verified = await verifyPayment(saved, cfg);
      await fulfill(verified);
      const current = await session(saved.order_number);
      return json({ order_number: saved.order_number, payment_state: current.payment_state,
        fulfillment_state: current.fulfillment_state, is_test: saved.is_test });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Cleffo request failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Payment service could not complete this request. Please contact support." }, 503);
  }
});

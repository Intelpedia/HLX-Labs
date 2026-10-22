// Server-only TideCo intake relay. Call only from a trusted backend after verifying payment.
// NOT exposed to browser clients; requires internal secret and Supabase service role.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("TIDECO_API_KEY");
  const internalKey = Deno.env.get("HLX_FULFILLMENT_SECRET");
  const brandKey = Deno.env.get("TIDECO_BRAND_KEY") || "hlx-labs-8dab17";
  if (!apiKey || !internalKey) return json({ error: "Not configured" }, 503);
  const authorization = request.headers.get("authorization") || "";
  const received = authorization.replace(/^Bearer\s+/i, "");
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(internalKey), digest(received)]);
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (!received || diff !== 0) return json({ error: "Unauthorized" }, 401);
  let order: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 65536) return json({ error: "Payload too large" }, 413);
    order = JSON.parse(raw);
    if (!order || typeof order !== "object" || Array.isArray(order)) throw Error("Invalid body");
  } catch { return json({ error: "Invalid JSON" }, 400); }
  const customer = order.customer as Record<string, unknown> | undefined;
  const shipTo = order.shipTo as Record<string, unknown> | undefined;
  const lines = order.lines;
  if (typeof order.orderId !== "string" || !order.orderId.trim() || order.paid !== true ||
      !customer || typeof customer.name !== "string" || !customer.name.trim() ||
      !shipTo || typeof shipTo.line1 !== "string" || !shipTo.line1.trim() ||
      typeof shipTo.zip !== "string" || !shipTo.zip.trim() ||
      !Array.isArray(lines) || !lines.length ||
      !lines.every((l: unknown) => !!l && typeof l === "object" &&
        typeof (l as Record<string,unknown>).sku === "string" &&
        Number.isInteger((l as Record<string,unknown>).qty) && Number((l as Record<string,unknown>).qty) > 0)) {
    return json({ error: "Invalid paid order: orderId, customer, shipTo, and lines required" }, 400);
  }
  // IMPORTANT: caller must verify the order and payment server-side before invoking this function.
  try {
    const upstream = await fetch("https://api.tidecotech.com/intake/order/" + encodeURIComponent(brandKey), {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(order),
      signal: AbortSignal.timeout(15000)
    });
    const response = await upstream.text();
    return new Response(response.slice(0, 16384), {
      status: upstream.status, headers: { "content-type": upstream.headers.get("content-type")?.includes("json") ? "application/json" : "text/plain" }
    });
  } catch (e) {
    console.error("TideCo intake transport failure", String(e));
    return json({ error: "TideCo unavailable" }, 502);
  }
});

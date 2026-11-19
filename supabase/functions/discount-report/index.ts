import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "https://hlxlabs.com", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "GET, OPTIONS", "Vary": "Origin" };
const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return json({ error: "Sign in to view reports." }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: "Your session expired. Sign in again." }, 401);
    // getUser reads trusted current server metadata, never user-editable user_metadata.
    if (!data.user.email_confirmed_at || data.user.app_metadata?.hlx_admin !== true) return json({ error: "Administrator access required." }, 403);
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim().toUpperCase() || null;
    const offset = Number(url.searchParams.get("offset") || 0);
    if ((code && !/^[A-Z0-9_-]{1,40}$/.test(code)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000000) return json({ error: "Invalid report filter." }, 400);
    const result = await admin.rpc("hlx_discount_report", { selected_code: code, page_offset: offset });
    if (result.error) throw new Error("Report query failed");
    return json(result.data);
  } catch {
    return json({ error: "Unable to load reports. Please try again." }, 503);
  }
});

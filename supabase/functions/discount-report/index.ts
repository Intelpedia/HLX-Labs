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
    if (url.searchParams.get("view") === "contacts") {
      const offset = Number(url.searchParams.get("offset") || 0);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000000) return json({ error: "Invalid contact page." }, 400);
      const download = url.searchParams.get("download") === "csv";
      const result = await admin.rpc("hlx_mailing_list", { page_offset: offset, export_all: download });
      if (result.error) throw new Error("Contact query failed");
      if (!download) return json(result.data);
      const columns = ["email", "has_account", "has_purchase", "account_confirmed", "paid_orders", "first_seen", "last_seen", "marketing_consent"];
      // Quote CSV fields and neutralize spreadsheet formulas in user-supplied email addresses.
      const csvField = (value: any) => '"' + String(value ?? "").replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""') + '"';
      const csv = [columns.join(","), ...result.data.contacts.map((contact: any) => columns.map(key => csvField(contact[key])).join(","))].join("\r\n");
      return new Response("\uFEFF" + csv + "\r\n", { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="hlx-mailing-list.csv"' } });
    }
    const code = url.searchParams.get("code")?.trim().toUpperCase() || null;
    const offset = Number(url.searchParams.get("offset") || 0);
    if ((code && !/^[A-Z0-9_-]{1,40}$/.test(code)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000000) return json({ error: "Invalid report filter." }, 400);
    const sort = url.searchParams.get("sort") || "desc";
    if (!["asc", "desc"].includes(sort)) return json({ error: "Invalid date sorting." }, 400);
    const start = url.searchParams.get("start") || null;
    const end = url.searchParams.get("end") || null;
    const validDate = (value: string | null) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
    if (!validDate(start) || !validDate(end) || (start && end && start > end)) return json({ error: "Enter a valid date range." }, 400);
    const result = await admin.rpc("hlx_sales_report", { selected_code: code, page_offset: offset, start_date: start, end_date: end, date_sort: sort });
    if (result.error) throw new Error("Report query failed");
    return json(result.data);
  } catch {
    return json({ error: "Unable to load reports. Please try again." }, 503);
  }
});

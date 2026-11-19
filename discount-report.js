const client = window.supabase.createClient('https://ttmwcwuzrqemsqfwkkyw.supabase.co', 'sb_publishable_iqgOzPVIKBA0C1hnGGVAFw_qhycszJa');
const status = document.querySelector('#status');
const report = document.querySelector('#report');
const signIn = document.querySelector('#signIn');
const code = document.querySelector('#code');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const refresh = document.querySelector('#refresh');
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
let offset = 0;
let loading = false;
function row(values) {
  const tr = document.createElement('tr');
  for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
  return tr;
}
async function loadReport() {
  if (loading) return;
  loading = true;
  for (const control of [code, previous, next, refresh]) control.disabled = true;
  status.textContent = 'Loading report…';
  try {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) { const e = new Error('Sign in to view your reports.'); e.signIn = true; throw e; }
    const params = new URLSearchParams({ offset: String(offset) });
    if (code.value) params.set('code', code.value);
    const response = await fetch('https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/discount-report?' + params, { headers: { Authorization: 'Bearer ' + data.session.access_token }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) { const e = new Error(result.error || 'Unable to load report.'); e.signIn = response.status === 401; throw e; }
    signIn.hidden = true;
    const selected = code.value;
    code.replaceChildren(new Option('All codes', ''));
    for (const summary of result.summary) code.add(new Option(summary.code, summary.code));
    code.value = selected;
    document.querySelector('#summary').replaceChildren(...result.summary.map(s => row([s.code, s.paid_orders, money(s.product_sales_cents), money(s.discounts_cents), money(s.paid_total_cents)])));
    const orders = result.orders.map(o => row([o.order_number, new Date(o.created_at).toLocaleString(), o.discount_code, money(o.subtotal_cents - o.discount_cents), money(o.discount_cents), money(o.total_cents), 'Paid']));
    document.querySelector('#orders').replaceChildren(...(orders.length ? orders : [row(['No paid orders for this selection yet.'])]));
    document.querySelector('#count').textContent = result.total_orders ? `${offset + 1}–${Math.min(offset + result.page_size, result.total_orders)} of ${result.total_orders} paid orders` : '0 paid orders';
    previous.disabled = offset === 0;
    next.disabled = offset + result.page_size >= result.total_orders;
    report.hidden = false;
    status.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch (error) {
    report.hidden = true;
    document.querySelector('#summary').replaceChildren();
    document.querySelector('#orders').replaceChildren();
    signIn.hidden = !error.signIn;
    status.textContent = error.message || 'Unable to load report.';
  } finally { loading = false; code.disabled = false; refresh.disabled = false; }
}
code.addEventListener('change', () => { offset = 0; loadReport(); });
refresh.addEventListener('click', loadReport);
previous.addEventListener('click', () => { offset = Math.max(0, offset - 50); loadReport(); });
next.addEventListener('click', () => { offset += 50; loadReport(); });
client.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { report.hidden = true; document.querySelector('#summary').replaceChildren(); document.querySelector('#orders').replaceChildren(); signIn.hidden = false; status.textContent = 'Sign in to view your reports.'; } });
loadReport();

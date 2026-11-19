const client = window.supabase.createClient('https://ttmwcwuzrqemsqfwkkyw.supabase.co', 'sb_publishable_iqgOzPVIKBA0C1hnGGVAFw_qhycszJa');
const status = document.querySelector('#status');
const report = document.querySelector('#report');
const signIn = document.querySelector('#signIn');
const code = document.querySelector('#code');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const refresh = document.querySelector('#refresh');
const start = document.querySelector('#start');
const end = document.querySelector('#end');
const dateSort = document.querySelector('#dateSort');
let offset = 0;
let loading = false;
let hasAccess = false;
let accessVersion = 0;
async function loadReport() {
  if (loading) return;
  loading = true;
  const currentAccess = accessVersion;
  for (const control of [code, start, end, dateSort, previous, next, refresh]) control.disabled = true;
  status.textContent = 'Loading report…';
  try {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) { const e = new Error('Sign in to view your reports.'); e.signIn = true; throw e; }
    const params = new URLSearchParams({ offset: String(offset) });
    if (code.value) params.set('code', code.value);
    if (start.value) params.set('start', start.value);
    if (end.value) params.set('end', end.value);
    params.set('sort', dateSort.value);
    const response = await fetch('https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/discount-report?' + params, { headers: { Authorization: 'Bearer ' + data.session.access_token }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) { const e = new Error(result.error || 'Unable to load report.'); e.signIn = response.status === 401; e.denied = response.status === 403; throw e; }
    if (currentAccess !== accessVersion) return;
    hasAccess = true;
    signIn.hidden = true;
    const selected = code.value;
    code.replaceChildren(new Option('All orders', ''));
    for (const summary of result.summary) code.add(new Option(summary.code, summary.code));
    code.value = selected;
    window.HLXReports.render(result);
    document.querySelector('#count').textContent = result.total_orders ? `${offset + 1}–${Math.min(offset + result.page_size, result.total_orders)} of ${result.total_orders} paid orders` : '0 paid orders';
    previous.disabled = offset === 0;
    next.disabled = offset + result.page_size >= result.total_orders;
    report.hidden = false;
    status.textContent = 'Updated ' + new Date().toLocaleTimeString();
  } catch (error) {
    report.hidden = !!error.signIn || !!error.denied || !hasAccess;
    window.HLXReports.clear();
    signIn.hidden = !error.signIn;
    status.textContent = error.message || 'Unable to load report.';
  } finally { loading = false; code.disabled = false; start.disabled = false; end.disabled = false; dateSort.disabled = false; refresh.disabled = false; }
}
code.addEventListener('change', () => { offset = 0; loadReport(); });
refresh.addEventListener('click', () => { offset = 0; loadReport(); });
for (const date of [start,end,dateSort]) date.addEventListener('change', () => { offset = 0; loadReport(); });
previous.addEventListener('click', () => { offset = Math.max(0, offset - 50); loadReport(); });
next.addEventListener('click', () => { offset += 50; loadReport(); });
client.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { hasAccess = false; accessVersion++; report.hidden = true; window.HLXReports.clear(); signIn.hidden = false; status.textContent = 'Sign in to view your reports.'; } });
loadReport();

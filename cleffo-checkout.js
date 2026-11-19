const cleffoEndpoint = 'https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/cleffo-payments';
const checkoutForm = document.querySelector('#cleffoCheckoutForm');
const checkoutStatus = document.querySelector('#checkoutStatus');
const checkoutButton = document.querySelector('#cleffoSubmit');
const cart = getCart();
const items = cart.map(line => {
  const product = products.find(product => Number(product.id) === Number(line.id));
  const options = product ? productOptions(product) : [];
  let option = options.find(option => String(option.key) === String(line.optionKey));
  if (!option && line.selectedOption) {
    option = options.find(option => option.label.trim().toLowerCase() === String(line.selectedOption).trim().toLowerCase());
  }
  if (!option && !line.selectedOption && (line.optionKey == null || line.optionKey === 'default')) {
    option = options[0];
  }
  return { cart_key: makeCartKey(line.id, option?.key ?? line.optionKey), qty: Number(line.qty) };
});
document.querySelector('#checkoutSummary').textContent = cart.length
  ? `${cart.reduce((sum, line) => sum + Number(line.qty), 0)} items in your cart. Prices are verified before payment.`
  : 'Your cart is empty. Add products from the shop first.';
checkoutButton.disabled = !cart.length;
checkoutForm.addEventListener('submit', async event => {
  event.preventDefault();
  checkoutButton.disabled = true;
  checkoutStatus.textContent = 'Preparing secure payment…';
  try {
    const fields = new FormData(checkoutForm);
    const body = {
      items,
      discount_code: document.querySelector('#discountCode').value.trim().toUpperCase(),
      customer: { name: fields.get('name'), email: fields.get('email'), phone: fields.get('phone') },
      shipTo: { line1: fields.get('line1'), line2: fields.get('line2'), city: fields.get('city'),
        state: fields.get('state'), zip: fields.get('zip') }
    };
    const fingerprint = JSON.stringify(body);
    let draft;
    try { draft = JSON.parse(sessionStorage.getItem('hlxCleffoDraft') || 'null'); } catch { draft = null; }
    if (!draft || draft.fingerprint !== fingerprint) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      draft = { fingerprint, request_id: crypto.randomUUID(),
        access_token: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
      sessionStorage.setItem('hlxCleffoDraft', JSON.stringify(draft));
    }
    const headers = { 'Content-Type': 'application/json' };
    if (hlxSupabase) {
      const { data } = await hlxSupabase.auth.getSession();
      if (data.session) headers.Authorization = 'Bearer ' + data.session.access_token;
    }
    async function sendCheckout() {
      const response = await fetch(cleffoEndpoint + '/checkout', {
        method: 'POST', headers,
        body: JSON.stringify({ ...body, request_id: draft.request_id, access_token: draft.access_token })
      });
      return { response, result: await response.json() };
    }
    let { response, result } = await sendCheckout();
    if (result.code === 'CHECKOUT_CLOSED') {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      draft = { fingerprint, request_id: crypto.randomUUID(),
        access_token: Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('') };
      sessionStorage.setItem('hlxCleffoDraft', JSON.stringify(draft));
      ({ response, result } = await sendCheckout());
    }
    if (!response.ok) throw new Error(result.error || 'Unable to start checkout.');
    if (typeof result.payment_link !== 'string' || !result.payment_link.startsWith('https://')) {
      throw new Error('The payment provider returned an invalid link.');
    }
    localStorage.setItem('hlxCleffoOrder:' + result.order_number, draft.access_token);
    location.assign(result.payment_link);
  } catch (error) {
    checkoutStatus.textContent = error.message || 'Unable to start checkout. Please try again.';
    checkoutButton.disabled = false;
  }
});

const discountInput = document.querySelector('#discountCode');
const applyDiscountButton = document.querySelector('#applyDiscount');
const discountMessage = document.querySelector('#discountMessage');
const totals = document.querySelector('#checkoutTotals');
let quoteVersion = 0;
function invalidateQuote() {
  quoteVersion++;
  totals.replaceChildren();
  discountMessage.textContent = '';
}
discountInput.addEventListener('input', invalidateQuote);
applyDiscountButton.disabled = !cart.length;
applyDiscountButton.addEventListener('click', async () => {
  const currentVersion = ++quoteVersion;
  applyDiscountButton.disabled = true;
  discountMessage.textContent = 'Checking discount…';
  try {
    const response = await fetch(cleffoEndpoint + '/quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, discount_code: discountInput.value.trim().toUpperCase() })
    });
    const result = await response.json();
    if (currentVersion !== quoteVersion) return;
    if (!response.ok) throw new Error(result.error || 'Unable to check this code.');
    const money = cents => (cents < 0 ? '-$' : '$') + (Math.abs(cents) / 100).toFixed(2);
    discountMessage.textContent = result.discount_code
      ? `Code ${result.discount_code} applied. You save ${money(result.discount_cents)}.`
      : 'No discount code applied.';
    totals.replaceChildren();
    for (const [label, value] of [['Subtotal', result.subtotal_cents], ['Discount', -result.discount_cents],
      ['Shipping', result.shipping_cents], ['Total before tax', result.total_cents]]) {
      const row = document.createElement('p');
      row.textContent = label + ': ' + money(value);
      totals.append(row);
    }
  } catch (error) {
    if (currentVersion === quoteVersion) {
      discountMessage.textContent = error.message || 'Unable to check this code.';
      totals.replaceChildren();
    }
  } finally { applyDiscountButton.disabled = !cart.length; }
});

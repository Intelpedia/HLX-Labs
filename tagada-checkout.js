// HLX Labs TagadaPay Headless SDK adapter.
// The public store ID and each exact TagadaPay variant ID must be configured
// before checkout can be activated. Never place private API keys in this file.
const HLX_TAGADA_CONFIG = Object.freeze({
  storeId: '', // TagadaPay public store ID: store_...
  environment: 'production',
  // Keys: "<HLX product id>::<HLX option key>" -> TagadaPay variant ID.
  variants: Object.freeze({})
});

async function beginHLXTagadaCheckout() {
  const notice = document.querySelector('#checkoutNotice');
  const button = document.querySelector('#hlxCheckoutButton');
  const show = (message) => { if (notice) notice.textContent = message; };
  if (!HLX_TAGADA_CONFIG.storeId || !/^store_/.test(HLX_TAGADA_CONFIG.storeId)) {
    show('Checkout is not available yet. The TagadaPay store connection is being finalized.');
    return;
  }
  const cart = typeof getCart === 'function' ? getCart() : [];
  if (!cart.length) { show('Add an item to your cart first.'); return; }
  const items = [];
  for (const line of cart) {
    const key = String(line.id) + '::' + String(line.optionKey ?? 'default');
    const variantId = HLX_TAGADA_CONFIG.variants[key];
    if (!variantId) { show('Checkout setup is incomplete for one or more selected sizes.'); return; }
    items.push({ variantId, quantity: Number(line.qty) });
  }
  if (!window.TagadaHeadless?.create) {
    show('The payment service could not load. Please refresh and try again.');
    return;
  }
  if (button) button.disabled = true;
  show('Preparing secure checkout…');
  try {
    const tagada = window.TagadaHeadless.create({
      storeId: HLX_TAGADA_CONFIG.storeId,
      environment: HLX_TAGADA_CONFIG.environment
    });
    // Hosted checkout handles payment collection; the verified order/paid
    // webhook, not the browser, must initiate TideCo fulfillment.
    const session = await tagada.checkout.createSession({
      items, currency: 'USD',
      returnUrl: new URL('order-confirmation.html', location.href).href
    });
    if (!session?.checkoutUrl || !/^https:\/\//i.test(session.checkoutUrl))
      throw new Error('TagadaPay did not return a hosted checkout URL.');
    location.assign(session.checkoutUrl);
  } catch (err) {
    console.error('TagadaPay checkout initialization:', err);
    show('Unable to start checkout. Please try again later.');
    if (button) button.disabled = false;
  }
}

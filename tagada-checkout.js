// HLX Labs TagadaPay Headless SDK adapter.
// The public store ID and each exact TagadaPay variant ID must be configured
// before checkout can be activated. Never place private API keys in this file.
const HLX_TAGADA_CONFIG = Object.freeze({
  storeId: 'store_9d5ce5d8aba8', // TagadaPay public store ID
  environment: 'production',
  // Keys: "<HLX product id>::<HLX option key>" -> TagadaPay variant ID.
  variants: Object.freeze({
    '1::0': 'variant_2d7a41202a38',
    '1::1': 'variant_dcd80fb5e61b',
    '1::2': 'variant_f4227e374b42',
    '1::3': 'variant_bb253342f8bd',
    '2::0': 'variant_6209cdd75cd4',
    '2::1': 'variant_f0cb82ee8643',
    '2::2': 'variant_92985525ddc5',
    '2::3': 'variant_9e1a74dfa1df',
    '3::default': 'variant_17dbf9861295',
    '4::default': 'variant_97bcddc27754',
    '5::0': 'variant_8225a6f64bb1',
    '5::1': 'variant_70208b4e2092',
    '5::2': 'variant_76f77a6662f1',
    '6::default': 'variant_5792900d08bb',
    '7::default': 'variant_1370c63bed84',
    '8::default': 'variant_3d7b69cb6bd7',
    '9::default': 'variant_648cf986c45a',
    '10::default': 'variant_3f0fb808e3c3',
    '11::default': 'variant_8e5fc2990799',
    '12::default': 'variant_efcc6209fd9d',
    '13::default': 'variant_1ced316991fd',
    '14::default': 'variant_25daf83304c2',
    '15::default': 'variant_09c961bb1b11',
    '16::default': 'variant_f2d6cdcc0948',
    '17::default': 'variant_150dca0d8a91',
    '18::0': 'variant_67bb5af4c8ee',
    '18::1': 'variant_a94fff4c41fc',
    '19::default': 'variant_1788d1460baf',
    '20::0': 'variant_fc2796687285',
    '21::default': 'variant_4a769a3b4cac',
    '22::default': 'variant_1680d8b8b18c',
    '23::default': 'variant_4c8ecb597dc0',
    '24::default': 'variant_6427a36899fa',
    '25::default': 'variant_195fcb1ae4c3',
    '26::default': 'variant_9318627cabc7',
    '27::default': 'variant_61d820f56a0a',
    '29::default': 'variant_9629cc4f2563',
    '30::default': 'variant_31d0a46196c4',
    '31::0': 'variant_9cdedd132d7c',
    '31::1': 'variant_8fdc1eac381d',
    '32::default': 'variant_c8dc64d163de',
    '33::0': 'variant_dc8f1c8886c3',
    '33::1': 'variant_a080f40c07cd',
    '34::default': 'variant_4420cf525d12',
  }),
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
    const product = typeof products !== 'undefined' ? products.find(p => Number(p.id) === Number(line.id)) : null;
    const options = product && typeof productOptions === 'function' ? productOptions(product) : [];
    // Older saved carts sometimes lack optionKey, or store "default" for a sized product.
    // Resolve the actual selected size before looking up its TagadaPay variant.
    let selected = options.find(o => String(o.key) === String(line.optionKey));
    if (!selected && line.selectedOption) selected = options.find(o => String(o.label).trim().toLowerCase() === String(line.selectedOption).trim().toLowerCase());
    if (!selected && options.length === 1) selected = options[0];
    if (!selected && options.length > 1 && !line.selectedOption && (line.optionKey == null || line.optionKey === 'default')) selected = options[0];
    const key = String(line.id) + '::' + String(selected?.key ?? line.optionKey ?? 'default');
    const variantId = HLX_TAGADA_CONFIG.variants[key];
    if (!variantId) {
      console.warn('Unmapped checkout selection', { productId: line.id, selectedSize: line.selectedOption, optionKey: line.optionKey, resolvedKey: key });
      show('Checkout is unavailable for ' + (product?.name || line.name || 'a selected product') + ' (' + (line.selectedOption || selected?.label || 'selected size') + '). Please contact support.');
      return;
    }
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

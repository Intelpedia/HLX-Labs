const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');
const test = require('node:test');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../supabase/functions/cleffo-payments/index.ts'), 'utf8')
  .replace(/^import .*\n/, '');
function runtime(options = {}) {
  let handler;
  const writes = [];
  const supplierRequests = [];
  const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test', HLX_TEST_MODE: 'false', TIDECO_API_KEY: 'fixture-supplier-key', HLX_FULFILLMENT_SECRET: 'fixture-internal-key' };
  const context = {
    crypto: webcrypto, TextEncoder, Response, URL, console, AbortSignal, Date,
    createClient: () => ({ rpc: async () => ({ data: {
      CLEFFO_API_KEY: 'fixture-api-key', CLEFFO_SIGNATURE_KEY: 'fixture-signature-key',
      CLEFFO_CLIENT_KEY: 'fixture-client', CLEFFO_TIDECO_TEST_MODE: options.supplierTest ? 'true' : 'false', CLEFFO_BASE_URL: 'https://apis-dev.cleffo.com'
    } }), from: () => ({ update: value => ({ eq: () => {
      writes.push(value);
      if (value.fulfillment_state === 'claimed') return { in: () => ({ select: async () => ({ data: [{ order_number: 'order' }] }) }) };
      return Promise.resolve({});
    } }) }) }),
    Deno: { env: { get: key => env[key] }, serve: callback => { handler = callback; } },
    fetch: async (url, options) => {
      if (url.includes('tidecotech.com') || url.includes('/functions/v1/tideco-order-intake')) {
        supplierRequests.push(JSON.parse(options.body));
        return new Response('{}', { status: 202 });
      }
      return Response.json({ status: true, data: {
      transaction_reference_number: 'ref', merchant_order_id: 'order', currency: 'USD',
      total_amount: '50.00', payment_status: 'completed'
    } });
    }
  };
  vm.createContext(context);
  vm.runInContext(stripTypeScriptTypes(source), context);
  return { context, writes, supplierRequests, handler: (...args) => handler(...args) };
}
test('status verification rejects a mismatched total before marking paid', async () => {
  const { context, writes } = runtime();
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 1, is_test: true };
  await assert.rejects(vm.runInContext('verifyPayment(saved, {})', context), /do not match/);
  assert.equal(writes.length, 0);
});
test('test payments are recorded as test_completed', async () => {
  const { context, writes } = runtime();
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 5000, is_test: true };
  await vm.runInContext('verifyPayment(saved, {})', context);
  assert.equal(writes[0].payment_state, 'test_completed');
});
test('a completed test sends only an unpaid held order to the live supplier connection', async () => {
  const { context, writes, supplierRequests } = runtime();
  context.saved = { order_number: 'order', payment_state: 'test_completed', fulfillment_state: 'test_ready',
    is_test: true, items: [{ sku: 'fixture-sku', qty: 1, price: 50 }], customer: {}, ship_to: {} };
  await vm.runInContext('fulfill(saved)', context);
  assert.equal(supplierRequests.length, 1);
  assert.equal(supplierRequests[0].paid, false);
  assert.equal(writes.at(-1).fulfillment_state, 'test_held');
});
test('already accepted fulfillment is not claimed again', async () => {
  const { context, writes } = runtime();
  context.saved = { order_number: 'order', payment_state: 'test_completed', fulfillment_state: 'test_accepted', is_test: true };
  await vm.runInContext('fulfill(saved)', context);
  assert.equal(writes.length, 0);
});
test('webhook HMAC covers timestamp and raw body', async () => {
  const { context } = runtime();
  const expected = require('node:crypto').createHmac('sha256', 'secret').update('123.{"x":1}').digest('hex');
  assert.equal(await vm.runInContext('hmac("secret", \'123.{"x":1}\')', context), expected);
});

test('cancelled provider responses are stored as cancelled', async () => {
  const { context, writes } = runtime();
  context.fetch = async () => Response.json({ status: true, data: {
    transaction_reference_number: 'ref', merchant_order_id: 'order', currency: 'USD',
    total_amount: '50.00', payment_status: 'cancelled'
  } });
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 5000, is_test: true, payment_state: 'pending' };
  await vm.runInContext('verifyPayment(saved, {})', context);
  assert.equal(writes[0].payment_state, 'cancelled');
});

test('approved supplier tests upgrade a held order to paid test using the same order id', async () => {
  const { context, writes, supplierRequests } = runtime({ supplierTest: true });
  context.saved = { order_number: 'order', payment_state: 'test_completed', fulfillment_state: 'test_held',
    is_test: true, items: [{ sku: 'fixture-sku', qty: 1, price: 50 }], customer: {}, ship_to: {} };
  await vm.runInContext('fulfill(saved)', context);
  assert.equal(supplierRequests.length, 1);
  assert.equal(supplierRequests[0].orderId, 'order');
  assert.equal(supplierRequests[0].paid, true);
  assert.equal(supplierRequests[0].note, 'TEST — DO NOT FULFILL');
  assert.equal(writes.at(-1).fulfillment_state, 'test_accepted');
});

test('shipping is $15 below $200 and free starting at $200', () => {
  const { context } = runtime();
  assert.equal(vm.runInContext('shippingCentsForSubtotal(19999)', context), 1500);
  assert.equal(vm.runInContext('shippingCentsForSubtotal(20000)', context), 0);
  assert.equal(vm.runInContext('shippingCentsForSubtotal(25000)', context), 0);
});

test('live verification accepts processor-added tax and records the final amount', async () => {
  const { context, writes } = runtime();
  context.fetch = async () => Response.json({ status: true, data: {
    transaction_reference_number: 'ref', merchant_order_id: 'order', currency: 'USD',
    total_amount: '70.20', payment_status: 'completed'
  } });
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 6500,
    subtotal_cents: 5000, shipping_cents: 1500, is_test: false };
  await vm.runInContext('verifyPayment(saved, {})', context);
  assert.equal(writes[0].total_cents, 7020);
  assert.equal(writes[0].tax_cents, 520);
});
test('live verification rejects payment below merchandise plus shipping', async () => {
  const { context } = runtime();
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 6500,
    subtotal_cents: 5000, shipping_cents: 1500, is_test: false };
  await assert.rejects(vm.runInContext('verifyPayment(saved, {})', context), /do not match/);
});

test('percentage and fixed discounts round to cents and cannot exceed merchandise', () => {
  const { context } = runtime();
  assert.equal(vm.runInContext('discountForSubtotal(10001, "percent", 12.5)', context), 1250);
  assert.equal(vm.runInContext('discountForSubtotal(5000, "fixed", 10)', context), 1000);
  assert.equal(vm.runInContext('discountForSubtotal(5000, "fixed", 100)', context), 5000);
});
test('allocation preserves exact cents and quantities across mixed products', () => {
  const { context } = runtime();
  context.items = [{ sku: 'a', qty: 3, price: 50 }, { sku: 'b', qty: 7, price: 17.99 }];
  for (const discount of [1, 17, 1000, 13789, 27593]) {
    context.discount = discount;
    const rows = vm.runInContext('allocateDiscount(items, discount)', context);
    assert.equal(rows.reduce((sum, row) => sum + Math.round(row.price * 100) * row.qty, 0), 27593 - discount);
    assert.equal(rows.filter(row => row.sku === 'a').reduce((sum, row) => sum + row.qty, 0), 3);
    assert.equal(rows.filter(row => row.sku === 'b').reduce((sum, row) => sum + row.qty, 0), 7);
    assert.ok(rows.every(row => row.price >= 0 && row.qty > 0));
  }
});
test('quote validates private codes and ignores customer-supplied prices', async () => {
  const { context } = runtime();
  context.mockFrom = table => ({ select: () => table === 'cleffo_catalog'
    ? { in: async () => ({ data: [{ cart_key: 'x', product_id: 1, option_key: '0', name: 'Fixture', size: '10mg', sku: 'a', unit_cents: 5000, active: true }] }) }
    : { eq: (_key, code) => ({ maybeSingle: async () => ({ data: code === 'SAVE' ? { active: true, discount_type: 'percent', amount: 10, minimum_subtotal_cents: 0 } : null }) }) } });
  vm.runInContext('admin.from = mockFrom', context);
  context.input = { items: [{ cart_key: 'x', qty: 4, price: 0.01 }], discount_code: 'save' };
  let result = await vm.runInContext('priceCart(input)', context);
  assert.equal(result.subtotal, 20000);
  assert.equal(result.discountCents, 2000);
  assert.equal(result.shippingCents, 0);
  assert.equal(result.totalCents, 18000);
  context.input.discount_code = 'UNKNOWN';
  result = await vm.runInContext('priceCart(input)', context);
  assert.equal(result.status, 400);
});
test('live verification uses discounted merchandise amount and records processor tax', async () => {
  const { context, writes } = runtime();
  context.saved = { reference: 'ref', order_number: 'order', currency: 'USD', total_cents: 4500,
    subtotal_cents: 5000, discount_cents: 2000, shipping_cents: 1500, is_test: false };
  await vm.runInContext('verifyPayment(saved, {})', context);
  assert.equal(writes[0].total_cents, 5000);
  assert.equal(writes[0].tax_cents, 500);
});

test('all promo codes skip sale variants and reject sale-only carts', async () => {
  const { context } = runtime();
  const products = [
    { cart_key: '1::0', product_id: 1, option_key: '0', sku: 'regular', unit_cents: 5000, regular_unit_cents: 5000, active: true },
    { cart_key: '1::1', product_id: 1, option_key: '1', sku: 'sale', unit_cents: 3000, regular_unit_cents: 4500, active: true }
  ];
  context.mockFrom = table => ({ select: () => table === 'cleffo_catalog'
    ? { in: async (_key, keys) => ({ data: products.filter(product => keys.includes(product.cart_key)) }) }
    : { eq: (_key, code) => ({ maybeSingle: async () => ({ data: {
      active: true, discount_type: code === 'HOL20' ? 'percent' : 'fixed', amount: code === 'HOL20' ? 20 : 100,
      minimum_subtotal_cents: 0
    } }) }) } });
  vm.runInContext('admin.from = mockFrom', context);
  context.input = { items: [{ cart_key: '1::0', qty: 3 }, { cart_key: '1::1', qty: 2 }], discount_code: 'HOL20' };
  const quote = await vm.runInContext('priceCart(input)', context);
  assert.equal(quote.discountCents, 3000);
  assert.equal(quote.items.find(item => item.sku === 'sale').price, 30);
  assert.equal(quote.totalCents, 18000);
  context.input.items.shift();
  assert.equal((await vm.runInContext('priceCart(input)', context)).status, 400);
  context.input.items.unshift({ cart_key: '1::0', qty: 1 });
  context.input.discount_code = 'FIXED';
  const fixed = await vm.runInContext('priceCart(input)', context);
  assert.equal(fixed.discountCents, 5000);
  assert.equal(fixed.items.find(item => item.sku === 'sale').price, 30);
});

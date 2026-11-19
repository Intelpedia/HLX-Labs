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

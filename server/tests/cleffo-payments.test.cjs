const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');
const test = require('node:test');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../supabase/functions/cleffo-payments/index.ts'), 'utf8')
  .replace(/^import .*\n/, '');
function runtime() {
  let handler;
  const writes = [];
  const env = { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test', HLX_TEST_MODE: 'false' };
  const context = {
    crypto: webcrypto, TextEncoder, Response, URL, console, AbortSignal, Date,
    createClient: () => ({ rpc: async () => ({ data: {
      CLEFFO_API_KEY: 'fixture-api-key', CLEFFO_SIGNATURE_KEY: 'fixture-signature-key',
      CLEFFO_CLIENT_KEY: 'fixture-client', CLEFFO_BASE_URL: 'https://apis-dev.cleffo.com'
    } }), from: () => ({ update: value => ({ eq: async () => { writes.push(value); return {}; } }) }) }),
    Deno: { env: { get: key => env[key] }, serve: callback => { handler = callback; } },
    fetch: async () => Response.json({ status: true, data: {
      transaction_reference_number: 'ref', merchant_order_id: 'order', currency: 'USD',
      total_amount: '50.00', payment_status: 'completed'
    } })
  };
  vm.createContext(context);
  vm.runInContext(stripTypeScriptTypes(source), context);
  return { context, writes, handler: (...args) => handler(...args) };
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
test('a test payment cannot enter a live supplier environment', async () => {
  const { context, writes } = runtime();
  context.saved = { order_number: 'order', payment_state: 'test_completed', fulfillment_state: 'pending', is_test: true };
  await vm.runInContext('fulfill(saved)', context);
  assert.deepEqual(JSON.parse(JSON.stringify(writes[0])).fulfillment_state, 'test_ready');
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

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync('supabase/functions/discount-report/index.ts','utf8').replace(/^import .*\n/,'');
function runtime(user, authError) {
 let handler, calls = [];
 const context = { Response, URL, Deno: { env: { get: () => 'fixture' }, serve: fn => handler = fn },
 createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) }, rpc: async (name,args) => { calls.push({name,args}); return {data:{summary:[],orders:[],total_orders:0,page_size:50}}; } }) };
 vm.runInNewContext(stripTypeScriptTypes(source),context);
 return { calls, request: (query='',token='fixture') => handler(new Request('https://example.com/discount-report'+query,{headers:token?{Authorization:'Bearer '+token}:{}})) };
}
test('anonymous, invalid tokens, and customer-controlled metadata cannot access orders',async()=>{
 const cases = [runtime(null),runtime({email_confirmed_at:'yes',user_metadata:{hlx_admin:true}}),runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}},new Error('invalid'))];
 assert.equal((await cases[0].request('',null)).status,401);
 assert.equal((await cases[1].request()).status,403);
 assert.equal((await cases[2].request()).status,401);
 for(const r of cases)assert.equal(r.calls.length,0);
});
test('confirmed administrator can filter and paginate the report',async()=>{
 const r=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}});
 const response=await r.request('?code=hlx15&offset=50');
 assert.equal(response.status,200);
 assert.equal(r.calls[0].args.selected_code,'HLX15');
 assert.equal(r.calls[0].args.page_offset,50);
 assert.equal(response.headers.get('cache-control'),'no-store');
});
test('invalid pagination is rejected before querying order data',async()=>{
 const r=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}});
 assert.equal((await r.request('?offset=-1')).status,400);
 assert.equal(r.calls.length,0);
});

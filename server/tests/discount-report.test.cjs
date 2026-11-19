const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync('supabase/functions/discount-report/index.ts','utf8').replace(/^import .*\n/,'');
function runtime(user, authError, rpcData) {
 let handler, calls = [];
 const context = { Response, URL, Deno: { env: { get: () => 'fixture' }, serve: fn => handler = fn },
 createClient: () => ({ auth: { getUser: async () => ({ data: { user }, error: authError }) }, rpc: async (name,args) => { calls.push({name,args}); return {data:rpcData || {summary:[],orders:[],total_orders:0,page_size:50}}; } }) };
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
test('date filters are validated and passed to the sales report',async()=>{
 const r=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}});
 assert.equal((await r.request('?start=2026-11-01&end=2026-11-30')).status,200);
 assert.equal(r.calls[0].name,'hlx_sales_report');
 assert.equal(r.calls[0].args.start_date,'2026-11-01');
 assert.equal(r.calls[0].args.end_date,'2026-11-30');
 for(const query of ['?start=2026-02-30','?start=2026-12-01&end=2026-11-01','?end=invalid']) assert.equal((await r.request(query)).status,400);
 assert.equal(r.calls.length,1);
});

test('date sorting is validated and passed to the database',async()=>{
 const r=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}});
 assert.equal((await r.request('?sort=asc')).status,200);
 assert.equal(r.calls[0].args.date_sort,'asc');
 assert.equal((await r.request('?sort=desc')).status,200);
 assert.equal(r.calls[1].args.date_sort,'desc');
 assert.equal((await r.request('?sort=invalid')).status,400);
 assert.equal(r.calls.length,2);
});
test('contact listing and CSV export require the same administrator guard',async()=>{
 const denied=runtime({email_confirmed_at:'yes',user_metadata:{hlx_admin:true}});
 assert.equal((await denied.request('?view=contacts&download=csv')).status,403);
 assert.equal(denied.calls.length,0);
 const admin=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}});
 assert.equal((await admin.request('?view=contacts&offset=100')).status,200);
 assert.equal(admin.calls[0].name,'hlx_mailing_list');
 assert.equal(admin.calls[0].args.export_all,false);
 assert.equal(admin.calls[0].args.page_offset,100);
});

test('CSV exports all contacts with quoting and formula protection',async()=>{
 const r=runtime({email_confirmed_at:'yes',app_metadata:{hlx_admin:true}},null,{contacts:[{email:'+hello@example.invalid',has_account:true,has_purchase:false,account_confirmed:false,paid_orders:0,marketing_consent:'not_recorded'}]});
 const response=await r.request('?view=contacts&download=csv&offset=100');
 assert.equal(response.status,200);
 assert.equal(r.calls[0].args.export_all,true);
 assert.match(response.headers.get('content-type'),/text\/csv/);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const csv=await response.text();
 assert.ok(csv.includes('"\'+hello@example.invalid"'));
 assert.ok(csv.includes('marketing_consent'));
});

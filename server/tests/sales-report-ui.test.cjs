const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function ui(){
 const nodes={};
 const element=()=>({children:[],value:'',textContent:'',append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(){},addEventListener(){}});
 const context={window:{},Intl,Date,document:{createElement:element,createElementNS:element,createTextNode:text=>({textContent:text}),querySelector:key=>nodes[key]||(nodes[key]=element())}};
 vm.runInNewContext(fs.readFileSync('sales-report-ui.js','utf8'),context);
 return {api:context.window.HLXReports,nodes};
}
test('product prices, volume, discounted revenue, and unsold products render safely',()=>{
 const {api,nodes}=ui();
 api.render({costs:{product_cost_cents:3000,processing_fee_cents:1085,label_cost_cents:1200,shipping_expense_cents:0,specified_cost_cents:5285,estimated_profit_cents:8715,profit_margin_percent:62.3,orders_missing_costs:0},overview:{paid_orders:1,units:3,gross_revenue_cents:15000,net_revenue_cents:14000,product_sales_cents:14000,paid_total_cents:15500,average_order_cents:15500,discounts_cents:1000,shipping_cents:1500,tax_cents:0,historical_orders:0},monthly:[{month:'2026-11',gross_revenue_cents:15000,net_revenue_cents:14000,net_growth_percent:25,paid_orders:1,units:3,product_sales_cents:14000,discounts_cents:1000,shipping_cents:1500,tax_cents:0,paid_total_cents:15500,average_order_cents:15500}],products:[{name:'<script>Fixture</script>',size:'10mg',sku:'fixture',current_unit_cents:5000,units:3,paid_orders:1,average_unit_cents:4667,min_unit_cents:4666,max_unit_cents:4667,product_sales_cents:14000},{name:'Unsold',sku:'unsold',units:0,paid_orders:0,product_sales_cents:0}],summary:[],orders:[]});
 assert.equal(nodes['#overview'].children.length,9);
 assert.equal(nodes['#monthly'].children[0].children[0].textContent,'2026-11');
 assert.equal(nodes['#monthly'].children[0].children[8].textContent,'$155.00');
 assert.equal(nodes['#trends'].children[0].children[2].textContent,'+25.0%');
 assert.equal(nodes['#revenueChart'].children.length,1);
 assert.ok(nodes['#revenueChart'].children[0].children.length>10);
 assert.equal(nodes['#costComposition'].children.length,2);
 assert.equal(nodes['#costMetrics'].children[5].children[1].textContent,'$87.15');
 assert.equal(nodes['#products'].children.length,2);
 const cells=nodes['#products'].children[0].children;
 assert.equal(cells[0].textContent,'<script>Fixture</script>');
 assert.equal(cells[3].textContent,'$50.00');
 assert.equal(cells[4].textContent,3);
 assert.equal(cells[8].textContent,'$140.00');
 api.clear();
 assert.equal(nodes['#products'].children.length,0);
 assert.equal(nodes['#overview'].children.length,0);
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function ui(){
 const nodes={};
 const element=()=>({children:[],value:'',textContent:'',append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},addEventListener(){}});
 const context={window:{},Intl,Date,document:{createElement:element,querySelector:key=>nodes[key]||(nodes[key]=element())}};
 vm.runInNewContext(fs.readFileSync('sales-report-ui.js','utf8'),context);
 return {api:context.window.HLXReports,nodes};
}
test('product prices, volume, discounted revenue, and unsold products render safely',()=>{
 const {api,nodes}=ui();
 api.render({overview:{paid_orders:1,units:3,product_sales_cents:14000,paid_total_cents:15500,average_order_cents:15500,discounts_cents:1000,shipping_cents:1500,tax_cents:0,historical_orders:0},products:[{name:'<script>Fixture</script>',size:'10mg',sku:'fixture',current_unit_cents:5000,units:3,paid_orders:1,average_unit_cents:4667,min_unit_cents:4666,max_unit_cents:4667,product_sales_cents:14000},{name:'Unsold',sku:'unsold',units:0,paid_orders:0,product_sales_cents:0}],summary:[],orders:[]});
 assert.equal(nodes['#overview'].children.length,8);
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

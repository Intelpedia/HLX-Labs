// Add future report sections here; transport and access checks stay in discount-report.js.
window.HLXReports = (() => {
  const sections = [
    { id: 'overviewSection', label: 'Overview' },
    { id: 'trendsSection', label: 'Sales trends' },
    { id: 'profitSection', label: 'Costs & profit' },
    { id: 'monthlySection', label: 'Monthly sales' },
    { id: 'productsSection', label: 'Products' },
    { id: 'discountsSection', label: 'Discount codes' },
    { id: 'ordersSection', label: 'Orders' }
  ];
  const money = cents => cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  const percent = value => value == null ? '—' : (value > 0 ? '+' : '') + Number(value).toFixed(1) + '%';
  function row(values) {
    const tr = document.createElement('tr');
    for (const value of values) { const td = document.createElement('td'); td.textContent = value; if (typeof value === 'string' && /^[+-][0-9.]+%$/.test(value)) td.className = value.startsWith('-') ? 'loss' : 'gain'; tr.append(td); }
    return tr;
  }
  function svgNode(tag, attributes = {}, content) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,String(value));
    if (content != null) node.textContent = content;
    return node;
  }
  function renderRevenueChart(months) {
    const root = document.querySelector('#revenueChart');
    const data = [...months].sort((a,b) => a.month.localeCompare(b.month)).slice(-12);
    if (!data.length) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'No revenue data for this period. Select another date range.'; root.replaceChildren(empty); return; }
    const width = 960, height = 300, left = 68, right = 24, top = 24, bottom = 44;
    const series = [{key:'gross_revenue_cents',label:'Gross',color:'#7d9dff',dash:'5 5'}, {key:'net_revenue_cents',label:'Net',color:'#ff454e'}, {key:'estimated_profit_cents',label:'Estimated profit',color:'#4cdeae'}];
    const values = data.flatMap(m => series.map(s => m[s.key]).filter(v => v != null));
    const min = Math.min(0,...values), max = Math.max(100,...values), range = max-min;
    const x = i => data.length === 1 ? width/2 : left+i*(width-left-right)/(data.length-1);
    const y = value => top+(max-value)*(height-top-bottom)/range;
    const chart = svgNode('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Monthly gross revenue, net revenue, and estimated profit. Full values are available in the monthly tables.'});
    for (let i=0;i<5;i++) {
      const value = min+range*i/4;
      chart.append(svgNode('line',{x1:left,x2:width-right,y1:y(value),y2:y(value),stroke:'#25303d','stroke-dasharray':'3 5'}));
      chart.append(svgNode('text',{x:left-12,y:y(value)+4,'text-anchor':'end'},new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(value/100)));
    }
    const area = data.map((m,i) => `${x(i)},${y(m.net_revenue_cents || 0)}`).join(' ');
    chart.append(svgNode('polygon',{points:`${x(0)},${y(0)} ${area} ${x(data.length-1)},${y(0)}`,fill:'#ff454e',opacity:'.08'}));
    for (const line of series) {
      let path = '', connected = false;
      data.forEach((m,i) => { if (m[line.key] == null) { connected=false; return; } path += `${connected ? 'L' : 'M'}${x(i)} ${y(m[line.key])} `; connected=true; });
      chart.append(svgNode('path',{d:path,fill:'none',stroke:line.color,'stroke-width':2.5,'stroke-dasharray':line.dash || '', 'stroke-linejoin':'round'}));
      data.forEach((m,i) => {
        if (m[line.key] == null) return;
        const circle = svgNode('circle',{cx:x(i),cy:y(m[line.key]),r:4.5,fill:line.color,stroke:'#10151d','stroke-width':2});
        circle.append(svgNode('title',{},`${m.month}${m.partial_month ? ' (partial)' : ''} · ${line.label}: ${money(m[line.key])}`)); chart.append(circle);
      });
    }
    data.forEach((m,i) => { if (data.length>6 && i%2 && i!==data.length-1) return; chart.append(svgNode('text',{x:x(i),y:height-14,'text-anchor':'middle'},m.month)); });
    root.replaceChildren(chart);
  }
  function renderCostComposition(costs) {
    const root = document.querySelector('#costComposition');
    const entries = [['Product costs',costs.product_cost_cents,'#ff454e'],['Processing',costs.processing_fee_cents,'#7d9dff'],['Labeling',costs.label_cost_cents,'#e6bd73'],['Free shipping',costs.shipping_expense_cents,'#4cdeae']];
    if (entries.some(([,value]) => value == null)) { root.replaceChildren(); return; }
    const total = entries.reduce((sum,[,value]) => sum+value,0);
    let progress = 0;
    const stops = entries.map(([,value,color]) => { const from=progress; progress += total ? value/total*100 : 0; return `${color} ${from}% ${progress}%`; });
    const ring = document.createElement('div'); ring.className='cost-ring'; ring.setAttribute('style',`background:${total ? 'conic-gradient('+stops.join(',')+')' : '#25303d'}`);
    const amount = document.createElement('strong'); amount.textContent=money(total); ring.append(amount);
    const legend = document.createElement('div'); legend.className='cost-legend';
    for (const [label,value,color] of entries) {
      const item=document.createElement('div'); item.className='cost-item';
      const title=document.createElement('span'); const swatch=document.createElement('i'); swatch.className='swatch'; swatch.setAttribute('style','background:'+color); title.append(swatch,document.createTextNode(label));
      const number=document.createElement('strong'); number.textContent=money(value)+(total ? ` / ${(value/total*100).toFixed(1)}%` : ''); item.append(title,number); legend.append(item);
    }
    root.replaceChildren(ring,legend);
  }
  let products = [];
  function renderProducts() {
    const search = document.querySelector('#productSearch').value.trim().toLowerCase();
    const matches = products.filter(p => `${p.name} ${p.size} ${p.sku}`.toLowerCase().includes(search));
    document.querySelector('#products').replaceChildren(...matches.map(p => row([
      p.name, p.size || '—', p.sku, money(p.current_unit_cents), p.units, p.paid_orders,
      money(p.average_unit_cents), p.min_unit_cents == null ? '—' : `${money(p.min_unit_cents)}–${money(p.max_unit_cents)}`, money(p.product_sales_cents), `${p.current_month_units ?? 0} / ${p.previous_month_units ?? '—'}`, percent(p.net_growth_percent), money(p.purchase_unit_cost_cents), money(p.units ? p.product_cost_cents : 0), money(p.units ? p.label_cost_cents : 0), money(p.units ? p.direct_margin_cents : 0)
    ])));
    if (!matches.length) document.querySelector('#products').append(row(['No matching products.']));
  }
  function clear() {
    products = [];
    for (const id of ['costRules','costWarning']) document.querySelector('#' + id).textContent = '';
    for (const id of ['overview', 'monthly', 'trends', 'revenueChart', 'costComposition', 'costMetrics', 'monthlyProfit', 'products', 'summary', 'orders']) document.querySelector('#' + id).replaceChildren();
  }
  function render(result) {
    const o = result.overview;
    const metrics = [['Gross revenue', money(o.gross_revenue_cents)], ['Net revenue*', money(o.net_revenue_cents)], ['Paid orders', o.paid_orders], ['Units sold', o.units],
      ['Paid total', money(o.paid_total_cents)], ['Average order total', money(o.average_order_cents)],
      ['Recorded discounts', money(o.discounts_cents)], ['Recorded shipping', money(o.shipping_cents)], ['Recorded tax', money(o.tax_cents)]];
    document.querySelector('#overview').replaceChildren(...metrics.map(([label,value]) => {
      const card = document.createElement('div'); card.className = 'metric' + (label.startsWith('Net revenue') ? ' featured' : '');
      const title = document.createElement('span'); title.textContent = label;
      const number = document.createElement('strong'); number.textContent = value;
      card.append(title,number); return card;
    }));
    document.querySelector('#coverageNote').textContent = o.historical_orders ? `${o.historical_orders} historical paid orders included. Historical discount, shipping, tax, and test details are unavailable; recorded breakdown totals cover Cleffo only.` : 'All selected orders have a recorded Cleffo payment breakdown.';
    const months = (result.monthly || []).map(m => row([m.month + (m.partial_month ? ' (partial)' : ''), m.paid_orders, m.units, money(m.gross_revenue_cents), money(m.net_revenue_cents), money(m.discounts_cents), money(m.shipping_cents), money(m.tax_cents), money(m.paid_total_cents), money(m.average_order_cents)]));
    document.querySelector('#monthly').replaceChildren(...(months.length ? months : [row(['No monthly sales for this selection yet.'])]));
    const trendMonths = result.monthly || [];
    document.querySelector('#trends').replaceChildren(...trendMonths.map(m => row([m.month + (m.partial_month ? ' (partial)' : ''), percent(m.gross_growth_percent), percent(m.net_growth_percent), percent(m.order_growth_percent), percent(m.unit_growth_percent)])));
    renderRevenueChart(trendMonths);
    const period = result.trend_period || {};
    document.querySelector('#productTrendNote').textContent = period.current_month ? `Product trends compare ${period.current_month} with ${period.previous_month} within the selected date range.` : 'Select a period with sales to compare product trends.';
    const costs = result.costs || {};
    const costMetrics = [['Product costs', money(costs.product_cost_cents)], ['Processing fees', money(costs.processing_fee_cents)], ['Label fees', money(costs.label_cost_cents)], ['Free-shipping expense', money(costs.shipping_expense_cents)], ['Total specified costs', money(costs.specified_cost_cents)], ['Estimated profit', money(costs.estimated_profit_cents)], ['Estimated margin', percent(costs.profit_margin_percent)]];
    document.querySelector('#costMetrics').replaceChildren(...costMetrics.map(([label,value]) => {
      const card = document.createElement('div'); card.className = 'metric' + (label === 'Estimated profit' ? (costs.estimated_profit_cents < 0 ? ' negative' : ' positive') : '');
      const title = document.createElement('span'); title.textContent = label;
      const amount = document.createElement('strong'); amount.textContent = value;
      card.append(title,amount); return card;
    }));
    renderCostComposition(costs);
    const model = result.cost_model;
    document.querySelector('#costRules').textContent = model ? `Processing: ${Number(model.processing_rate * 100).toFixed(0)}% of total charged (including shipping and tax). Labels: ${money(model.label_cents)} per vial. Free-shipping expense: ${money(model.free_shipping_cost_cents)} on product subtotals of ${money(model.free_shipping_threshold_cents)} or more before discounts.` : '';
    document.querySelector('#costWarning').textContent = costs.orders_missing_costs ? `Profit is unavailable for ${costs.orders_missing_costs} orders with missing product costs. Missing SKUs: ${(costs.missing_skus || []).join(', ')}. Missing costs are not treated as zero.` : 'All sold SKUs in this selection have purchase costs.';
    document.querySelector('#monthlyProfit').replaceChildren(...(result.monthly || []).map(m => row([m.month + (m.partial_month ? ' (partial)' : ''), money(m.net_revenue_cents), money(m.product_cost_cents), money(m.processing_fee_cents), money(m.label_cost_cents), money(m.shipping_expense_cents), money(m.estimated_profit_cents)])));
    products = result.products;
    renderProducts();
    document.querySelector('#summary').replaceChildren(...result.summary.map(s => row([s.code, s.paid_orders, money(s.product_sales_cents), money(s.discounts_cents), money(s.paid_total_cents)])));
    const orders = result.orders.map(o => row([o.order_number, new Date(o.created_at).toLocaleString(), o.discount_code || '—', o.source,
      o.items.map(i => `${i.name} ${i.selectedOption || ''} × ${i.qty} @ ${money(Math.round(i.price * 100))}`).join('; '),
      money(o.subtotal_cents-o.discount_cents), o.breakdown_known ? money(o.discount_cents) : 'Not recorded', money(o.total_cents), 'Paid', money(o.specified_cost_cents), money(o.estimated_profit_cents)]));
    document.querySelector('#orders').replaceChildren(...(orders.length ? orders : [row(['No paid orders for this selection yet.'])]));
  }
  document.querySelector('#reportSections').replaceChildren(...sections.map(section => {
    const link = document.createElement('a'); link.href = '#' + section.id; link.textContent = section.label; link.addEventListener('click', () => { for (const nav of document.querySelectorAll('#reportSections a')) { nav.classList.remove('active'); nav.removeAttribute('aria-current'); } link.classList.add('active'); link.setAttribute('aria-current','location'); }); if (section.id === 'overviewSection') { link.className = 'active'; link.setAttribute('aria-current','location'); } return link;
  }));
  document.querySelector('#productSearch').addEventListener('input',renderProducts);
  return { render, clear, sections };
})();

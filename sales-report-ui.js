// Add future report sections here; transport and access checks stay in discount-report.js.
window.HLXReports = (() => {
  const sections = [
    { id: 'overviewSection', label: 'Overview' },
    { id: 'monthlySection', label: 'Monthly sales' },
    { id: 'productsSection', label: 'Products' },
    { id: 'discountsSection', label: 'Discount codes' },
    { id: 'ordersSection', label: 'Orders' }
  ];
  const money = cents => cents == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
  function row(values) {
    const tr = document.createElement('tr');
    for (const value of values) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
    return tr;
  }
  let products = [];
  function renderProducts() {
    const search = document.querySelector('#productSearch').value.trim().toLowerCase();
    const matches = products.filter(p => `${p.name} ${p.size} ${p.sku}`.toLowerCase().includes(search));
    document.querySelector('#products').replaceChildren(...matches.map(p => row([
      p.name, p.size || '—', p.sku, money(p.current_unit_cents), p.units, p.paid_orders,
      money(p.average_unit_cents), p.min_unit_cents == null ? '—' : `${money(p.min_unit_cents)}–${money(p.max_unit_cents)}`, money(p.product_sales_cents)
    ])));
    if (!matches.length) document.querySelector('#products').append(row(['No matching products.']));
  }
  function clear() {
    products = [];
    for (const id of ['overview', 'monthly', 'products', 'summary', 'orders']) document.querySelector('#' + id).replaceChildren();
  }
  function render(result) {
    const o = result.overview;
    const metrics = [['Paid orders', o.paid_orders], ['Units sold', o.units], ['Product sales', money(o.product_sales_cents)],
      ['Paid total', money(o.paid_total_cents)], ['Average order total', money(o.average_order_cents)],
      ['Recorded discounts', money(o.discounts_cents)], ['Recorded shipping', money(o.shipping_cents)], ['Recorded tax', money(o.tax_cents)]];
    document.querySelector('#overview').replaceChildren(...metrics.map(([label,value]) => {
      const card = document.createElement('div'); card.className = 'metric';
      const title = document.createElement('span'); title.textContent = label;
      const number = document.createElement('strong'); number.textContent = value;
      card.append(title,number); return card;
    }));
    document.querySelector('#coverageNote').textContent = o.historical_orders ? `${o.historical_orders} historical paid orders included. Historical discount, shipping, tax, and test details are unavailable; recorded breakdown totals cover Cleffo only.` : 'All selected orders have a recorded Cleffo payment breakdown.';
    const months = (result.monthly || []).map(m => row([m.month, m.paid_orders, m.units, money(m.product_sales_cents), money(m.discounts_cents), money(m.shipping_cents), money(m.tax_cents), money(m.paid_total_cents), money(m.average_order_cents)]));
    document.querySelector('#monthly').replaceChildren(...(months.length ? months : [row(['No monthly sales for this selection yet.'])]));
    products = result.products;
    renderProducts();
    document.querySelector('#summary').replaceChildren(...result.summary.map(s => row([s.code, s.paid_orders, money(s.product_sales_cents), money(s.discounts_cents), money(s.paid_total_cents)])));
    const orders = result.orders.map(o => row([o.order_number, new Date(o.created_at).toLocaleString(), o.discount_code || '—', o.source,
      o.items.map(i => `${i.name} ${i.selectedOption || ''} × ${i.qty} @ ${money(Math.round(i.price * 100))}`).join('; '),
      money(o.subtotal_cents-o.discount_cents), o.breakdown_known ? money(o.discount_cents) : 'Not recorded', money(o.total_cents), 'Paid']));
    document.querySelector('#orders').replaceChildren(...(orders.length ? orders : [row(['No paid orders for this selection yet.'])]));
  }
  document.querySelector('#reportSections').replaceChildren(...sections.map(section => {
    const link = document.createElement('a'); link.href = '#' + section.id; link.textContent = section.label; return link;
  }));
  document.querySelector('#productSearch').addEventListener('input',renderProducts);
  return { render, clear, sections };
})();

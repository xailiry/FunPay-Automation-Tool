import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/seller-dashboard-data.js');

const {
  aggregateOrders,
  calculateWithdrawalEstimate,
  createOfferSalesMap,
  filterOrdersByPeriod,
  normalizeProductTitle,
  parseOrdersDocument
} = globalThis.FunPayAutomation.SellerDashboardData;

test('estimates card and SBP withdrawal with a 3% fee of at least 30 rubles', () => {
  assert.deepEqual(calculateWithdrawalEstimate(0), { fee: 0, net: 0 });
  assert.deepEqual(calculateWithdrawalEstimate(80), { fee: 30, net: 50 });
  assert.deepEqual(calculateWithdrawalEstimate(1000), { fee: 30, net: 970 });

  const largeWithdrawal = calculateWithdrawalEstimate(43298.97);
  assert.equal(largeWithdrawal.fee, 1298.9691);
  assert.ok(Math.abs(largeWithdrawal.net - 42000.0009) < 1e-9);
});

const orders = [
  order({
    id: 'A',
    title: '60 ПРОМПТОВ',
    category: 'Claude · Услуги',
    status: 'Оплачен',
    amount: 2,
    ageDays: 0
  }),
  order({
    id: 'B',
    title: '60 промптов',
    category: 'Gemini · Услуги',
    status: 'Закрыт',
    amount: 3,
    ageDays: 3
  }),
  order({
    id: 'C',
    title: '100 промптов',
    category: 'Claude · Услуги',
    status: 'Возврат',
    amount: 10,
    ageDays: 10
  }),
  order({
    id: 'D',
    title: 'Старый товар',
    category: 'ChatGPT · Прочее',
    status: 'Закрыт',
    amount: 20,
    ageDays: 40
  })
];

test('aggregates successful sales and refunds by the selected period', () => {
  const sevenDays = aggregateOrders(orders, {
    period: '7',
    grouping: 'combined'
  });
  const all = aggregateOrders(orders, {
    period: 'all',
    grouping: 'combined'
  });

  assert.equal(sevenDays.orderCount, 2);
  assert.equal(sevenDays.revenue, 5);
  assert.deepEqual(sevenDays.withdrawal, { fee: 30, net: 0 });
  assert.equal(sevenDays.average, 2.5);
  assert.equal(sevenDays.refundCount, 0);
  assert.equal(sevenDays.topProducts.length, 1);
  assert.equal(sevenDays.topProducts[0].count, 2);

  assert.equal(all.orderCount, 3);
  assert.equal(all.revenue, 25);
  assert.equal(all.refundCount, 1);
  assert.equal(all.refundAmount, 10);
});

test('supports combined and per-category product rankings', () => {
  const combined = aggregateOrders(orders, {
    period: 'all',
    grouping: 'combined'
  });
  const category = aggregateOrders(orders, {
    period: 'all',
    grouping: 'category'
  });

  assert.equal(combined.topProducts[0].count, 2);
  assert.equal(category.topProducts.filter(
    (product) => product.titleKey === normalizeProductTitle('60 промптов')
  ).length, 2);
});

test('maps successful sales back to an exact offer title and category', () => {
  const map = createOfferSalesMap(orders, '30');

  assert.deepEqual(
    map.get(`${normalizeProductTitle('60 промптов')}::claude услуги`),
    { count: 1, revenue: 2, currency: '₽' }
  );
  assert.equal(filterOrdersByPeriod(orders, '30').length, 3);
});

test('parses the singular FunPay relative date as one day', () => {
  const row = {
    href: 'https://funpay.com/orders/KM6B26A7/',
    querySelector(selector) {
      return {
        '.order-desc': {
          children: [{ classList: { contains: () => false }, textContent: 'Товар' }],
          querySelector: () => ({ textContent: 'Claude, Услуги' })
        },
        '.tc-order': { textContent: '#KM6B26A7' },
        '.tc-status': { textContent: 'Закрыт' },
        '.tc-seller-sum': {
          textContent: '2.00 ₽',
          querySelector: () => ({ textContent: '₽' })
        },
        '.tc-date-left': { textContent: 'день назад' },
        '.tc-date-time': { textContent: 'вчера, 14:07' }
      }[selector] || null;
    }
  };
  const document = {
    querySelectorAll() {
      return [row];
    }
  };

  const [parsed] = parseOrdersDocument(document);

  assert.equal(parsed.ageDays, 1);
  assert.equal(filterOrdersByPeriod([parsed], '7').length, 1);
});

function order({
  id,
  title,
  category,
  status,
  amount,
  ageDays
}) {
  return {
    id,
    title,
    titleKey: normalizeProductTitle(title),
    category,
    categoryKey: category
      .replace(' · ', ' ')
      .toLocaleLowerCase('ru')
      .split(/\s+/)
      .sort()
      .join(' '),
    status,
    statusKey: status.toLocaleLowerCase('ru'),
    amount,
    currency: '₽',
    ageDays
  };
}

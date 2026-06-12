import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/buyer-price-core.js');

const Core = globalThis.FunPayAutomation.BuyerPriceCore;

test('reads card and SBP ratios from the real FunPay buyer price rows', () => {
  const ratios = Core.readRatios([
    { label: 'Банковская карта RU', amount: '1255.32 ₽' },
    { label: 'Банковская карта RU', amount: '16.92 $' },
    { label: 'Банковская карта RU', amount: '14.69 €' },
    { label: 'СБП (оплата по QR)', amount: '1201.63 ₽' }
  ], 1000);

  assert.equal(ratios.card, 1.25532);
  assert.equal(ratios.sbp, 1.20163);
});

test('ignores foreign currencies and implausible stale calculations', () => {
  const ratios = Core.readRatios([
    { label: 'Банковская карта RU', amount: '16.92 $' },
    { label: 'СБП (оплата по QR)', amount: '1201.63 ₽' }
  ], 200);

  assert.deepEqual(ratios, { card: 0, sbp: 0 });
});

test('calculates the seller price from the requested buyer price', () => {
  assert.equal(Core.calculateSellerPrice(200, 1.25532), '159.32');
  assert.equal(Core.calculateSellerPrice('200,00 ₽', 1.20163), '166.44');
  assert.equal(Core.calculateSellerPrice('', 1.2), '');
});

test('parses Russian and international amount formatting', () => {
  assert.equal(Core.parseAmount('1 255,32 ₽'), 1255.32);
  assert.equal(Core.parseAmount('1,255.32 ₽'), 1255.32);
  assert.equal(Core.parseAmount('1.255,32 ₽'), 1255.32);
});

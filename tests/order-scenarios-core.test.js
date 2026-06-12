import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/order-scenarios-core.js');

const Core = globalThis.FunPayAutomation.OrderScenariosCore;

test('normalizes order scenario settings and removes unsupported values', () => {
  assert.deepEqual(Core.normalizeSettings({
    afterPaymentEnabled: 1,
    afterPaymentDelayMinutes: 5000,
    afterPaymentMessage: 'Спасибо',
    reviewRequestEnabled: true,
    reviewDelayHours: -5,
    reviewMessage: 'Отзыв',
    oncePerOrder: false
  }), {
    afterPaymentEnabled: true,
    afterPaymentDelayMinutes: 1440,
    afterPaymentMessage: 'Спасибо',
    reviewRequestEnabled: true,
    reviewDelayHours: 0,
    reviewMessage: 'Отзыв'
  });
});

test('keeps only the newest bounded order scenario state', () => {
  const orders = Object.fromEntries(
    Array.from({ length: 510 }, (_, index) => [
      `order-${index}`,
      { lastSeenAt: index, paymentDone: true }
    ])
  );
  const state = Core.normalizeState({ baselineDone: true, orders });

  assert.equal(state.baselineDone, true);
  assert.equal(Object.keys(state.orders).length, 500);
  assert.equal('order-509' in state.orders, true);
  assert.equal('order-0' in state.orders, false);
});

test('renders supported order scenario variables', () => {
  assert.equal(
    Core.renderText(
      'Привет, {buyername}. Заказ #{order}: {offername}.',
      {
        buyerName: ' Алексей ',
        offerName: ' Товар ',
        orderId: 'ABC123'
      }
    ),
    'Привет, Алексей. Заказ #ABC123: Товар.'
  );
});

test('accepts only same-origin order URLs', () => {
  assert.equal(
    Core.resolveSameOriginUrl('/orders/ABC123/', 'https://funpay.com'),
    'https://funpay.com/orders/ABC123/'
  );
  assert.equal(
    Core.resolveSameOriginUrl(
      'https://evil.example/orders/ABC123/',
      'https://funpay.com'
    ),
    null
  );
  assert.equal(Core.resolveSameOriginUrl('http://[', 'https://funpay.com'), null);
});

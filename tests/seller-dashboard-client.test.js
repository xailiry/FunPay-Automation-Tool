import assert from 'node:assert/strict';
import test from 'node:test';

let capturedMessage;
globalThis.location = { origin: 'https://funpay.com' };
globalThis.chrome = {
  storage: {
    local: {
      async get() {
        return {};
      },
      async set() {}
    }
  }
};
globalThis.FunPayAutomation = {
  Utils: {
    isLoginResponse() {
      return false;
    },
    normalizeMessage(value) {
      return typeof value === 'string' ? value : '';
    },
    async sendRuntimeMessage(message) {
      capturedMessage = message;
      return {
        ok: true,
        response: {
          ok: true,
          status: 200,
          url: 'https://funpay.com/offer/delete',
          text: '{"success":true}'
        }
      };
    },
    tryParseJson(value) {
      return JSON.parse(value);
    }
  }
};

await import('../content/seller-dashboard-client.js');

const { SellerDashboardClient } = globalThis.FunPayAutomation;

test('uses the official FunPay offer deletion payload', async () => {
  const client = new SellerDashboardClient();

  await client.deleteOffer({
    offerId: '69880658',
    csrfToken: 'csrf-token'
  });

  assert.equal(capturedMessage.action, 'requestFunPayPage');
  assert.equal(
    capturedMessage.request.url,
    'https://funpay.com/offer/delete'
  );
  assert.equal(capturedMessage.request.method, 'POST');
  assert.deepEqual(capturedMessage.request.entries, [
    ['csrf_token', 'csrf-token'],
    ['action', 'delete'],
    ['type', 'lot'],
    ['offer_id', '69880658']
  ]);
});

test('requests a bump through the client boundary', async () => {
  let message;
  const client = new SellerDashboardClient({
    messenger: async (nextMessage) => {
      message = nextMessage;
      return {
        ok: true,
        result: {
          status: 'completed',
          successCount: 2,
          skippedCount: 1,
          failedCount: 0
        }
      };
    }
  });

  const result = await client.triggerBump();

  assert.deepEqual(message, { action: 'triggerBumpNow' });
  assert.equal(result.successCount, 2);
});

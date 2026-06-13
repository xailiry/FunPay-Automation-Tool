import assert from 'node:assert/strict';
import test from 'node:test';

import { BumpService } from '../background/bump-service.js';

test('runs one bump operation at a time and stores its result', async () => {
  const writes = [];
  const notifications = [];
  let releaseHome;

  const homeGate = new Promise((resolve) => {
    releaseHome = resolve;
  });
  const client = {
    async getHomePage() {
      await homeGate;
      return { text: '<a href="/users/10/">User</a>' };
    },
    async getProfilePage() {
      return { text: '<a href="/lots/20/">Category</a>' };
    },
    async getCategoryPage() {
      return { text: '<div data-game="30"></div>' };
    },
    async raiseCategory() {
      return { json: { success: true, message: 'Raised' } };
    }
  };
  const service = new BumpService({
    client,
    storage: {
      async set(value) {
        writes.push(value);
      }
    },
    notify: async (title, message) => {
      notifications.push({ title, message });
    },
    wait: async () => {},
    now: () => 100
  });

  const firstRun = service.run();
  const secondRun = service.run();

  assert.equal(firstRun, secondRun);
  assert.equal(service.isRunning, true);

  releaseHome();
  const result = await firstRun;

  assert.equal(result.successCount, 1);
  assert.equal(result.failedCount, 0);
  assert.equal(service.isRunning, false);
  assert.equal(writes.length, 2);
  assert.equal(notifications.length, 1);
});

test('confirms the FunPay category modal and raises instead of looping', async () => {
  const raiseCalls = [];
  const client = {
    async getHomePage() {
      return { text: '<a href="/users/10/">User</a>' };
    },
    async getProfilePage() {
      return { text: '<a href="/lots/2046/">Category</a>' };
    },
    async getCategoryPage() {
      return { text: '<div data-game="158"></div>' };
    },
    async raiseCategory(gameId, nodeId, nodeIds = []) {
      raiseCalls.push({ gameId, nodeId, nodeIds });
      if (nodeIds.length === 0) {
        return {
          json: {
            modal:
              '<div class="raise-box">' +
              '<input type="checkbox" value="453">' +
              '<input type="checkbox" value="2046" checked></div>'
          }
        };
      }
      return { json: { error: 1, msg: 'Подождите 4 часа.' } };
    }
  };
  const service = new BumpService({
    client,
    storage: { async set() {} },
    notify: async () => {},
    wait: async () => {},
    now: () => 100
  });

  const result = await service.run();

  assert.equal(result.successCount, 1);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.failedCount, 0);
  assert.equal(raiseCalls.length, 2);
  assert.deepEqual(raiseCalls[0].nodeIds, []);
  // Only the pre-checked category is confirmed, as node_ids[].
  assert.deepEqual(raiseCalls[1].nodeIds, ['2046']);
});

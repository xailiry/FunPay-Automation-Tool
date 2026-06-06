import assert from 'node:assert/strict';
import test from 'node:test';

import { CategoryService } from '../background/category-service.js';

test('returns fresh category cache without a network request', async () => {
  let requestCount = 0;
  const service = new CategoryService({
    client: {
      async getHomePage() {
        requestCount += 1;
        return { text: '' };
      }
    },
    storage: {
      async get() {
        return {
          funpayCategories: [{ id: '1', name: 'Cached' }],
          funpayCategoriesUpdatedAt: 9_000
        };
      }
    },
    now: () => 10_000
  });

  const result = await service.getCategories();

  assert.equal(result.fromCache, true);
  assert.equal(requestCount, 0);
});

test('refreshes and stores stale categories', async () => {
  const writes = [];
  const service = new CategoryService({
    client: {
      async getHomePage() {
        return { text: '<a href="/lots/1/">Fresh</a>' };
      }
    },
    storage: {
      async get() {
        return {};
      },
      async set(value) {
        writes.push(value);
      }
    },
    now: () => 20_000
  });

  const result = await service.getCategories();

  assert.equal(result.fromCache, false);
  assert.deepEqual(result.categories, [{ id: '1', name: 'Fresh' }]);
  assert.equal(writes.length, 1);
});

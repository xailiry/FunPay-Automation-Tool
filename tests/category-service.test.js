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
          funpayCategories: [{
            id: '1',
            game: 'Cached',
            section: 'Услуги',
            name: 'Cached · Услуги'
          }],
          funpayCategoriesUpdatedAt: 9_000,
          funpayCategoriesVersion: 2
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
        return {
          text: `
            <div class="promo-game-item">
              <div class="game-title"><a href="/lots/1/">Fresh</a></div>
              <ul><li><a href="/lots/1/">Услуги</a></li></ul>
            </div>
          `
        };
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
  assert.deepEqual(result.categories, [{
    id: '1',
    game: 'Fresh',
    section: 'Услуги',
    name: 'Fresh · Услуги'
  }]);
  assert.equal(writes.length, 1);
});

test('invalidates category cache from the old ungrouped format', async () => {
  let requestCount = 0;
  const service = new CategoryService({
    client: {
      async getHomePage() {
        requestCount += 1;
        return {
          text: `
            <div class="promo-game-item">
              <div class="game-title"><a href="/lots/1/">Gemini</a></div>
              <ul><li><a href="/lots/2/">Услуги</a></li></ul>
            </div>
          `
        };
      }
    },
    storage: {
      async get() {
        return {
          funpayCategories: [{ id: '2', name: 'Услуги' }],
          funpayCategoriesUpdatedAt: 9_000,
          funpayCategoriesVersion: 1
        };
      },
      async set() {}
    },
    now: () => 10_000
  });

  const result = await service.getCategories();

  assert.equal(result.fromCache, false);
  assert.equal(requestCount, 1);
});

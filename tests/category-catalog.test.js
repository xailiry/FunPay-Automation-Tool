import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/category-catalog.js');

const { CategoryCatalog, parseCategoryCatalog } =
  globalThis.FunPayAutomation;

test('parses grouped categories from compact FunPay markup', () => {
  const html = `
    <div class="promo-game-item"><div class="game-title" data-id="853"><a href="https://funpay.com/lots/3478/">Gemini</a></div><ul class="list-inline" data-id="853"><li><a href="https://funpay.com/lots/3478/">Аккаунты</a></li> <li><a href="https://funpay.com/lots/4093/?from=home">Услуги</a></li></ul></div>
    <div class="promo-game-item"><div class="game-title" data-id="760"><a href="https://funpay.com/lots/3172/">Claude &amp; AI</a></div><ul class="list-inline" data-id="760"><li><a href="https://funpay.com/lots/4234/"><span>Токены&nbsp;Pro</span></a></li></ul></div>
  `;

  assert.deepEqual(parseCategoryCatalog(html), [
    {
      id: '4234',
      game: 'Claude & AI',
      section: 'Токены Pro',
      name: 'Claude & AI · Токены Pro'
    },
    {
      id: '3478',
      game: 'Gemini',
      section: 'Аккаунты',
      name: 'Gemini · Аккаунты'
    },
    {
      id: '4093',
      game: 'Gemini',
      section: 'Услуги',
      name: 'Gemini · Услуги'
    }
  ]);
});

test('returns a fresh cache without requesting FunPay', async () => {
  let requestCount = 0;
  const categories = createCategories(2);
  const catalog = new CategoryCatalog({
    loadHtmlImplementation: async () => {
      requestCount += 1;
      throw new Error('Unexpected request');
    },
    storage: createStorage({
      funpayCategories: categories,
      funpayCategoriesUpdatedAt: 9_000,
      funpayCategoriesVersion: 4
    }),
    now: () => 10_000,
    minimumCategoryCount: 2
  });

  assert.deepEqual(await catalog.getCategories(), categories);
  assert.equal(requestCount, 0);
});

test('loads categories through the current FunPay origin and caches them', async () => {
  const storage = createStorage({});
  let requestedUrl;
  const catalog = new CategoryCatalog({
    loadHtmlImplementation: async (url) => {
      requestedUrl = url.toString();
      return createCatalogHtml();
    },
    storage,
    origin: 'https://funpay.com/lots/1356/trade',
    now: () => 20_000,
    minimumCategoryCount: 2
  });

  const categories = await catalog.getCategories();

  assert.equal(requestedUrl, 'https://funpay.com/');
  assert.equal(categories.length, 2);
  assert.equal(storage.values.funpayCategoriesVersion, 4);
  assert.equal(storage.values.funpayCategoriesUpdatedAt, 20_000);
});

test('uses the last valid cache when a forced refresh cannot reach FunPay', async () => {
  const categories = createCategories(2);
  const catalog = new CategoryCatalog({
    loadHtmlImplementation: async () => {
      throw new Error('Network down');
    },
    storage: createStorage({
      funpayCategories: categories,
      funpayCategoriesUpdatedAt: 1,
      funpayCategoriesVersion: 3
    }),
    minimumCategoryCount: 2
  });

  assert.deepEqual(await catalog.getCategories(true), categories);
});

function createCatalogHtml() {
  return `
    <div class="game-title"><a href="/lots/1/">Gemini</a></div>
    <ul>
      <li><a href="/lots/2/">Услуги</a></li>
      <li><a href="/lots/3/">Подписка</a></li>
    </ul>
  `;
}

function createCategories(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    game: `Game ${index + 1}`,
    section: 'Услуги',
    name: `Game ${index + 1} · Услуги`
  }));
}

function createStorage(initialValues) {
  return {
    values: { ...initialValues },
    async get(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => key in this.values)
          .map((key) => [key, this.values[key]])
      );
    },
    async set(values) {
      Object.assign(this.values, values);
    }
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';

import { PageCategoryLoader } from '../background/category-loader.js';

test('loads catalog HTML in the main world of the current FunPay tab', async () => {
  let options;
  const loader = new PageCategoryLoader({
    async executeScript(nextOptions) {
      options = nextOptions;
      return [{ result: '<html>catalog</html>' }];
    }
  });

  const result = await loader.load(
    { url: 'https://funpay.com/' },
    {
      url: 'https://funpay.com/lots/1356/trade',
      tab: { id: 42 }
    }
  );

  assert.deepEqual(result, { html: '<html>catalog</html>' });
  assert.deepEqual(options.target, { tabId: 42 });
  assert.equal(options.world, 'MAIN');
  assert.deepEqual(options.args, ['https://funpay.com/']);
});

test('rejects requests outside the sender FunPay origin', async () => {
  const loader = new PageCategoryLoader({
    async executeScript() {
      throw new Error('Should not execute');
    }
  });

  await assert.rejects(
    loader.load(
      { url: 'https://example.com/' },
      {
        url: 'https://funpay.com/lots/1356/trade',
        tab: { id: 42 }
      }
    ),
    /Недопустимый адрес каталога/
  );

  await assert.rejects(
    loader.load(
      { url: 'https://funpay.com/' },
      {
        url: 'https://example.com/',
        tab: { id: 42 }
      }
    ),
    /только из открытой вкладки FunPay/
  );
});

test('rejects an empty scripting result', async () => {
  const loader = new PageCategoryLoader({
    async executeScript() {
      return [{}];
    }
  });

  await assert.rejects(
    loader.load(
      { url: 'https://funpay.com/' },
      {
        url: 'https://funpay.com/lots/1356/trade',
        tab: { id: 42 }
      }
    ),
    /не вернул HTML/
  );
});

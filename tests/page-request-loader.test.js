import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PageRequestLoader,
  performPageRequest
} from '../background/page-request-loader.js';

test('runs an allowed FunPay request in the main world of the current tab', async () => {
  let options;
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(nextOptions) {
        options = nextOptions;
        return [{
          result: {
            ok: true,
            status: 200,
            url: 'https://funpay.com/',
            text: '<html>catalog</html>'
          }
        }];
      }
    },
    tabs: createTabs()
  });

  const result = await loader.request(
    {
      request: {
        url: 'https://funpay.com/',
        method: 'GET'
      }
    },
    {
      url: 'https://funpay.com/lots/1356/trade',
      tab: { id: 42 }
    }
  );

  assert.equal(result.text, '<html>catalog</html>');
  assert.deepEqual(options.target, { tabId: 42 });
  assert.equal(options.world, 'MAIN');
  assert.equal(options.args[0].url, 'https://funpay.com/');
  assert.equal(options.args[0].method, 'GET');
});

test('rejects requests outside the sender FunPay origin', async () => {
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript() {
        throw new Error('Should not execute');
      }
    },
    tabs: createTabs()
  });

  await assert.rejects(
    loader.request(
      { request: { url: 'https://example.com/', method: 'GET' } },
      {
        url: 'https://funpay.com/lots/1356/trade',
        tab: { id: 42 }
      }
    ),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request(
      { request: { url: 'https://funpay.com/', method: 'GET' } },
      {
        url: 'https://example.com/',
        tab: { id: 42 }
      }
    ),
    /только из открытой вкладки FunPay/
  );
});

test('allows target form GET and offerSave POST only', async () => {
  const requests = [];
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(options) {
        requests.push(options.args?.[0] || { url: 'document-navigation' });
        return [{
          result: {
            ok: true,
            status: 200,
            url: options.args?.[0]?.url || 'https://funpay.com/lots/4093/trade',
            text: '{}'
          }
        }];
      }
    },
    tabs: createTabs()
  });
  const sender = {
    url: 'https://funpay.com/lots/1356/trade',
    tab: { id: 42 }
  };

  await loader.request({
    request: {
      url: 'https://funpay.com/lots/4093/trade',
      method: 'GET'
    }
  }, sender);
  await loader.request({
    request: {
      url: 'https://funpay.com/lots/offerSave',
      method: 'POST',
      entries: [['node_id', '4093']]
    }
  }, sender);

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[1].entries, [['node_id', '4093']]);

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/account/logout',
        method: 'POST'
      }
    }, sender),
    /Недопустимый запрос/
  );
});

test('rejects an empty scripting result', async () => {
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript() {
        return [{}];
      }
    },
    tabs: createTabs()
  });

  await assert.rejects(
    loader.request(
      { request: { url: 'https://funpay.com/', method: 'GET' } },
      {
        url: 'https://funpay.com/lots/1356/trade',
        tab: { id: 42 }
      }
    ),
    /не вернул ответ/
  );
});

test('loads target form through an inactive document tab and closes it', async () => {
  const removed = [];
  const tabs = createTabs({
    createdTab: { id: 77, status: 'complete' },
    onRemove(tabId) {
      removed.push(tabId);
    }
  });
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(options) {
        assert.deepEqual(options.target, { tabId: 77 });
        assert.equal(options.world, 'MAIN');
        return [{
          result: {
            ok: true,
            status: 200,
            url: 'https://funpay.com/lots/offerEdit?node=4093',
            text: '<form action="/lots/offerSave"></form>'
          }
        }];
      }
    },
    tabs
  });

  const result = await loader.request({
    request: {
      url: 'https://funpay.com/lots/4093/trade',
      method: 'GET'
    }
  }, {
    url: 'https://funpay.com/lots/1356/trade',
    tab: { id: 42 }
  });

  assert.match(result.text, /offerSave/);
  assert.deepEqual(removed, [77]);
});

test('rebuilds FormData for a page-context POST request', async () => {
  const originalFetch = globalThis.fetch;
  let captured;

  globalThis.fetch = async (url, options) => {
    captured = {
      url,
      method: options.method,
      headers: options.headers,
      entries: [...options.body.entries()]
    };

    return {
      ok: true,
      status: 200,
      url: 'https://funpay.com/lots/offerSave',
      async text() {
        return '{"success":true}';
      }
    };
  };

  try {
    const result = await performPageRequest({
      url: 'https://funpay.com/lots/offerSave',
      method: 'POST',
      entries: [
        ['node_id', '4093'],
        ['deactivate_after_sale', '0'],
        ['deactivate_after_sale', '1']
      ],
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    });

    assert.deepEqual(captured.entries, [
      ['node_id', '4093'],
      ['deactivate_after_sale', '0'],
      ['deactivate_after_sale', '1']
    ]);
    assert.equal(captured.method, 'POST');
    assert.equal(result.text, '{"success":true}');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function createTabs({
  createdTab = { id: 77, status: 'complete' },
  onRemove = () => {}
} = {}) {
  return {
    async create() {
      return createdTab;
    },
    async get() {
      return createdTab;
    },
    async remove(tabId) {
      onRemove(tabId);
    },
    onUpdated: createEvent(),
    onRemoved: createEvent()
  };
}

function createEvent() {
  return {
    addListener() {},
    removeListener() {}
  };
}

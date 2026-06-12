import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import {
  PageRequestLoader,
  performOfferDeletion,
  performPageRequest
} from '../background/page-request-loader.js';

test('offer deletion function submits the verified editor form contract', async () => {
  let capturedRequest;
  const fields = {
    offer_id: { value: '70464942' },
    node_id: { value: '1356' },
    deleted: { value: '' }
  };
  const form = {
    getAttribute(name) {
      return name === 'action' ? '/lots/offerSave' : null;
    },
    querySelector(selector) {
      return fields[selector.match(/name="([^"]+)"/)?.[1]] || null;
    }
  };
  const serializedForm = {
    csrf_token: 'live-form-token',
    form_created_at: '1780841398',
    offer_id: '70464942',
    node_id: '1356',
    location: '',
    deleted: '1',
    'fields[summary][ru]': 'Тестовое объявление',
    price: '99999',
    amount: '999',
    active: 'on'
  };
  const pageJquery = (target) => {
    assert.equal(target, form);
    return {
      serializeObject() {
        assert.equal(fields.deleted.value, '1');
        return serializedForm;
      }
    };
  };
  pageJquery.ajax = (options) => {
    capturedRequest = options;
    options.success(
      { done: true },
      'success',
      {
        status: 200,
        responseURL: 'https://funpay.com/lots/offerSave'
      }
    );
  };
  const contextFunction = vm.runInNewContext(
    `(${performOfferDeletion.toString()})`,
    {
      Promise,
      URL,
      location: { origin: 'https://funpay.com' },
      document: {
        querySelector() {
          return form;
        }
      },
      globalThis: {
        app: {
          processRoute(route) {
            return route;
          }
        },
        jQuery: pageJquery
      }
    }
  );

  const result = await contextFunction({
    offerId: '70464942',
    nodeId: '1356'
  });

  assert.equal(capturedRequest.type, 'POST');
  assert.equal(capturedRequest.url, 'https://funpay.com/lots/offerSave');
  assert.equal(capturedRequest.dataType, 'json');
  assert.equal(capturedRequest.data, serializedForm);
  assert.equal(JSON.parse(result.text).done, true);
  assert.equal(result.status, 200);
});

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

test('forwards only headers required by verified FunPay requests', async () => {
  let options;
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(nextOptions) {
        options = nextOptions;
        return [{
          result: {
            ok: true,
            status: 200,
            url: 'https://funpay.com/lots/offerSave',
            text: '{}'
          }
        }];
      }
    },
    tabs: createTabs()
  });

  await loader.request({
    request: {
      url: 'https://funpay.com/lots/offerSave',
      method: 'POST',
      entries: [['node_id', '4093']],
      headers: {
        accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        authorization: 'must-not-cross-the-boundary',
        cookie: 'must-not-cross-the-boundary'
      }
    }
  }, {
    url: 'https://funpay.com/lots/1356/trade',
    tab: { id: 42 }
  });

  assert.deepEqual(options.args[0].headers, {
    accept: 'application/json',
    'x-requested-with': 'XMLHttpRequest'
  });
});

test('allows the exact extension GET and POST routes only', async () => {
  const requests = [];
  const openedUrls = [];
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(options) {
        requests.push(options.args?.[0] || { url: 'document-navigation' });
        return [{
          result: {
            ok: true,
            status: 200,
            url: options.args?.[0]?.url || 'https://funpay.com/lots/offerEdit?node=4187',
            text: '{}'
          }
        }];
      }
    },
    tabs: createTabs({
      onCreate(options) {
        openedUrls.push(options.url);
      }
    })
  });
  const sender = {
    url: 'https://funpay.com/lots/1356/trade',
    tab: { id: 42 }
  };

  await loader.request({
    request: {
      url: 'https://funpay.com/lots/offerEdit?node=4187',
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
  await loader.request({
    request: {
      url: 'https://funpay.com/orders/trade',
      method: 'GET'
    }
  }, sender);

  assert.equal(requests.length, 3);
  assert.deepEqual(openedUrls, ['https://funpay.com/lots/offerEdit?node=4187']);
  assert.deepEqual(requests[1].entries, [['node_id', '4093']]);
  assert.equal(requests[2].url, 'https://funpay.com/orders/trade');

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/lots/offerEdit?node=not-a-number',
        method: 'GET'
      }
    }, sender),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/lots/4093/trade',
        method: 'GET'
      }
    }, sender),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/account/logout',
        method: 'POST'
      }
    }, sender),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/offer/delete',
        method: 'POST'
      }
    }, sender),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/lots/offerEdit?node=4187&offer=bad',
        method: 'GET'
      }
    }, sender),
    /Недопустимый запрос/
  );

  await assert.rejects(
    loader.request({
      request: {
        url: 'https://funpay.com/lots/offerEdit?node=4187&debug=1',
        method: 'GET'
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
    onCreate(options) {
      assert.equal(options.url, 'https://funpay.com/lots/offerEdit?node=4187');
      assert.equal(options.active, false);
    },
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
      url: 'https://funpay.com/lots/offerEdit?node=4187',
      method: 'GET'
    }
  }, {
    url: 'https://funpay.com/lots/1356/trade',
    tab: { id: 42 }
  });

  assert.match(result.text, /offerSave/);
  assert.deepEqual(removed, [77]);
});

test('deletes an offer inside its verified editor tab and closes it', async () => {
  const removed = [];
  let executionOptions;
  const tabs = createTabs({
    createdTab: { id: 77, status: 'complete' },
    onCreate(options) {
      assert.equal(
        options.url,
        'https://funpay.com/lots/offerEdit?node=1356&offer=70464942'
      );
      assert.equal(options.active, false);
    },
    onRemove(tabId) {
      removed.push(tabId);
    }
  });
  const loader = new PageRequestLoader({
    scripting: {
      async executeScript(options) {
        executionOptions = options;
        return [{
          result: {
            ok: true,
            status: 200,
            url: 'https://funpay.com/lots/offerSave',
            text: '{"done":true}'
          }
        }];
      }
    },
    tabs
  });

  const result = await loader.deleteOffer({
    offerId: '70464942',
    nodeId: '1356'
  }, {
    url: 'https://funpay.com/users/11360744/',
    tab: { id: 42 }
  });

  assert.deepEqual(executionOptions.target, { tabId: 77 });
  assert.equal(executionOptions.world, 'MAIN');
  assert.equal(executionOptions.func, performOfferDeletion);
  assert.deepEqual(executionOptions.args, [{
    offerId: '70464942',
    nodeId: '1356'
  }]);
  assert.equal(result.status, 200);
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
  onCreate = () => {},
  onRemove = () => {}
} = {}) {
  return {
    async create(options) {
      onCreate(options);
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

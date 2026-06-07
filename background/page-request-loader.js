export class PageRequestLoader {
  constructor({ scripting, tabs, timeoutMs = 20_000 }) {
    this.scripting = scripting;
    this.tabs = tabs;
    this.timeoutMs = timeoutMs;
  }

  async request(message, sender) {
    const tabId = sender.tab?.id;
    const pageUrl = parseUrl(sender.url);
    const requestedUrl = parseUrl(message.request?.url);
    const method = String(message.request?.method || 'GET').toUpperCase();

    if (!tabId || !isFunPayHost(pageUrl?.hostname)) {
      throw new Error('Запрос можно выполнить только из открытой вкладки FunPay.');
    }

    if (
      !requestedUrl ||
      requestedUrl.origin !== pageUrl.origin ||
      !isAllowedRequest(method, requestedUrl)
    ) {
      throw new Error('Недопустимый запрос к FunPay.');
    }

    if (method === 'GET' && isOfferEditorUrl(requestedUrl)) {
      return this.loadDocument(requestedUrl.toString());
    }

    const [execution] = await this.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: performPageRequest,
      args: [{
        url: requestedUrl.toString(),
        method,
        entries: normalizeEntries(message.request?.entries),
        headers: normalizeHeaders(message.request?.headers)
      }]
    });

    if (
      !execution?.result ||
      typeof execution.result.text !== 'string' ||
      typeof execution.result.status !== 'number'
    ) {
      throw new Error('FunPay не вернул ответ.');
    }

    return execution.result;
  }

  async deleteOffer(message, sender) {
    const pageUrl = parseUrl(sender.url);
    const offerId = String(message.offerId || '');
    const nodeId = String(message.nodeId || '');

    if (!sender.tab?.id || !isFunPayHost(pageUrl?.hostname)) {
      throw new Error('Удаление можно выполнить только из открытой вкладки FunPay.');
    }
    if (!/^\d+$/.test(offerId) || !/^\d+$/.test(nodeId)) {
      throw new Error('Некорректные данные объявления.');
    }

    const editorUrl = new URL('/lots/offerEdit', pageUrl.origin);
    editorUrl.searchParams.set('node', nodeId);
    editorUrl.searchParams.set('offer', offerId);
    const result = await this.runInDocument(
      editorUrl.toString(),
      performOfferDeletion,
      [{ offerId, nodeId }]
    );

    if (
      !result ||
      typeof result.text !== 'string' ||
      typeof result.status !== 'number'
    ) {
      throw new Error('FunPay не вернул результат удаления.');
    }

    return result;
  }

  async loadDocument(url) {
    const result = await this.runInDocument(url, readCurrentDocument);
    if (
      !result ||
      typeof result.text !== 'string' ||
      typeof result.url !== 'string'
    ) {
      throw new Error('FunPay не вернул документ целевой формы.');
    }
    return result;
  }

  async runInDocument(url, func, args = []) {
    const tab = await this.tabs.create({
      url,
      active: false
    });

    if (!tab.id) {
      throw new Error('Chrome не создал вкладку целевой формы.');
    }

    try {
      await this.waitForTab(tab.id);
      const [execution] = await this.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func,
        args
      });
      return execution.result;
    } finally {
      await this.tabs.remove(tab.id).catch(() => {});
    }
  }

  async waitForTab(tabId) {
    const current = await this.tabs.get(tabId);
    if (current.status === 'complete') return;

    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Загрузка формы FunPay превысила время ожидания.'));
      }, this.timeoutMs);
      const onUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
        cleanup();
        resolve();
      };
      const onRemoved = (removedTabId) => {
        if (removedTabId !== tabId) return;
        cleanup();
        reject(new Error('Вкладка целевой формы была закрыта.'));
      };
      const cleanup = () => {
        clearTimeout(timeoutId);
        this.tabs.onUpdated.removeListener(onUpdated);
        this.tabs.onRemoved.removeListener(onRemoved);
      };

      this.tabs.onUpdated.addListener(onUpdated);
      this.tabs.onRemoved.addListener(onRemoved);
    });
  }
}

export async function performPageRequest(request) {
  const options = {
    method: request.method,
    credentials: 'include',
    cache: 'no-store'
  };

  if (request.headers && Object.keys(request.headers).length > 0) {
    options.headers = request.headers;
  }

  if (request.method !== 'GET') {
    const formData = new FormData();
    for (const [name, value] of request.entries || []) {
      formData.append(name, value);
    }
    options.body = formData;
  }

  const response = await fetch(request.url, options);
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    text
  };
}

export async function performOfferDeletion({ offerId, nodeId }) {
  const form =
    document.querySelector('form.form-offer-editor') ||
    document.querySelector('form[action*="offerSave"]');
  const formOfferId = form?.querySelector('[name="offer_id"]')?.value;
  const formNodeId = form?.querySelector('[name="node_id"]')?.value;
  const deleted = form?.querySelector('[name="deleted"]');
  const jquery = globalThis.jQuery;
  const appApi = globalThis.app;

  if (!form || String(formOfferId || '') !== String(offerId)) {
    throw new Error('FunPay открыл форму другого объявления.');
  }
  if (String(formNodeId || '') !== String(nodeId)) {
    throw new Error('FunPay открыл форму другой категории.');
  }
  if (!deleted) {
    throw new Error('В форме FunPay нет признака удаления.');
  }
  if (!jquery?.ajax || !jquery(form)?.serializeObject || !appApi?.processRoute) {
    throw new Error('Нативный редактор FunPay недоступен.');
  }

  const action = new URL(
    appApi.processRoute(form.getAttribute('action')),
    location.origin
  );
  if (
    action.origin !== location.origin ||
    !/^\/lots\/offerSave\/?$/.test(action.pathname)
  ) {
    throw new Error('Форма FunPay ведёт на неожиданный адрес.');
  }

  deleted.value = '1';
  const data = jquery(form).serializeObject();

  return new Promise((resolve) => {
    jquery.ajax({
      type: 'POST',
      url: action.toString(),
      data,
      dataType: 'json',
      success(response, _status, xhr) {
        resolve({
          ok: true,
          status: xhr?.status || 200,
          url: xhr?.responseURL || action.toString(),
          text: typeof response === 'string'
            ? response
            : JSON.stringify(response ?? {})
        });
      },
      error(xhr) {
        resolve({
          ok: false,
          status: xhr?.status || 0,
          url: xhr?.responseURL || action.toString(),
          text: xhr?.responseText || ''
        });
      }
    });
  });
}

export function readCurrentDocument() {
  return {
    ok: true,
    status: 200,
    url: location.href,
    text: document.documentElement.outerHTML
  };
}

function isAllowedRequest(method, url) {
  if (method === 'GET') {
    return (
      url.pathname === '/' ||
      /^\/orders\/trade\/?$/.test(url.pathname) ||
      isOfferEditorUrl(url)
    );
  }

  return (
    method === 'POST' &&
    /^\/lots\/offerSave\/?$/.test(url.pathname)
  );
}

function isOfferEditorUrl(url) {
  if (!/^\/lots\/offerEdit\/?$/.test(url.pathname)) return false;
  if (!/^\d+$/.test(url.searchParams.get('node') || '')) return false;

  const offerId = url.searchParams.get('offer');
  if (offerId !== null && !/^\d+$/.test(offerId)) return false;

  return [...url.searchParams.keys()].every(
    (key) => key === 'node' || key === 'offer'
  );
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .filter((entry) =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'string'
    )
    .map(([name, value]) => [name, value]);
}

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};

  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name, value]) =>
        typeof name === 'string' && typeof value === 'string'
      )
      .map(([name, value]) => [name.toLowerCase(), value])
  );
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isFunPayHost(hostname) {
  return hostname === 'funpay.com' || hostname?.endsWith('.funpay.com');
}

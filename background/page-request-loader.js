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

  async loadDocument(url) {
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
        func: readCurrentDocument
      });

      if (
        !execution?.result ||
        typeof execution.result.text !== 'string' ||
        typeof execution.result.url !== 'string'
      ) {
        throw new Error('FunPay не вернул документ целевой формы.');
      }

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
    return url.pathname === '/' || isOfferEditorUrl(url);
  }

  return method === 'POST' && /^\/lots\/offerSave\/?$/.test(url.pathname);
}

function isOfferEditorUrl(url) {
  return (
    /^\/lots\/offerEdit\/?$/.test(url.pathname) &&
    /^\d+$/.test(url.searchParams.get('node') || '')
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

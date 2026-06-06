export class PageRequestLoader {
  constructor(scripting) {
    this.scripting = scripting;
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
      !isAllowedRequest(method, requestedUrl.pathname)
    ) {
      throw new Error('Недопустимый запрос к FunPay.');
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

function isAllowedRequest(method, pathname) {
  if (method === 'GET') {
    return pathname === '/' || /^\/lots\/\d+\/trade\/?$/.test(pathname);
  }

  return method === 'POST' && /^\/lots\/offerSave\/?$/.test(pathname);
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

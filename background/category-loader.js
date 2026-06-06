export class PageCategoryLoader {
  constructor(scripting) {
    this.scripting = scripting;
  }

  async load(message, sender) {
    const tabId = sender.tab?.id;
    const pageUrl = parseUrl(sender.url);
    const requestedUrl = parseUrl(message.url);

    if (!tabId || !isFunPayHost(pageUrl?.hostname)) {
      throw new Error('Каталог можно загрузить только из открытой вкладки FunPay.');
    }

    if (
      !requestedUrl ||
      requestedUrl.origin !== pageUrl.origin ||
      requestedUrl.pathname !== '/'
    ) {
      throw new Error('Недопустимый адрес каталога.');
    }

    const [execution] = await this.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: fetchCatalogHtml,
      args: [requestedUrl.toString()]
    });

    if (typeof execution?.result !== 'string') {
      throw new Error('FunPay не вернул HTML каталога.');
    }

    return { html: execution.result };
  }
}

export async function fetchCatalogHtml(url) {
  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
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

(() => {
  const namespace = globalThis.FunPayAutomation ||= {};
  const SUCCESS_STATUSES = new Set(['оплачен', 'закрыт', 'paid', 'closed']);
  const REFUND_STATUSES = new Set(['возврат', 'refund', 'refunded']);

  namespace.SellerDashboardData = Object.freeze({
    aggregateOrders,
    collectProfile,
    createOfferSalesMap,
    filterOrdersByPeriod,
    normalizeProductTitle,
    parseOrdersDocument,
    readAppData
  });

  function collectProfile(document) {
    const appData = readAppData(document);
    const profileUserId = document.location?.pathname
      ?.match(/^\/users\/(\d+)\/?/)?.[1] || null;
    const groups = [...document.querySelectorAll('.profile-data-container .offer')]
      .map(parseOfferGroup)
      .filter((group) => group.nodeId && group.offers.length > 0);
    const offersSection =
      groups[0]?.element.parentElement ||
      document.querySelector('.profile-data-container');
    const isOwnProfile = Boolean(
      profileUserId && String(appData.userId || '') === profileUserId
    );

    return {
      appData,
      csrfToken: appData['csrf-token'] || '',
      currentUserId: String(appData.userId || ''),
      profileUserId,
      isOwnProfile,
      groups,
      offersSection
    };
  }

  function parseOfferGroup(element) {
    const categoryLink = element.querySelector(
      '.offer-list-title h3 a[href*="/lots/"]'
    );
    const nodeId = categoryLink?.href.match(/\/lots\/(\d+)/)?.[1] || null;
    const title = cleanText(categoryLink?.textContent);
    const table = element.querySelector('.showcase-table');
    const offers = [...(table?.querySelectorAll(':scope > a.tc-item') || [])]
      .map((row) => parseProfileOffer(row, nodeId, title))
      .filter((offer) => offer.offerId);

    return {
      nodeId,
      title,
      categoryKey: normalizeCategory(title),
      element,
      table,
      offers
    };
  }

  function parseProfileOffer(element, nodeId, categoryTitle) {
    const href = element.href || '';
    const offerId =
      element.dataset.offer ||
      new URL(href, location.origin).searchParams.get('id') ||
      new URL(href, location.origin).searchParams.get('offer');
    const priceElement = element.querySelector('.tc-price');

    return {
      offerId,
      nodeId,
      categoryTitle,
      categoryKey: normalizeCategory(categoryTitle),
      title: cleanText(element.querySelector('.tc-desc-text')?.textContent),
      titleKey: normalizeProductTitle(
        element.querySelector('.tc-desc-text')?.textContent
      ),
      price: parseNumber(priceElement?.dataset.s || priceElement?.textContent),
      currency: cleanText(priceElement?.querySelector('.unit')?.textContent),
      autoDelivery: Boolean(element.querySelector('.auto-dlv-icon')),
      publicUrl: href,
      editUrl: new URL(
        `/lots/offerEdit?node=${encodeURIComponent(nodeId)}&offer=${encodeURIComponent(offerId)}`,
        location.origin
      ).toString(),
      active: true,
      element,
      wrapper: null,
      salesElement: null
    };
  }

  function parseOrdersDocument(document) {
    return [...document.querySelectorAll('.orders-table > a.tc-item, .dyn-table-body > a.tc-item')]
      .map(parseOrder)
      .filter((order) => order.id && order.title);
  }

  function parseOrder(row) {
    const description = row.querySelector('.order-desc');
    const titleElement = [...(description?.children || [])].find(
      (element) => !element.classList.contains('text-muted')
    );
    const categoryText = cleanText(
      description?.querySelector('.text-muted')?.textContent
    );
    const status = cleanText(row.querySelector('.tc-status')?.textContent);
    const amountElement =
      row.querySelector('.tc-seller-sum') ||
      row.querySelector('.tc-price');

    return {
      id: cleanText(row.querySelector('.tc-order')?.textContent).replace(/^#/, ''),
      title: cleanText(titleElement?.textContent),
      titleKey: normalizeProductTitle(titleElement?.textContent),
      category: normalizeSalesCategory(categoryText),
      categoryKey: normalizeCategory(categoryText),
      status,
      statusKey: status.toLocaleLowerCase('ru'),
      amount: parseNumber(amountElement?.textContent),
      currency: cleanText(amountElement?.querySelector('.unit')?.textContent),
      ageDays: parseAgeDays(
        row.querySelector('.tc-date-left')?.textContent,
        row.querySelector('.tc-date-time')?.textContent
      ),
      dateLabel: cleanText(row.querySelector('.tc-date-time')?.textContent),
      url: row.href
    };
  }

  function aggregateOrders(orders, { period = 'all', grouping = 'combined' } = {}) {
    const periodOrders = filterOrdersByPeriod(orders, period);
    const successful = periodOrders.filter(isSuccessfulOrder);
    const refunds = periodOrders.filter(isRefundOrder);
    const currency = successful[0]?.currency || refunds[0]?.currency || '₽';
    const revenue = sum(successful.map((order) => order.amount));
    const products = new Map();

    for (const order of successful) {
      const key = grouping === 'category'
        ? `${order.titleKey}::${order.categoryKey}`
        : order.titleKey;
      const current = products.get(key) || {
        key,
        title: order.title,
        titleKey: order.titleKey,
        category: grouping === 'category' ? order.category : '',
        count: 0,
        revenue: 0,
        categories: new Map()
      };
      current.count += 1;
      current.revenue += order.amount;
      current.categories.set(
        order.category,
        (current.categories.get(order.category) || 0) + 1
      );
      products.set(key, current);
    }

    return {
      period,
      grouping,
      orderCount: successful.length,
      revenue,
      average: successful.length > 0 ? revenue / successful.length : 0,
      refundCount: refunds.length,
      refundAmount: sum(refunds.map((order) => order.amount)),
      currency,
      topProducts: [...products.values()]
        .map((product) => ({
          ...product,
          categories: [...product.categories.entries()]
        }))
        .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
        .slice(0, 5)
    };
  }

  function createOfferSalesMap(orders, period = 'all') {
    const map = new Map();

    for (const order of filterOrdersByPeriod(orders, period)) {
      if (!isSuccessfulOrder(order)) continue;

      const key = `${order.titleKey}::${order.categoryKey}`;
      const current = map.get(key) || {
        count: 0,
        revenue: 0,
        currency: order.currency
      };
      current.count += 1;
      current.revenue += order.amount;
      map.set(key, current);
    }

    return map;
  }

  function filterOrdersByPeriod(orders, period) {
    if (period === 'all') return [...orders];

    const maximumDays = Number(period);
    return orders.filter(
      (order) =>
        Number.isFinite(order.ageDays) &&
        order.ageDays <= maximumDays
    );
  }

  function isSuccessfulOrder(order) {
    return SUCCESS_STATUSES.has(order.statusKey);
  }

  function isRefundOrder(order) {
    return REFUND_STATUSES.has(order.statusKey);
  }

  function normalizeProductTitle(value) {
    return cleanText(value)
      .normalize('NFKC')
      .toLocaleLowerCase('ru')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeCategory(value) {
    const normalized = cleanText(value)
      .replace(/[·,]/g, ' ')
      .toLocaleLowerCase('ru')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

    return normalized.split(/\s+/).filter(Boolean).sort().join(' ');
  }

  function normalizeSalesCategory(value) {
    const parts = cleanText(value).split(',').map((part) => part.trim());
    return parts.length >= 2 ? `${parts[0]} · ${parts.slice(1).join(', ')}` : parts[0] || '';
  }

  function parseAgeDays(relativeValue, dateValue) {
    const relative = cleanText(relativeValue).toLocaleLowerCase('ru');
    const number = Number.parseInt(relative.match(/\d+/)?.[0] || '1', 10);

    if (/минут|час|сегодня|только что/.test(relative)) return 0;
    if (/вчера/.test(relative)) return 1;
    if (/день|дня|дней|day/.test(relative)) return number;
    if (/недел|week/.test(relative)) return number * 7;
    if (/месяц|month/.test(relative)) return number * 30;
    if (/год|year/.test(relative)) return number * 365;

    const dateText = cleanText(dateValue).toLocaleLowerCase('ru');
    if (dateText.startsWith('сегодня')) return 0;
    if (dateText.startsWith('вчера')) return 1;
    return Number.NaN;
  }

  function readAppData(document) {
    try {
      return JSON.parse(document.body?.getAttribute('data-app-data') || '{}');
    } catch {
      return {};
    }
  }

  function parseNumber(value) {
    const normalized = String(value || '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    const number = Number.parseFloat(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sum(values) {
    return values.reduce((total, value) => total + value, 0);
  }
})();

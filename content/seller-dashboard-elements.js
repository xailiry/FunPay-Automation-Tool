(() => {
  const namespace = globalThis.FunPayAutomation;

  namespace.SellerDashboardElements = Object.freeze({
    createCachedGroup,
    createCachedOffer,
    createEmpty,
    createPanel,
    createTopProduct,
    formatMoney,
    getElements,
    pluralize
  });

  function createPanel(groups) {
    const panel = document.createElement('section');
    panel.id = 'fp-seller-dashboard';
    panel.className = 'fp-seller-dashboard';
    panel.innerHTML = `
      <header class="fp-seller-dashboard__header">
        <div>
          <div class="fp-seller-dashboard__eyebrow">FunPay Automation Tool</div>
          <h2>Панель продавца</h2>
          <p>Объявления, быстрые действия и статистика продаж в одном месте.</p>
        </div>
        <div class="fp-seller-dashboard__actions">
          <button class="fp-seller-refresh fp-seller-save" type="button" disabled>Сохранить изменения</button>
          <button class="fp-seller-refresh fp-seller-bump" type="button">Поднять товары</button>
          <button class="fp-seller-refresh fp-seller-sales-refresh" type="button">Обновить продажи</button>
        </div>
      </header>
      <div class="fp-seller-banner" hidden></div>
      <div class="fp-seller-metrics">
        <article><span>Продажи</span><strong data-metric="sales">0</strong></article>
        <article><span>Выручка</span><strong data-metric="revenue">0 ₽</strong></article>
        <article><span>Средний чек</span><strong data-metric="average">0 ₽</strong></article>
        <article><span>Возвраты</span><strong data-metric="refunds">0</strong></article>
      </div>
      <div class="fp-seller-metrics-toolbar">
        <div class="fp-seller-segmented" data-control="period" aria-label="Период метрик">
          <button type="button" data-value="7" aria-pressed="false">7 дней</button>
          <button type="button" data-value="30" aria-pressed="false">30 дней</button>
          <button type="button" data-value="all" aria-pressed="true">Всё</button>
        </div>
        <div class="fp-seller-segmented" data-control="grouping" aria-label="Группировка товаров">
          <button type="button" data-value="combined" aria-pressed="true">Общий топ</button>
          <button type="button" data-value="category" aria-pressed="false">По категориям</button>
        </div>
        <span class="fp-seller-metrics-meta"></span>
      </div>
      <div class="fp-seller-top">
        <h3>Самые продаваемые товары</h3>
        <div class="fp-seller-top__list"></div>
      </div>
      <div class="fp-seller-filters">
        <label class="fp-seller-search">
          <span>Поиск</span>
          <input type="search" placeholder="Название объявления">
        </label>
        <label>
          <span>Категория</span>
          <select data-filter="category">
            <option value="all">Все категории</option>
          </select>
        </label>
        <label>
          <span>Тип</span>
          <select data-filter="type">
            <option value="all">Все объявления</option>
            <option value="auto">Автовыдача</option>
            <option value="regular">Обычные</option>
          </select>
        </label>
        <label>
          <span>Статус</span>
          <select data-filter="status">
            <option value="all">Любой статус</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </select>
        </label>
        <label>
          <span>Сортировка</span>
          <select data-filter="sort">
            <option value="default">Как на FunPay</option>
            <option value="sales">По продажам</option>
            <option value="price-desc">Цена: сначала выше</option>
            <option value="price-asc">Цена: сначала ниже</option>
          </select>
        </label>
      </div>
      <div class="fp-seller-results">
        <strong data-result-count></strong>
        <span>Фильтры применяются сразу</span>
      </div>
      <div class="fp-seller-empty" hidden>По выбранным фильтрам ничего не найдено.</div>
      <div class="fp-seller-toast" role="status" aria-live="polite"></div>
    `;

    const categorySelect = panel.querySelector('[data-filter="category"]');
    for (const group of groups) {
      const option = document.createElement('option');
      option.value = group.nodeId;
      option.textContent = group.title;
      categorySelect.appendChild(option);
    }

    return panel;
  }

  function getElements(panel) {
    return {
      sales: panel.querySelector('[data-metric="sales"]'),
      revenue: panel.querySelector('[data-metric="revenue"]'),
      average: panel.querySelector('[data-metric="average"]'),
      refunds: panel.querySelector('[data-metric="refunds"]'),
      period: panel.querySelector('[data-control="period"]'),
      grouping: panel.querySelector('[data-control="grouping"]'),
      metricsMeta: panel.querySelector('.fp-seller-metrics-meta'),
      topProducts: panel.querySelector('.fp-seller-top__list'),
      search: panel.querySelector('input[type="search"]'),
      category: panel.querySelector('[data-filter="category"]'),
      type: panel.querySelector('[data-filter="type"]'),
      status: panel.querySelector('[data-filter="status"]'),
      sort: panel.querySelector('[data-filter="sort"]'),
      save: panel.querySelector('.fp-seller-save'),
      refresh: panel.querySelector('.fp-seller-sales-refresh'),
      bump: panel.querySelector('.fp-seller-bump'),
      resultCount: panel.querySelector('[data-result-count]'),
      empty: panel.querySelector('.fp-seller-empty'),
      toast: panel.querySelector('.fp-seller-toast'),
      banner: panel.querySelector('.fp-seller-banner')
    };
  }

  function createTopProduct(product, index, currency) {
    const item = document.createElement('article');
    item.className = 'fp-seller-top-item';
    const rank = document.createElement('span');
    rank.className = 'fp-seller-top-item__rank';
    rank.textContent = String(index + 1);
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = product.title;
    const meta = document.createElement('span');
    meta.textContent = product.category ||
      product.categories.map(([category]) => category).filter(Boolean).join(' · ');
    content.append(title, meta);
    const value = document.createElement('div');
    value.className = 'fp-seller-top-item__value';
    const count = document.createElement('strong');
    count.textContent = String(product.count);
    const revenue = document.createElement('span');
    revenue.textContent = formatMoney(product.revenue, currency);
    value.append(count, revenue);
    item.append(rank, content, value);
    return item;
  }

  function createEmpty(text) {
    const element = document.createElement('div');
    element.className = 'fp-seller-top__empty';
    element.textContent = text;
    return element;
  }

  function createCachedGroup(group) {
    const element = document.createElement('div');
    element.className = 'offer';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'offer-list-title-container';
    const title = document.createElement('div');
    title.className = 'offer-list-title';
    const heading = document.createElement('h3');
    const categoryLink = document.createElement('a');
    categoryLink.href = new URL(
      `/lots/${encodeURIComponent(group.nodeId)}/trade`,
      location.origin
    );
    categoryLink.textContent = group.title;
    heading.appendChild(categoryLink);
    title.appendChild(heading);

    const action = document.createElement('div');
    action.className = 'offer-list-title-button';
    const manageLink = document.createElement('a');
    manageLink.href = categoryLink.href;
    manageLink.textContent = 'Управлять';
    action.appendChild(manageLink);

    const table = document.createElement('div');
    table.className = 'showcase-table';
    titleContainer.append(title, action);
    element.append(titleContainer, table);
    return { element, table };
  }

  function createCachedOffer(offer) {
    const element = document.createElement('a');
    element.className = 'tc-item';
    element.href = offer.publicUrl || offer.editUrl;
    element.dataset.offer = offer.offerId;

    const description = document.createElement('div');
    description.className = 'tc-desc';
    const descriptionText = document.createElement('div');
    descriptionText.className = 'tc-desc-text';
    descriptionText.textContent = offer.title;
    description.appendChild(descriptionText);

    const price = document.createElement('div');
    price.className = 'tc-price';
    price.dataset.s = String(offer.price);
    price.append(document.createTextNode(`${offer.price} `));
    const unit = document.createElement('span');
    unit.className = 'unit';
    unit.textContent = offer.currency;
    price.appendChild(unit);

    element.append(description, price);
    return element;
  }

  function formatMoney(value, currency) {
    return `${Number(value || 0).toLocaleString('ru', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })} ${currency || '₽'}`.trim();
  }

  function pluralize(number, forms) {
    const mod10 = number % 10;
    const mod100 = number % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return forms[1];
    }
    return forms[2];
  }
})();

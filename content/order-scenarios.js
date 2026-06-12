(() => {
  const namespace = (globalThis.FunPayAutomation ||= {});
  if (!/(^|\.)funpay\.com$/.test(location.hostname)) return;
  if (namespace.orderScenariosStarted) return;
  namespace.orderScenariosStarted = true;
  const Core = namespace.OrderScenariosCore;

  const SETTINGS_KEY = 'toolbarSettings';
  const STATE_KEY = 'orderScenariosState';
  const POLL_INTERVAL_MS = 90_000;
  const POLL_THROTTLE_MS = 75_000;
  const FIRST_RUN_DELAY_MS = 9_000;
  const MAX_SEND_ATTEMPTS = 3;
  const POLL_LOCK_NAME = 'funpay-automation-order-scenarios';

  let settings = Core.normalizeSettings(null);

  void init();

  async function init() {
    settings = await loadSettings();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[SETTINGS_KEY]) {
        settings = Core.normalizeSettings(changes[SETTINGS_KEY].newValue?.orders);
      }
    });
    setInterval(() => {
      void tick().catch((error) => reportError('Проверка заказов', error));
    }, POLL_INTERVAL_MS);
    setTimeout(() => {
      void tick().catch((error) => reportError('Проверка заказов', error));
    }, FIRST_RUN_DELAY_MS);
  }

  async function tick() {
    if (!isEnabled()) return;
    await withPollLock(async () => {
      if (!(await claimPoll())) return;
      try {
        const orders = await fetchOrders();
        if (orders) await processOrders(orders);
      } catch (error) {
        reportError('Загрузка заказов', error);
      }
    });
  }

  function isEnabled() {
    return Boolean(settings.afterPaymentEnabled || settings.reviewRequestEnabled);
  }

  async function withPollLock(task) {
    if (!navigator.locks?.request) {
      await task();
      return;
    }

    await navigator.locks.request(
      POLL_LOCK_NAME,
      { ifAvailable: true },
      async (lock) => {
        if (lock) await task();
      }
    );
  }

  // Only one tab polls per interval — guards against duplicate work and sends.
  async function claimPoll() {
    const stored = await chrome.storage.local.get('orderScenariosPollAt');
    const last = Number(stored.orderScenariosPollAt) || 0;
    if (Date.now() - last < POLL_THROTTLE_MS) return false;
    await chrome.storage.local.set({ orderScenariosPollAt: Date.now() });
    return true;
  }

  async function fetchOrders() {
    const response = await fetch(new URL('/orders/trade', location.origin), {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (/onsite-login|class="page-login"/i.test(html)) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return parseOrders(doc);
  }

  function parseOrders(doc) {
    return [...doc.querySelectorAll('a.tc-item')]
      .map((row) => {
        const description = row.querySelector('.order-desc');
        const titleNode = [...(description?.children || [])].find(
          (node) => !node.classList.contains('text-muted')
        );
        return {
          id: clean(row.querySelector('.tc-order')?.textContent).replace(/^#/, ''),
          status: clean(row.querySelector('.tc-status')?.textContent).toLocaleLowerCase('ru'),
          title: clean(titleNode?.textContent),
          url: row.getAttribute('href') || ''
        };
      })
      .filter((order) => order.id);
  }

  async function processOrders(orders) {
    const state = await loadState();
    const now = Date.now();

    // First run ever: treat everything already on the page as handled so we
    // never message the entire order history when a scenario is switched on.
    if (!state.baselineDone) {
      for (const order of orders) {
        state.orders[order.id] = {
          paymentDone: true,
          reviewDone: true,
          lastSeenAt: now
        };
      }
      state.baselineDone = true;
      await saveState(state);
      return;
    }

    for (const order of orders) {
      const entry = (state.orders[order.id] ||= {
        paymentDone: false,
        reviewDone: false
      });
      entry.lastSeenAt = now;
      if (
        settings.afterPaymentEnabled &&
        !entry.paymentDone &&
        entry.paymentSendAt == null &&
        order.status.includes('оплач')
      ) {
        entry.paymentSendAt = now + settings.afterPaymentDelayMinutes * 60_000;
      }
      if (
        settings.reviewRequestEnabled &&
        !entry.reviewDone &&
        entry.reviewSendAt == null &&
        order.status.includes('закрыт')
      ) {
        entry.reviewSendAt = now + settings.reviewDelayHours * 3_600_000;
      }
    }
    await saveState(state);

    for (const order of orders) {
      const entry = state.orders[order.id];
      if (!entry) continue;
      if (entry.paymentSendAt != null && !entry.paymentDone && now >= entry.paymentSendAt) {
        await runScenario(order, 'payment', settings.afterPaymentMessage);
      }
      if (entry.reviewSendAt != null && !entry.reviewDone && now >= entry.reviewSendAt) {
        await runScenario(order, 'review', settings.reviewMessage);
      }
    }
  }

  async function runScenario(order, scenario, template) {
    // Re-read state right before sending so a parallel tab cannot double-send.
    const state = await loadState();
    const entry = state.orders[order.id];
    const doneKey = scenario === 'payment' ? 'paymentDone' : 'reviewDone';
    const attemptsKey = scenario === 'payment' ? 'paymentAttempts' : 'reviewAttempts';
    if (!entry || entry[doneKey]) return;

    entry[attemptsKey] = (entry[attemptsKey] || 0) + 1;

    const message = clean(template);
    if (!message) {
      entry[doneKey] = true;
      await saveState(state);
      return;
    }

    let ok = false;
    try {
      const account = readAppData();
      const target = await resolveOrderTarget(order.url, account.userId);
      if (account.csrfToken && target?.node) {
        const content = Core.renderText(template, {
          buyerName: target.buyerName,
          offerName: order.title,
          orderId: order.id
        });
        ok = await sendChatMessage({
          node: target.node,
          content,
          csrfToken: account.csrfToken
        });
      } else {
        reportError(
          'Подготовка сообщения',
          new Error('FunPay не вернул данные чата для заказа.')
        );
      }
    } catch (error) {
      reportError('Отправка сообщения', error);
    }

    if (ok || entry[attemptsKey] >= MAX_SEND_ATTEMPTS) entry[doneKey] = true;
    await saveState(state);
  }

  async function resolveOrderTarget(orderUrl, myId) {
    const targetUrl = Core.resolveSameOriginUrl(orderUrl, location.origin);
    if (!targetUrl) return null;
    const response = await fetch(targetUrl, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    const direct = html.match(/users-\d+-\d+/);
    const buyerLink = doc.querySelector('.chat-header a[href*="/users/"], .order-header a[href*="/users/"], a.media-user-name[href*="/users/"]') ||
      [...doc.querySelectorAll('a[href*="/users/"]')].find(
        (link) => link.href.match(/\/users\/(\d+)\//)?.[1] !== String(myId)
      );
    const buyerId = buyerLink?.href.match(/\/users\/(\d+)\//)?.[1] || null;
    const buyerName = clean(buyerLink?.textContent);

    let node = direct?.[0] || null;
    if (!node && myId && buyerId) {
      const ids = [Number(myId), Number(buyerId)].sort((a, b) => a - b);
      node = `users-${ids[0]}-${ids[1]}`;
    }
    return { node, buyerName };
  }

  async function sendChatMessage({ node, content, csrfToken }) {
    const lastMessage = await readLastMessage(node, csrfToken);
    const objects = [{
      type: 'chat_node',
      id: node,
      tag: randomTag(),
      data: { node, last_message: lastMessage, content: '' }
    }];
    const request = {
      action: 'chat_message',
      data: { node, last_message: lastMessage, content }
    };
    const body = new URLSearchParams();
    body.set('objects', JSON.stringify(objects));
    body.set('request', JSON.stringify(request));
    body.set('csrf_token', csrfToken);

    const response = await fetch('https://funpay.com/runner/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        accept: 'application/json, text/javascript, */*; q=0.01'
      },
      body: body.toString()
    });
    if (!response.ok) return false;
    const json = await response.json().catch(() => null);
    if (json && (json.error || json.errorText)) {
      reportError(
        'Отправка сообщения',
        new Error(String(json.error || json.errorText))
      );
      return false;
    }
    return true;
  }

  // The runner echoes the node's current last message id; sending with a fresh
  // value keeps FunPay's own ordering happy. Falls back to 0 if unavailable.
  async function readLastMessage(node, csrfToken) {
    try {
      const objects = [{
        type: 'chat_node',
        id: node,
        tag: randomTag(),
        data: { node, last_message: 0, content: '' }
      }];
      const body = new URLSearchParams();
      body.set('objects', JSON.stringify(objects));
      body.set('csrf_token', csrfToken);
      const response = await fetch('https://funpay.com/runner/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'x-requested-with': 'XMLHttpRequest',
          accept: 'application/json, text/javascript, */*; q=0.01'
        },
        body: body.toString()
      });
      const json = await response.json().catch(() => null);
      const data = json?.objects?.find((item) => item.type === 'chat_node')?.data;
      const value = Number(data?.last_message);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  function readAppData() {
    let data = {};
    try {
      data = JSON.parse(
        document.body?.getAttribute('data-app-data') ||
        document.body?.dataset.appData ||
        '{}'
      );
    } catch {
      data = {};
    }
    return {
      userId: String(data.userId || ''),
      csrfToken: String(data['csrf-token'] || data.csrfToken || '')
    };
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return Core.normalizeSettings(stored[SETTINGS_KEY]?.orders);
  }

  async function loadState() {
    const stored = await chrome.storage.local.get(STATE_KEY);
    return Core.normalizeState(stored[STATE_KEY]);
  }

  async function saveState(state) {
    await chrome.storage.local.set({
      [STATE_KEY]: Core.normalizeState(state)
    });
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function randomTag() {
    return Math.random().toString(36).slice(2, 10);
  }

  function reportError(context, error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[FunPay Automation · сценарии заказов] ${context}: ${message}`);
  }
})();

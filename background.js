const AUTO_BUMP_ALARM = 'autoBumpAlarm';
const AUTO_BUMP_PERIOD_MINUTES = 240;
const CATEGORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const REQUEST_DELAY_MS = 700;

let activeBumpPromise = null;

chrome.runtime.onInstalled.addListener(() => {
  syncAutoBumpAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  syncAutoBumpAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== AUTO_BUMP_ALARM) return;

  chrome.storage.local.get(['autoBumpEnabled'], ({ autoBumpEnabled }) => {
    if (autoBumpEnabled) runBump();
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getExtensionState') {
    getExtensionState().then(sendResponse);
    return true;
  }

  if (message.action === 'setAutoBump') {
    setAutoBump(Boolean(message.enabled))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === 'triggerBumpNow') {
    runBump()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.action === 'getCategories') {
    getCategories(Boolean(message.forceRefresh))
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function getExtensionState() {
  const stored = await chrome.storage.local.get([
    'autoBumpEnabled',
    'lastBumpResult',
    'lastMultiPostResult'
  ]);
  const lastBumpResult = normalizeStoredBumpResult(stored.lastBumpResult);

  if (lastBumpResult !== stored.lastBumpResult) {
    await chrome.storage.local.set({ lastBumpResult });
  }

  return {
    autoBumpEnabled: Boolean(stored.autoBumpEnabled),
    bumpRunning: Boolean(activeBumpPromise),
    lastBumpResult,
    lastMultiPostResult: stored.lastMultiPostResult || null
  };
}

async function setAutoBump(enabled) {
  await chrome.storage.local.set({ autoBumpEnabled: enabled });
  await syncAutoBumpAlarm();
}

async function syncAutoBumpAlarm() {
  const { autoBumpEnabled } = await chrome.storage.local.get(['autoBumpEnabled']);

  if (autoBumpEnabled) {
    await chrome.alarms.create(AUTO_BUMP_ALARM, {
      delayInMinutes: AUTO_BUMP_PERIOD_MINUTES,
      periodInMinutes: AUTO_BUMP_PERIOD_MINUTES
    });
  } else {
    await chrome.alarms.clear(AUTO_BUMP_ALARM);
  }
}

function runBump() {
  if (activeBumpPromise) return activeBumpPromise;

  activeBumpPromise = performBump().finally(() => {
    activeBumpPromise = null;
  });

  return activeBumpPromise;
}

async function performBump() {
  const startedAt = Date.now();
  const runningState = {
    status: 'running',
    startedAt,
    finishedAt: null,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    results: []
  };

  await chrome.storage.local.set({ lastBumpResult: runningState });

  try {
    const home = await requestFunPay('https://funpay.com/');
    const userId = extractUserId(home.text);

    if (!userId) {
      throw new Error('Не удалось определить аккаунт. Откройте FunPay и войдите в профиль.');
    }

    const profile = await requestFunPay(`https://funpay.com/users/${userId}/`);
    const nodeIds = extractNodeIds(profile.text);

    if (nodeIds.length === 0) {
      throw new Error('В профиле не найдены активные категории с объявлениями.');
    }

    const results = [];

    for (const nodeId of nodeIds) {
      try {
        const categoryPage = await requestFunPay(`https://funpay.com/lots/${nodeId}/trade`);
        const gameId = extractGameId(categoryPage.text);

        if (!gameId) {
          results.push({
            nodeId,
            status: 'failed',
            message: 'Не найден game_id категории'
          });
          continue;
        }

        const formData = new FormData();
        formData.set('game_id', gameId);
        formData.set('node_id', nodeId);

        const response = await requestFunPay('https://funpay.com/lots/raise', {
          method: 'POST',
          body: formData,
          headers: {
            'x-requested-with': 'XMLHttpRequest'
          }
        });

        results.push(classifyActionResponse(nodeId, response));
      } catch (error) {
        results.push({
          nodeId,
          status: 'failed',
          message: error.message
        });
      }

      await delay(REQUEST_DELAY_MS);
    }

    const result = createBumpResult('completed', startedAt, results);
    await chrome.storage.local.set({ lastBumpResult: result });
    await notifyBumpResult(result);
    return result;
  } catch (error) {
    const result = {
      ...runningState,
      status: 'failed',
      finishedAt: Date.now(),
      failedCount: 1,
      error: error.message
    };

    await chrome.storage.local.set({ lastBumpResult: result });
    await createNotification('Авто-поднятие не выполнено', error.message);
    throw error;
  }
}

async function getCategories(forceRefresh = false) {
  const cached = await chrome.storage.local.get([
    'funpayCategories',
    'funpayCategoriesUpdatedAt'
  ]);
  const updatedAt = Number(cached.funpayCategoriesUpdatedAt) || 0;
  const cacheIsFresh =
    Array.isArray(cached.funpayCategories) &&
    cached.funpayCategories.length > 0 &&
    Date.now() - updatedAt < CATEGORY_CACHE_TTL_MS;

  if (!forceRefresh && cacheIsFresh) {
    return {
      categories: cached.funpayCategories,
      updatedAt,
      fromCache: true
    };
  }

  const home = await requestFunPay('https://funpay.com/');
  const categories = extractCategories(home.text);

  if (categories.length === 0) {
    throw new Error('FunPay не вернул список категорий. Возможно, изменилась разметка сайта.');
  }

  const nextUpdatedAt = Date.now();
  await chrome.storage.local.set({
    funpayCategories: categories,
    funpayCategoriesUpdatedAt: nextUpdatedAt
  });

  return {
    categories,
    updatedAt: nextUpdatedAt,
    fromCache: false
  };
}

async function requestFunPay(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      redirect: 'follow',
      ...options
    });
  } catch {
    throw new Error('Не удалось связаться с FunPay.');
  }

  const text = await response.text();

  if (isAuthenticationPage(response.url, text)) {
    throw new Error('Сессия FunPay не найдена или истекла.');
  }

  if (!response.ok) {
    throw new Error(`FunPay вернул ошибку HTTP ${response.status}.`);
  }

  return {
    url: response.url,
    text,
    contentType: response.headers.get('content-type') || '',
    json: tryParseJson(text)
  };
}

function classifyActionResponse(nodeId, response) {
  const data = response.json;

  if (!data) {
    return {
      nodeId,
      status: 'failed',
      message: 'Сервер вернул неожиданный ответ'
    };
  }

  const errorMessage = extractResponseMessage(data);
  const explicitlyFailed =
    data.success === false ||
    data.status === 'error' ||
    Boolean(data.error);

  if (explicitlyFailed) {
    const isSilentRejection = !errorMessage;

    return {
      nodeId,
      status: isSilentRejection || looksLikeCooldown(errorMessage) ? 'skipped' : 'failed',
      message: errorMessage || 'Уже поднято или действует ограничение по времени',
      response: createResponseDiagnostic(data)
    };
  }

  return {
    nodeId,
    status: 'success',
    message: extractResponseMessage(data) || 'Объявления подняты'
  };
}

function createBumpResult(status, startedAt, results) {
  return {
    status,
    startedAt,
    finishedAt: Date.now(),
    successCount: results.filter((item) => item.status === 'success').length,
    skippedCount: results.filter((item) => item.status === 'skipped').length,
    failedCount: results.filter((item) => item.status === 'failed').length,
    results
  };
}

function normalizeStoredBumpResult(result) {
  if (!result || !Array.isArray(result.results)) return result || null;

  let changed = false;
  const results = result.results.map((item) => {
    if (
      item.status === 'failed' &&
      item.message === 'Операция отклонена FunPay'
    ) {
      changed = true;
      return {
        ...item,
        status: 'skipped',
        message: 'Уже поднято или действует ограничение по времени'
      };
    }

    return item;
  });

  if (!changed) return result;

  return {
    ...result,
    successCount: results.filter((item) => item.status === 'success').length,
    skippedCount: results.filter((item) => item.status === 'skipped').length,
    failedCount: results.filter((item) => item.status === 'failed').length,
    results
  };
}

async function notifyBumpResult(result) {
  const parts = [`Поднято: ${result.successCount}`];

  if (result.skippedCount > 0) parts.push(`на кулдауне: ${result.skippedCount}`);
  if (result.failedCount > 0) parts.push(`ошибок: ${result.failedCount}`);

  await createNotification('Авто-поднятие завершено', parts.join(', '));
}

function createNotification(title, message) {
  return chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-128.png',
    title,
    message
  });
}

function extractUserId(html) {
  return html.match(/(?:https?:\/\/(?:www\.)?funpay\.com)?\/users\/(\d+)\/?/i)?.[1] || null;
}

function extractNodeIds(html) {
  const ids = new Set();
  const pattern = /(?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?/gi;
  let match;

  while ((match = pattern.exec(html))) ids.add(match[1]);
  return [...ids];
}

function extractGameId(html) {
  return html.match(/\bdata-game=["'](\d+)["']/i)?.[1] || null;
}

function extractCategories(html) {
  const categoriesById = new Map();
  const anchorPattern = /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const id = match[1];
    const name = decodeHtml(stripHtml(match[2])).replace(/\s+/g, ' ').trim();

    if (name && !categoriesById.has(id)) {
      categoriesById.set(id, { id, name });
    }
  }

  return [...categoriesById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
  );
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
  const namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const isHex = code[1].toLowerCase() === 'x';
      const number = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }

    return namedEntities[code.toLowerCase()] || entity;
  });
}

function isAuthenticationPage(url, text) {
  const pathname = getPathname(url);
  return (
    pathname.includes('/account/login') ||
    /name=["']login["']/i.test(text) &&
      /name=["']password["']/i.test(text)
  );
}

function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeMessage(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean).join(', ');
  }
  return '';
}

function extractResponseMessage(data) {
  const candidates = [
    data.message,
    data.msg,
    data.error_description,
    data.error_message,
    typeof data.error === 'string' || typeof data.error === 'object'
      ? data.error
      : null
  ];

  for (const candidate of candidates) {
    const message = normalizeMessage(candidate);
    if (message) return message;
  }

  return '';
}

function createResponseDiagnostic(data) {
  const diagnostic = {};

  for (const key of ['success', 'status', 'error', 'code']) {
    const value = data[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      diagnostic[key] = value;
    }
  }

  return diagnostic;
}

function looksLikeCooldown(message) {
  return /уже|ранее|час|минут|секунд|подня|повтор|огранич|cooldown|later|wait|raised/i.test(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { BumpService } from './background/bump-service.js';
import { PageCategoryLoader } from './background/category-loader.js';
import { FunPayClient } from './background/funpay-client.js';
import { normalizeStoredBumpResult } from './background/results.js';

const AUTO_BUMP_ALARM = 'autoBumpAlarm';
const AUTO_BUMP_PERIOD_MINUTES = 240;

const storage = chrome.storage.local;
const funPayClient = new FunPayClient();
const bumpService = new BumpService({
  client: funPayClient,
  storage,
  notify: createNotification
});
const categoryLoader = new PageCategoryLoader(chrome.scripting);
const messageHandlers = new Map([
  ['getExtensionState', getExtensionState],
  ['setAutoBump', ({ enabled }) => setAutoBump(Boolean(enabled))],
  ['triggerBumpNow', () => bumpService.run()],
  [
    'loadCategoryCatalog',
    (message, sender) => categoryLoader.load(message, sender)
  ]
]);

chrome.runtime.onInstalled.addListener(() => {
  void syncAutoBumpAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  void syncAutoBumpAlarm();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== AUTO_BUMP_ALARM) return;

  void storage
    .get(['autoBumpEnabled'])
    .then(({ autoBumpEnabled }) => {
      if (autoBumpEnabled) return bumpService.run();
      return null;
    })
    .catch((error) => {
      console.error('FunPay Automation: scheduled bump failed', error);
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers.get(message?.action);
  if (!handler) return false;

  Promise.resolve()
    .then(() => handler(message, sender))
    .then((result) => sendResponse(createSuccessResponse(message.action, result)))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });

  return true;
});

async function getExtensionState() {
  const stored = await storage.get([
    'autoBumpEnabled',
    'lastBumpResult',
    'lastMultiPostResult'
  ]);
  const lastBumpResult = normalizeStoredBumpResult(stored.lastBumpResult);

  if (lastBumpResult !== stored.lastBumpResult) {
    await storage.set({ lastBumpResult });
  }

  return {
    autoBumpEnabled: Boolean(stored.autoBumpEnabled),
    bumpRunning: bumpService.isRunning,
    lastBumpResult,
    lastMultiPostResult: stored.lastMultiPostResult || null
  };
}

async function setAutoBump(enabled) {
  await storage.set({ autoBumpEnabled: enabled });
  await syncAutoBumpAlarm();
}

async function syncAutoBumpAlarm() {
  const { autoBumpEnabled } = await storage.get(['autoBumpEnabled']);

  if (!autoBumpEnabled) {
    await chrome.alarms.clear(AUTO_BUMP_ALARM);
    return;
  }

  await chrome.alarms.create(AUTO_BUMP_ALARM, {
    delayInMinutes: AUTO_BUMP_PERIOD_MINUTES,
    periodInMinutes: AUTO_BUMP_PERIOD_MINUTES
  });
}

function createSuccessResponse(action, result) {
  if (action === 'getExtensionState') return { ok: true, ...result };
  if (action === 'triggerBumpNow') return { ok: true, result };
  if (action === 'loadCategoryCatalog') return { ok: true, ...result };
  return { ok: true };
}

function createNotification(title, message) {
  return chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-128.png',
    title,
    message
  });
}

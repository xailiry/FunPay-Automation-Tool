import { BumpService } from './background/bump-service.js';
import { AutoBumpScheduler } from './background/auto-bump-scheduler.js';
import { PageRequestLoader } from './background/page-request-loader.js';
import { FunPayClient } from './background/funpay-client.js';
import { normalizeStoredBumpResult } from './background/results.js';

const storage = chrome.storage.local;
const funPayClient = new FunPayClient();
const bumpService = new BumpService({
  client: funPayClient,
  storage,
  notify: createNotification
});
const pageRequestLoader = new PageRequestLoader({
  scripting: chrome.scripting,
  tabs: chrome.tabs
});
const autoBumpScheduler = new AutoBumpScheduler({
  alarms: chrome.alarms,
  storage,
  run: () => bumpService.run(),
  onError(error) {
    console.error('FunPay Automation: scheduled bump failed', error);
  }
});
const messageHandlers = new Map([
  ['getExtensionState', getExtensionState],
  ['setAutoBump', ({ enabled }) => autoBumpScheduler.setEnabled(Boolean(enabled))],
  ['triggerBumpNow', () => autoBumpScheduler.runManually()],
  [
    'requestFunPayPage',
    (message, sender) => pageRequestLoader.request(message, sender)
  ],
  [
    'deleteFunPayOffer',
    (message, sender) => pageRequestLoader.deleteOffer(message, sender)
  ]
]);

chrome.runtime.onInstalled.addListener(() => {
  initializeAutoBump();
});

chrome.runtime.onStartup.addListener(() => {
  initializeAutoBump();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  void autoBumpScheduler.handleAlarm(alarm).catch(logSchedulerError);
});

initializeAutoBump();

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
    'nextAutoBumpAt',
    'lastBumpResult',
    'lastMultiPostResult'
  ]);
  const lastBumpResult = normalizeStoredBumpResult(stored.lastBumpResult);

  if (lastBumpResult !== stored.lastBumpResult) {
    await storage.set({ lastBumpResult });
  }

  return {
    autoBumpEnabled: Boolean(stored.autoBumpEnabled),
    nextAutoBumpAt: stored.nextAutoBumpAt || null,
    bumpRunning: bumpService.isRunning,
    lastBumpResult,
    lastMultiPostResult: stored.lastMultiPostResult || null
  };
}

function createSuccessResponse(action, result) {
  if (action === 'getExtensionState') return { ok: true, ...result };
  if (action === 'setAutoBump') return { ok: true, ...result };
  if (action === 'triggerBumpNow') return { ok: true, result };
  if (action === 'requestFunPayPage') return { ok: true, response: result };
  if (action === 'deleteFunPayOffer') return { ok: true, response: result };
  return { ok: true };
}

function initializeAutoBump() {
  void autoBumpScheduler.initialize().catch(logSchedulerError);
}

function logSchedulerError(error) {
  console.error('FunPay Automation: auto-bump scheduler failed', error);
}

function createNotification(title, message) {
  return chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-128.png',
    title,
    message
  });
}

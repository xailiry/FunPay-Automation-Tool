(() => {
  const namespace = globalThis.FunPayAutomation;
  const Core = namespace.ChatManagerCore;
  const SETTINGS_KEY = 'toolbarSettings';
  const HISTORY_KEY = 'chatManagerGreetingHistory';
  const MAX_HISTORY_ITEMS = 300;

  class ChatManagerStore {
    constructor(storage = chrome.storage.local) {
      this.storage = storage;
      this.settings = Core.normalizeSettings();
      this.history = {};
      this.listeners = new Set();
      this.onStorageChange = this.onStorageChange.bind(this);
    }

    async load() {
      const stored = await this.storage.get([SETTINGS_KEY, HISTORY_KEY]);
      this.settings = Core.normalizeSettings(stored[SETTINGS_KEY]?.messages);
      this.history = normalizeHistory(stored[HISTORY_KEY]);
      chrome.storage.onChanged.addListener(this.onStorageChange);
      return this.getSettings();
    }

    destroy() {
      chrome.storage.onChanged.removeListener(this.onStorageChange);
      this.listeners.clear();
    }

    getSettings() {
      return structuredClone(this.settings);
    }

    hasHandledGreeting(conversationId) {
      return Boolean(conversationId && this.history[conversationId]);
    }

    async markGreetingHandled(conversationId, action) {
      if (!conversationId) return;
      this.history[conversationId] = {
        action: action === 'send' ? 'send' : 'insert',
        handledAt: Date.now()
      };
      this.history = trimHistory(this.history);
      await this.storage.set({ [HISTORY_KEY]: this.history });
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    onStorageChange(changes, areaName) {
      if (areaName !== 'local') return;
      if (changes[SETTINGS_KEY]) {
        this.settings = Core.normalizeSettings(
          changes[SETTINGS_KEY].newValue?.messages
        );
        const snapshot = this.getSettings();
        this.listeners.forEach((listener) => listener(snapshot));
      }
      if (changes[HISTORY_KEY]) {
        this.history = normalizeHistory(changes[HISTORY_KEY].newValue);
      }
    }
  }

  function normalizeHistory(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return trimHistory(value);
  }

  function trimHistory(value) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item && Number.isFinite(Number(item.handledAt)))
        .sort(([, left], [, right]) => right.handledAt - left.handledAt)
        .slice(0, MAX_HISTORY_ITEMS)
    );
  }

  namespace.ChatManagerStore = ChatManagerStore;
})();

import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomationToolbar = {};
await import('../multipost-presets.js');
await import('../toolbar/config.js');
await import('../toolbar/store.js');

const { Config, ToolbarStore } = globalThis.FunPayAutomationToolbar;

test('migrates partial settings without losing defaults', async () => {
  const storage = createStorage({
    toolbarSettings: {
      appearance: {
        accent: '#123456'
      }
    }
  });
  const store = new ToolbarStore(storage);

  const settings = await store.load();

  assert.equal(settings.schemaVersion, Config.schemaVersion);
  assert.equal(settings.appearance.accent, '#123456');
  assert.equal(settings.appearance.mode, 'light');
  assert.equal(settings.appearance.backgroundFit, 'cover');
  assert.equal(settings.appearance.backgroundOverlay, 40);
  assert.equal(settings.notifications.newOrder, true);
  assert.equal(settings.messages.managerEnabled, true);
  assert.equal(settings.messages.greetingAction, 'insert');
  assert.equal(settings.messages.templateAction, 'insert');
  assert.deepEqual(settings.offers.presets, []);
});

test('normalizes appearance controls and saved themes', async () => {
  const store = new ToolbarStore(createStorage({
    toolbarSettings: {
      appearance: {
        backgroundFit: 'stretch',
        backgroundPosition: 'somewhere',
        backgroundOverlay: 200,
        savedThemes: [
          {
            id: 'night-work',
            name: '  Рабочая ночь  ',
            settings: {
              mode: 'dark',
              backgroundFit: 'contain'
            }
          },
          {
            id: 'invalid',
            name: '',
            settings: {}
          }
        ]
      }
    }
  }));

  const settings = await store.load();

  assert.equal(settings.appearance.backgroundFit, 'cover');
  assert.equal(settings.appearance.backgroundPosition, 'center');
  assert.equal(settings.appearance.backgroundOverlay, 90);
  assert.equal(settings.appearance.savedThemes.length, 1);
  assert.equal(settings.appearance.savedThemes[0].name, 'Рабочая ночь');
  assert.equal(
    settings.appearance.savedThemes[0].settings.backgroundFit,
    'contain'
  );
});

test('normalizes stored multipost presets during migration', async () => {
  const store = new ToolbarStore(createStorage({
    toolbarSettings: {
      offers: {
        maxTargets: 999,
        presetName: 'Устаревшее поле',
        presets: [
          {
            id: 'ai',
            name: 'ИИ-сервисы',
            categories: [
              { id: 4093, game: 'Gemini', section: 'Услуги' },
              { id: 4093, name: 'Дубликат' }
            ]
          }
        ]
      }
    }
  }));

  const settings = await store.load();

  assert.equal(settings.offers.maxTargets, 50);
  assert.equal('presetName' in settings.offers, false);
  assert.equal(settings.offers.presets.length, 1);
  assert.deepEqual(settings.offers.presets[0].categories, [
    {
      id: '4093',
      game: 'Gemini',
      section: 'Услуги',
      name: 'Gemini · Услуги'
    }
  ]);
});

test('updates nested values and resets individual sections', async () => {
  const storage = createStorage({});
  const store = new ToolbarStore(storage);
  await store.load();

  await store.update('notifications.volume', 25);
  assert.equal(store.get().notifications.volume, 25);

  await store.resetSection('notifications');
  assert.equal(
    store.get().notifications.volume,
    Config.defaults.notifications.volume
  );
});

test('imports settings through the same migration path', async () => {
  const store = new ToolbarStore(createStorage({}));
  await store.load();

  await store.import({
    messages: {
      greetingEnabled: true
    }
  });

  assert.equal(store.get().messages.greetingEnabled, true);
  assert.equal(store.get().messages.onlyNewChats, true);
});

test('drops unknown imported keys instead of extending the settings schema', async () => {
  const store = new ToolbarStore(createStorage({}));
  await store.load();

  await store.import(JSON.parse(`{
    "unknownSection": { "enabled": true },
    "orders": {
      "oncePerOrder": false,
      "reviewRequestEnabled": true
    },
    "__proto__": { "polluted": true }
  }`));

  const settings = store.get();
  assert.equal('unknownSection' in settings, false);
  assert.equal('oncePerOrder' in settings.orders, false);
  assert.equal(settings.orders.reviewRequestEnabled, true);
  assert.equal({}.polluted, undefined);
});

function createStorage(initialState) {
  return {
    state: structuredClone(initialState),
    async get(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => key in this.state)
          .map((key) => [key, structuredClone(this.state[key])])
      );
    },
    async set(values) {
      Object.assign(this.state, structuredClone(values));
    }
  };
}

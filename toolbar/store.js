(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const { Config } = namespace;

  class ToolbarStore {
    constructor(storage = chrome.storage.local) {
      this.storage = storage;
      this.settings = null;
      this.listeners = new Set();
    }

    async load() {
      const stored = await this.storage.get([Config.storageKey]);
      this.settings = migrateSettings(stored[Config.storageKey]);
      await this.persist();
      return this.get();
    }

    get() {
      return structuredClone(this.settings || Config.defaults);
    }

    getSection(sectionId) {
      return structuredClone(this.get()[sectionId] || {});
    }

    async update(path, value) {
      const keys = Array.isArray(path) ? path : String(path).split('.');
      const next = this.get();
      let target = next;

      for (const key of keys.slice(0, -1)) {
        target[key] ||= {};
        target = target[key];
      }
      target[keys.at(-1)] = value;
      this.settings = next;
      await this.persist();
      this.emit();
      return this.get();
    }

    async replaceSection(sectionId, value) {
      const next = this.get();
      const merged = deepMerge(Config.defaults[sectionId] || {}, value || {});
      next[sectionId] = sectionId === 'appearance'
        ? normalizeAppearanceSettings(merged)
        : merged;
      this.settings = next;
      await this.persist();
      this.emit();
    }

    async resetSection(sectionId) {
      return this.replaceSection(sectionId, Config.defaults[sectionId] || {});
    }

    async resetAll() {
      this.settings = structuredClone(Config.defaults);
      await this.persist();
      this.emit();
    }

    async import(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Файл не содержит настройки расширения.');
      }
      this.settings = migrateSettings(value);
      await this.persist();
      this.emit();
      return this.get();
    }

    export() {
      return JSON.stringify(this.get(), null, 2);
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    async persist() {
      await this.storage.set({
        [Config.storageKey]: this.settings
      });
    }

    emit() {
      const snapshot = this.get();
      this.listeners.forEach((listener) => listener(snapshot));
    }
  }

  function migrateSettings(value) {
    const settings = deepMerge(Config.defaults, value || {});
    const presets = globalThis.FunPayAutomationPresets;
    if (presets) {
      settings.offers = {
        ...settings.offers,
        ...presets.normalizeOffersSettings(settings.offers)
      };
    }
    settings.appearance = normalizeAppearanceSettings(settings.appearance);
    settings.schemaVersion = Config.schemaVersion;
    return settings;
  }

  function deepMerge(base, value) {
    if (Array.isArray(base)) {
      return Array.isArray(value) ? structuredClone(value) : structuredClone(base);
    }
    if (!isRecord(base)) return value === undefined ? base : value;

    const result = {};
    const source = isRecord(value) ? value : {};
    for (const key of Object.keys(base)) {
      result[key] = deepMerge(base[key], source[key]);
    }
    return result;
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeAppearanceSettings(value) {
    const source = deepMerge(Config.defaults.appearance, value || {});
    const allowedModes = new Set(['light', 'dark', 'system']);
    const allowedDensities = new Set(['spacious', 'standard', 'compact']);
    const allowedFits = new Set(['cover', 'contain', 'auto']);
    const allowedPositions = new Set(['center', 'top', 'bottom', 'left', 'right']);

    source.mode = allowedModes.has(source.mode) ? source.mode : 'light';
    source.density = allowedDensities.has(source.density)
      ? source.density
      : 'standard';
    source.backgroundFit = allowedFits.has(source.backgroundFit)
      ? source.backgroundFit
      : 'cover';
    source.backgroundPosition = allowedPositions.has(source.backgroundPosition)
      ? source.backgroundPosition
      : 'center';
    source.backgroundOverlay = clamp(source.backgroundOverlay, 0, 90, 40);
    source.backgroundBlur = clamp(source.backgroundBlur, 0, 20, 3);
    source.savedThemes = normalizeSavedThemes(source.savedThemes);
    return source;
  }

  function normalizeSavedThemes(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 8).flatMap((theme, index) => {
      if (!isRecord(theme)) return [];
      const name = String(theme.name || '').trim().slice(0, 50);
      if (!name) return [];
      const settings = normalizeAppearanceSettings({
        ...theme.settings,
        savedThemes: []
      });
      settings.savedThemes = [];
      return [{
        id: String(theme.id || `theme-${index + 1}`).slice(0, 80),
        name,
        settings
      }];
    });
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  namespace.ToolbarStore = ToolbarStore;
  namespace.mergeSettings = deepMerge;
  namespace.normalizeAppearanceSettings = normalizeAppearanceSettings;
})();

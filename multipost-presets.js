(() => {
  const DEFAULT_OPTIONS = Object.freeze({
    multipostDelayMs: 700,
    maxTargets: 20,
    stopOnError: true,
    presets: []
  });

  globalThis.FunPayAutomationPresets = Object.freeze({
    DEFAULT_OPTIONS,
    filterPresets,
    normalizeCategory,
    normalizeOffersSettings,
    normalizePreset,
    resolvePresetCategories
  });

  function normalizeOffersSettings(value = {}) {
    return {
      multipostDelayMs: clampNumber(
        value.multipostDelayMs,
        300,
        5000,
        DEFAULT_OPTIONS.multipostDelayMs
      ),
      maxTargets: clampNumber(
        value.maxTargets,
        1,
        50,
        DEFAULT_OPTIONS.maxTargets
      ),
      stopOnError:
        value.stopOnError === undefined
          ? DEFAULT_OPTIONS.stopOnError
          : Boolean(value.stopOnError),
      presets: Array.isArray(value.presets)
        ? value.presets.map(normalizePreset).filter(Boolean)
        : []
    };
  }

  function normalizePreset(value, index = 0) {
    if (!value || typeof value !== 'object') return null;

    const categories = [];
    const ids = new Set();
    for (const item of Array.isArray(value.categories) ? value.categories : []) {
      const category = normalizeCategory(item);
      if (!category || ids.has(category.id)) continue;
      ids.add(category.id);
      categories.push(category);
    }

    const id = String(value.id || `preset-${index + 1}`).trim();
    const name = String(value.name || '').trim();
    if (!id || !name) return null;

    return { id, name, categories };
  }

  function normalizeCategory(value) {
    if (!value || typeof value !== 'object') return null;
    const id = String(value.id || value.nodeId || '').trim();
    const game = String(value.game || '').trim();
    const section = String(value.section || '').trim();
    const name = String(
      value.name || [game, section].filter(Boolean).join(' · ')
    ).trim();
    if (!id || !name) return null;
    return { id, game, section, name };
  }

  function filterPresets(presets, query) {
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase('ru');
    const normalized = (Array.isArray(presets) ? presets : [])
      .map(normalizePreset)
      .filter(Boolean);
    if (!normalizedQuery) return normalized;

    return normalized.filter((preset) =>
      [preset.name, ...preset.categories.map((category) => category.name)]
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(normalizedQuery)
    );
  }

  function resolvePresetCategories(preset, catalog, currentNodeId = null) {
    const normalized = normalizePreset(preset);
    if (!normalized) return [];

    const catalogById = new Map(
      (Array.isArray(catalog) ? catalog : [])
        .map(normalizeCategory)
        .filter(Boolean)
        .map((category) => [category.id, category])
    );

    return normalized.categories
      .filter((category) => category.id !== String(currentNodeId || ''))
      .map((category) => catalogById.get(category.id) || category);
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }
})();

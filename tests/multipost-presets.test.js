import assert from 'node:assert/strict';
import test from 'node:test';

await import('../shared/multipost-presets.js');

const Presets = globalThis.FunPayAutomationPresets;

test('normalizes preset categories and removes duplicates', () => {
  const preset = Presets.normalizePreset({
    id: 'services',
    name: 'Сервисы',
    categories: [
      { id: 4187, game: 'Claude', section: 'Услуги' },
      { id: '4187', name: 'Дубликат' },
      { id: '4093', name: 'Gemini · Услуги' }
    ]
  });

  assert.equal(preset.categories.length, 2);
  assert.equal(preset.categories[0].name, 'Claude · Услуги');
});

test('searches presets by name and included categories', () => {
  const presets = [
    {
      id: 'ai',
      name: 'ИИ-сервисы',
      categories: [{ id: '4187', name: 'Claude · Услуги' }]
    },
    {
      id: 'games',
      name: 'Игры',
      categories: [{ id: '100', name: 'Discord · Серверы' }]
    }
  ];

  assert.equal(Presets.filterPresets(presets, 'claude').length, 1);
  assert.equal(Presets.filterPresets(presets, 'игры')[0].id, 'games');
});

test('resolves current catalog names and excludes the source category', () => {
  const resolved = Presets.resolvePresetCategories(
    {
      id: 'ai',
      name: 'ИИ',
      categories: [
        { id: '1356', name: 'ChatGPT · Прочее' },
        { id: '4093', name: 'Старое название' }
      ]
    },
    [{ id: '4093', name: 'Gemini · Услуги' }],
    '1356'
  );

  assert.deepEqual(resolved, [{
    id: '4093',
    game: '',
    section: '',
    name: 'Gemini · Услуги'
  }]);
});

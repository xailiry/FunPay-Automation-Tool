import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/form-adapter.js');

const { TargetFormAdapter } = globalThis.FunPayAutomation;

test('adapts source values to target schema and drops incompatible fields', () => {
  const sourceForm = createForm([
    control({ name: 'csrf_token', type: 'hidden', value: 'source-token' }),
    control({
      name: 'source_summary',
      value: '60 промптов',
      label: 'Краткое описание'
    }),
    control({
      name: 'source_price',
      value: '2.40',
      label: 'Цена за 1 шт.'
    }),
    control({
      name: 'active',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Активное'
    }),
    control({
      name: 'auto_delivery',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Автоматическая выдача'
    }),
    control({ name: 'amount', type: 'number', value: '10', label: 'Наличие' })
  ]);
  const targetForm = createForm([
    control({ name: 'csrf_token', type: 'hidden', value: 'target-token' }),
    control({ name: 'node_id', type: 'hidden', value: '4093' }),
    control({
      name: 'target_title',
      value: '',
      label: 'Краткое описание'
    }),
    control({
      name: 'service_price',
      value: '',
      label: 'Цена'
    }),
    control({
      name: 'is_active',
      type: 'checkbox',
      value: '1',
      checked: false,
      label: 'Активное'
    }),
    control({
      name: 'deactivate_after_sale',
      type: 'hidden',
      value: '0'
    }),
    control({
      name: 'deactivate_after_sale',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Деактивировать после продажи'
    })
  ]);
  const adapter = new TargetFormAdapter(FakeFormData);

  const { formData, report } = adapter.build(sourceForm, targetForm, {
    nodeId: '4093',
    section: 'Услуги'
  });

  assert.deepEqual(formData.getAll('csrf_token'), ['target-token']);
  assert.deepEqual(formData.getAll('node_id'), ['4093']);
  assert.deepEqual(formData.getAll('target_title'), ['60 промптов']);
  assert.deepEqual(formData.getAll('service_price'), ['2.40']);
  assert.deepEqual(formData.getAll('is_active'), ['1']);
  assert.deepEqual(formData.getAll('deactivate_after_sale'), ['0']);
  assert.equal(formData.has('auto_delivery'), false);
  assert.equal(formData.has('amount'), false);
  assert.equal(report.forcedPersistent, true);
  assert.deepEqual(report.droppedFields.sort(), ['amount', 'auto_delivery']);
});

test('preserves target-only defaults outside service categories', () => {
  const sourceForm = createForm([
    control({ name: 'title', value: 'Offer', label: 'Краткое описание' })
  ]);
  const targetForm = createForm([
    control({ name: 'title', value: '', label: 'Краткое описание' }),
    control({
      name: 'deactivate_after_sale',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Деактивировать после продажи'
    })
  ]);
  const adapter = new TargetFormAdapter(FakeFormData);

  const { formData, report } = adapter.build(sourceForm, targetForm, {
    nodeId: '1356',
    section: 'Прочее'
  });

  assert.deepEqual(formData.getAll('title'), ['Offer']);
  assert.deepEqual(formData.getAll('deactivate_after_sale'), ['1']);
  assert.equal(report.forcedPersistent, false);
});

function createForm(elements) {
  return { elements };
}

function control({
  name,
  type = 'text',
  value = '',
  checked = false,
  label = '',
  disabled = false,
  tagName = 'INPUT'
}) {
  return {
    name,
    type,
    value,
    checked,
    disabled,
    tagName,
    labels: label ? [{ textContent: label }] : [],
    files: [],
    selectedOptions: [],
    getAttribute() {
      return null;
    }
  };
}

class FakeFormData {
  constructor(form) {
    this.values = new Map();

    for (const field of form.elements) {
      if (!field.name || field.disabled) continue;
      if (['button', 'submit', 'reset'].includes(field.type)) continue;
      if (
        ['checkbox', 'radio'].includes(field.type) &&
        !field.checked
      ) {
        continue;
      }
      this.append(field.name, field.value);
    }
  }

  append(name, value) {
    if (!this.values.has(name)) this.values.set(name, []);
    this.values.get(name).push(value);
  }

  delete(name) {
    this.values.delete(name);
  }

  getAll(name) {
    return this.values.get(name) || [];
  }

  has(name) {
    return this.values.has(name);
  }

  set(name, value) {
    this.values.set(name, [value]);
  }
}

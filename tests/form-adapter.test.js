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

  const customized = adapter.build(
    sourceForm,
    targetForm,
    { nodeId: '4093', section: 'Услуги' },
    { deactivate_after_sale: { values: ['1'] } }
  );
  assert.deepEqual(
    customized.formData.getAll('deactivate_after_sale'),
    ['0', '1']
  );
  assert.deepEqual(
    customized.report.overriddenFields,
    ['deactivate_after_sale']
  );
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

test('creates editable draft fields and applies per-category overrides', () => {
  const sourceForm = createForm([
    control({
      name: 'summary_ru',
      value: 'Исходный текст',
      label: 'Краткое описание · Русский'
    }),
    control({
      name: 'summary_en',
      value: 'Source text',
      label: 'Short description · English'
    }),
    control({
      name: 'buyer_message',
      value: 'Исходный автоответ',
      label: 'Сообщение покупателю после оплаты',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'active',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Активное'
    })
  ]);
  const targetForm = createForm([
    control({ name: 'node_id', type: 'hidden', value: '4187' }),
    control({
      name: 'title_ru',
      value: '',
      label: 'Краткое описание · Русский'
    }),
    control({
      name: 'title_en',
      value: '',
      label: 'Short description · English'
    }),
    control({
      name: 'payment_message',
      value: '',
      label: 'Сообщение покупателю после оплаты',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'is_active',
      type: 'checkbox',
      value: '1',
      checked: false,
      label: 'Активное'
    })
  ]);
  const adapter = new TargetFormAdapter(FakeFormData);
  const overrides = {
    title_ru: { values: ['Текст только для Claude'] },
    payment_message: { values: ['Другой автоответ'] },
    is_active: { values: [] }
  };

  const draft = adapter.createDraft(
    sourceForm,
    targetForm,
    { nodeId: '4187', section: 'Услуги' },
    overrides
  );
  const { formData } = adapter.build(
    sourceForm,
    targetForm,
    { nodeId: '4187', section: 'Услуги' },
    overrides
  );

  assert.equal(draft.find((field) => field.name === 'title_ru').values[0],
    'Текст только для Claude');
  assert.equal(
    draft.find((field) => field.name === 'title_en').values[0],
    'Source text'
  );
  assert.equal(
    draft.find((field) => field.name === 'payment_message').type,
    'textarea'
  );
  assert.equal(
    draft.find((field) => field.name === 'is_active').checked,
    false
  );
  assert.deepEqual(formData.getAll('title_ru'), ['Текст только для Claude']);
  assert.deepEqual(formData.getAll('payment_message'), ['Другой автоответ']);
  assert.deepEqual(formData.getAll('is_active'), []);
  assert.deepEqual(
    adapter.build(
      sourceForm,
      targetForm,
      { nodeId: '4187', section: 'Услуги' },
      overrides
    ).report.overriddenFields.sort(),
    ['is_active', 'payment_message', 'title_ru']
  );
});

test('adapts the real Claude services form without losing localized fields', () => {
  const sourceForm = createForm([
    control({ name: 'csrf_token', type: 'hidden', value: 'source-token' }),
    control({ name: 'node_id', type: 'hidden', value: 'source-node' }),
    control({ name: 'fields[summary][ru]', value: '60 промптов' }),
    control({ name: 'fields[summary][en]', value: '60 prompts' }),
    control({
      name: 'fields[desc][ru]',
      value: 'Описание на русском',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'fields[desc][en]',
      value: 'English description',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'fields[payment_msg][ru]',
      value: 'Инструкция после оплаты',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'fields[payment_msg][en]',
      value: 'Instructions after payment',
      tagName: 'TEXTAREA'
    }),
    control({ name: 'price', value: '123' }),
    control({ name: 'amount', type: 'number', value: '34' }),
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
    })
  ]);
  const targetForm = createForm([
    control({ name: 'csrf_token', type: 'hidden', value: 'target-token' }),
    control({ name: 'form_created_at', type: 'hidden', value: 'created-at' }),
    control({ name: 'offer_id', type: 'hidden', value: '' }),
    control({ name: 'node_id', type: 'hidden', value: '4187' }),
    control({ name: 'location', type: 'hidden', value: '' }),
    control({ name: 'deleted', type: 'hidden', value: '' }),
    control({ name: 'fields[summary][ru]', value: '' }),
    control({ name: 'fields[summary][en]', value: '' }),
    control({ name: 'fields[desc][ru]', value: '', tagName: 'TEXTAREA' }),
    control({ name: 'fields[desc][en]', value: '', tagName: 'TEXTAREA' }),
    control({
      name: 'fields[payment_msg][ru]',
      value: '',
      tagName: 'TEXTAREA'
    }),
    control({
      name: 'fields[payment_msg][en]',
      value: '',
      tagName: 'TEXTAREA'
    }),
    control({ name: 'fields[images]', type: 'hidden', value: '' }),
    control({ name: 'price', value: '' }),
    control({
      name: 'active',
      type: 'checkbox',
      value: '1',
      checked: true,
      label: 'Активное'
    }),
    control({ name: 'deactivate_after_sale', type: 'hidden', value: '0' }),
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
    nodeId: '4187',
    section: 'Услуги'
  });
  const draft = adapter.createDraft(sourceForm, targetForm, {
    nodeId: '4187',
    section: 'Услуги'
  });

  assert.deepEqual(formData.getAll('csrf_token'), ['target-token']);
  assert.deepEqual(formData.getAll('form_created_at'), ['created-at']);
  assert.deepEqual(formData.getAll('node_id'), ['4187']);
  assert.deepEqual(formData.getAll('fields[summary][ru]'), ['60 промптов']);
  assert.deepEqual(formData.getAll('fields[summary][en]'), ['60 prompts']);
  assert.deepEqual(formData.getAll('fields[desc][ru]'), ['Описание на русском']);
  assert.deepEqual(formData.getAll('fields[desc][en]'), ['English description']);
  assert.deepEqual(
    formData.getAll('fields[payment_msg][ru]'),
    ['Инструкция после оплаты']
  );
  assert.deepEqual(
    formData.getAll('fields[payment_msg][en]'),
    ['Instructions after payment']
  );
  assert.deepEqual(formData.getAll('price'), ['123']);
  assert.deepEqual(formData.getAll('active'), ['1']);
  assert.deepEqual(formData.getAll('deactivate_after_sale'), ['0']);
  assert.equal(formData.has('amount'), false);
  assert.equal(formData.has('auto_delivery'), false);
  assert.equal(report.forcedPersistent, true);
  assert.equal(
    draft.find((field) => field.name === 'fields[summary][ru]').language,
    'ru'
  );
  assert.equal(
    draft.find((field) => field.name === 'fields[summary][en]').language,
    'en'
  );
  assert.match(
    draft.find((field) => field.name === 'fields[summary][ru]').label,
    /Русский$/
  );
  assert.match(
    draft.find((field) => field.name === 'fields[summary][en]').label,
    /English$/
  );
  assert.equal(
    draft.find((field) => field.name === 'price').language,
    null
  );
  assert.equal(
    draft.find((field) => field.name === 'active').language,
    null
  );
  assert.equal(
    draft.find((field) => field.name === 'deactivate_after_sale').language,
    null
  );
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
    options: [],
    closest() {
      return null;
    },
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

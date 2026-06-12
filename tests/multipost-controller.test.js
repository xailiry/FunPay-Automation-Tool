import assert from 'node:assert/strict';
import test from 'node:test';

await import('../multipost-presets.js');

globalThis.FunPayAutomation = {
  Config: {
    multiPostDelayMs: 0,
    nativeSubmitDelayMs: 0,
    maxVisibleCategories: 120,
    maxMultiPostTargets: 20
  },
  Utils: {
    createMultiPostSummary(startedAt, results) {
      return {
        startedAt,
        results,
        successCount: results.filter((item) => item.status === 'success').length,
        failedCount: results.filter((item) => item.status === 'failed').length
      };
    },
    delay() {
      return Promise.resolve();
    },
    findSubmitButton() {
      return { disabled: false };
    },
    getCurrentNodeId() {
      return '1356';
    },
    getErrorMessage(error) {
      return error instanceof Error ? error.message : String(error);
    },
    isSubmitControl() {
      return false;
    }
  }
};
globalThis.chrome = {
  storage: {
    local: {
      async set() {}
    }
  }
};

await import('../content/multipost-controller.js');

const { MultiPostController } = globalThis.FunPayAutomation;

test('does not submit the original form when a copy fails', async () => {
  let nativeSubmitCount = 0;
  const view = createView();
  const form = {
    addEventListener() {},
    requestSubmit() {
      nativeSubmitCount += 1;
    }
  };
  const controller = new MultiPostController({
    form,
    view,
    catalog: {},
    client: {
      async submitCopy() {
        throw new Error('Gemini rejected the copy');
      }
    }
  });
  controller.selectedCategories.set('4093', {
    id: '4093',
    name: 'Gemini · Услуги'
  });

  await controller.handleSubmit(createSubmitEvent());

  assert.equal(nativeSubmitCount, 0);
  assert.equal(controller.selectedCategories.size, 1);
  assert.match(view.notice.message, /Исходное объявление не сохранено/);
  assert.equal(view.notice.type, 'error');
});

test('submits the original form after every copy succeeds', async () => {
  let nativeSubmitCount = 0;
  const view = createView();
  const form = {
    addEventListener() {},
    requestSubmit() {
      nativeSubmitCount += 1;
    }
  };
  const controller = new MultiPostController({
    form,
    view,
    catalog: {},
    client: {
      async submitCopy(_form, target) {
        return {
          nodeId: target.nodeId,
          name: target.name,
          status: 'success'
        };
      }
    }
  });
  controller.selectedCategories.set('4093', {
    id: '4093',
    name: 'Gemini · Услуги'
  });

  await controller.handleSubmit(createSubmitEvent());

  assert.equal(nativeSubmitCount, 1);
  assert.equal(controller.selectedCategories.size, 0);
});

test('continues publishing after an error when stop-on-error is disabled', async () => {
  const attempted = [];
  const controller = new MultiPostController({
    form: { addEventListener() {} },
    view: createView(),
    catalog: {},
    client: {
      async submitCopy(_form, target) {
        attempted.push(target.nodeId);
        if (target.nodeId === '1') throw new Error('first failed');
        return {
          nodeId: target.nodeId,
          name: target.name,
          status: 'success'
        };
      }
    }
  });
  controller.options = {
    ...controller.options,
    multipostDelayMs: 300,
    stopOnError: false
  };

  const results = await controller.publishCopies([
    { nodeId: '1', name: 'First' },
    { nodeId: '2', name: 'Second' }
  ]);

  assert.deepEqual(attempted, ['1', '2']);
  assert.equal(results.length, 2);
  assert.equal(results[0].status, 'failed');
  assert.equal(results[1].status, 'success');
});

test('applies a preset as editable selected categories', () => {
  const view = createView();
  const controller = new MultiPostController({
    form: { addEventListener() {} },
    view,
    catalog: {},
    client: {}
  });
  controller.categories = [
    { id: '4093', name: 'Gemini · Услуги', game: 'Gemini', section: 'Услуги' }
  ];

  controller.applyPreset({
    id: 'ai',
    name: 'ИИ-сервисы',
    categories: [
      { id: '4093', name: 'Старое название' },
      { id: '1356', name: 'Текущая категория' }
    ]
  });

  assert.equal(controller.selectedCategories.size, 1);
  assert.equal(
    controller.selectedCategories.get('4093').name,
    'Gemini · Услуги'
  );
  assert.equal(view.presetPanelOpen, false);
  assert.match(view.notice.message, /ИИ-сервисы/);
});

function createSubmitEvent() {
  return {
    submitter: { disabled: false },
    preventDefault() {},
    stopImmediatePropagation() {}
  };
}

function createView() {
  return {
    notice: { message: '', type: '' },
    presetPanelOpen: true,
    setBusy() {},
    setSubmitDisabled() {},
    showProgress() {},
    hideProgress() {},
    updateProgress() {},
    renderSelection() {},
    renderCategories() {},
    renderPresets() {},
    setCategoryMeta() {},
    showNotice(message, type) {
      this.notice = { message, type };
    },
    setPresetPanelOpen(open) {
      this.presetPanelOpen = open;
    }
  };
}

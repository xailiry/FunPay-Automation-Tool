import assert from 'node:assert/strict';
import test from 'node:test';

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
    setBusy() {},
    setSubmitDisabled() {},
    showProgress() {},
    hideProgress() {},
    updateProgress() {},
    renderSelection() {},
    renderCategories() {},
    setCategoryMeta() {},
    showNotice(message, type) {
      this.notice = { message, type };
    }
  };
}

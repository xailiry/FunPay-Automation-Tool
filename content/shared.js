(() => {
  const namespace = globalThis.FunPayAutomation ||= {};

  namespace.Config = Object.freeze({
    multiPostDelayMs: 700,
    nativeSubmitDelayMs: 700,
    maxVisibleCategories: 120,
    maxMultiPostTargets: 20
  });

  namespace.Utils = Object.freeze({
    createEmptyState,
    createMultiPostSummary,
    delay,
    findOfferForm,
    findSubmitButton,
    getCurrentNodeId,
    getErrorMessage,
    isLoginResponse,
    isSubmitControl,
    normalizeMessage,
    tryParseJson
  });

  function createMultiPostSummary(startedAt, results) {
    return {
      status: 'completed',
      startedAt,
      finishedAt: Date.now(),
      successCount: results.filter((item) => item.status === 'success').length,
      failedCount: results.filter((item) => item.status === 'failed').length,
      results
    };
  }

  function findOfferForm() {
    return (
      document.querySelector('form.js-lot-form') ||
      document.querySelector('form[action*="offerSave"]')
    );
  }

  function findSubmitButton(form) {
    return form.querySelector(
      'button[type="submit"], input[type="submit"], .btn-primary'
    );
  }

  function getCurrentNodeId(form) {
    return new FormData(form).get('node_id')?.toString() || null;
  }

  function createEmptyState(text) {
    const element = document.createElement('div');
    element.className = 'fp-empty';
    element.textContent = text;
    return element;
  }

  function isSubmitControl(element) {
    if (element instanceof HTMLButtonElement) {
      return element.type === 'submit';
    }

    if (element instanceof HTMLInputElement) {
      return element.type === 'submit' || element.type === 'image';
    }

    return false;
  }

  function isLoginResponse(url, text) {
    let pathname = '';

    try {
      pathname = new URL(url).pathname.toLowerCase();
    } catch {
      // Mocked responses may not expose a URL.
    }

    return (
      pathname.includes('/account/login') ||
      (
        /name=["']login["']/i.test(text) &&
        /name=["']password["']/i.test(text)
      )
    );
  }

  function tryParseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function normalizeMessage(value) {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
      return Object.values(value).filter(Boolean).join(', ');
    }
    return '';
  }

  function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();

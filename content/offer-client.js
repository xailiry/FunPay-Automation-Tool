(() => {
  const namespace = globalThis.FunPayAutomation;
  const {
    isLoginResponse,
    normalizeMessage,
    tryParseJson
  } = namespace.Utils;

  namespace.FunPayOfferClient = class FunPayOfferClient {
    constructor(adapter = new namespace.TargetFormAdapter()) {
      this.adapter = adapter;
    }

    async submitCopy(form, target) {
      const targetSchema = await this.loadTargetForm(target.nodeId);
      const { formData, report } = this.adapter.build(
        form,
        targetSchema.form,
        target,
        target.overrides
      );

      let response;

      try {
        response = await fetch(
          targetSchema.action,
          {
            method: (targetSchema.form.method || 'POST').toUpperCase(),
            body: formData,
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              'x-requested-with': 'XMLHttpRequest'
            }
          }
        );
      } catch {
        throw new Error('Нет соединения с FunPay');
      }

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (isLoginResponse(response.url, text)) {
        throw new Error('Сессия FunPay истекла');
      }

      const data = tryParseJson(text);
      if (!data) {
        throw new Error('FunPay вернул неожиданный ответ');
      }

      const errorMessage = normalizeMessage(
        data.error || data.message || data.msg
      );

      if (data.success === false || data.status === 'error' || data.error) {
        throw new Error(errorMessage || 'FunPay отклонил публикацию');
      }

      return {
        nodeId: target.nodeId,
        name: target.name,
        status: 'success',
        message: normalizeMessage(data.message || data.msg) || 'Копия создана',
        adaptation: report
      };
    }

    async prepareDraft(form, target) {
      const targetSchema = await this.loadTargetForm(target.nodeId);

      return {
        fields: this.adapter.createDraft(
          form,
          targetSchema.form,
          target,
          target.overrides
        )
      };
    }

    async loadTargetForm(nodeId) {
      let response;

      try {
        response = await fetch(`/lots/${nodeId}/trade`, {
          credentials: 'same-origin',
          cache: 'no-store'
        });
      } catch {
        throw new Error('Не удалось загрузить форму целевой категории');
      }

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`Форма категории вернула HTTP ${response.status}`);
      }

      if (isLoginResponse(response.url, text)) {
        throw new Error('Сессия FunPay истекла');
      }

      const document = new DOMParser().parseFromString(text, 'text/html');
      const form =
        document.querySelector('form.js-lot-form') ||
        document.querySelector('form[action*="offerSave"]');

      if (!form) {
        throw new Error('FunPay не вернул форму целевой категории');
      }

      return {
        form,
        action: new URL(
          form.getAttribute('action') || '/lots/offerSave',
          location.origin
        )
      };
    }
  };
})();

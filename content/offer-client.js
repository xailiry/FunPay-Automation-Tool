(() => {
  const namespace = globalThis.FunPayAutomation;
  const {
    isLoginResponse,
    normalizeMessage,
    sendRuntimeMessage,
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

      const response = await this.requestPage({
        url: targetSchema.action,
        method: (targetSchema.form.method || 'POST').toUpperCase(),
        entries: serializeFormData(formData),
        headers: {
          'x-requested-with': 'XMLHttpRequest'
        }
      });
      const text = response.text;

      if (!response.ok) {
        const failedData = tryParseJson(text);
        const failedMessage = normalizeMessage(
          failedData?.error || failedData?.message || failedData?.msg
        );
        throw new Error(failedMessage || `HTTP ${response.status}`);
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
      const response = await this.requestPage({
        url: new URL(
          `/lots/offerEdit?node=${encodeURIComponent(nodeId)}`,
          location.origin
        ),
        method: 'GET'
      });
      const text = response.text;

      if (!response.ok) {
        throw new Error(`Форма категории вернула HTTP ${response.status}`);
      }

      if (isLoginResponse(response.url, text)) {
        throw new Error('Сессия FunPay истекла');
      }

      const document = new DOMParser().parseFromString(text, 'text/html');
      const form =
        document.querySelector('form.form-offer-editor') ||
        document.querySelector('form.js-lot-form') ||
        document.querySelector('form[action*="offerSave"]') ||
        [...document.forms].find((candidate) =>
          candidate.querySelector('[name="node_id"]') &&
          candidate.querySelector('input, textarea, select')
        );

      if (!form) {
        throw new Error('FunPay не вернул форму целевой категории');
      }

      return {
        form,
        action: new URL(
          form.getAttribute('action') || '/lots/offerSave',
          response.url || location.origin
        )
      };
    }

    async requestPage(request) {
      let response;

      try {
        response = await sendRuntimeMessage({
          action: 'requestFunPayPage',
          request: {
            ...request,
            url: request.url.toString()
          }
        });
      } catch {
        throw new Error('Нет соединения с вкладкой FunPay');
      }

      if (!response?.ok || !response.response) {
        throw new Error(response?.error || 'FunPay не вернул ответ');
      }

      return response.response;
    }
  };

  function serializeFormData(formData) {
    const entries = [];

    for (const [name, value] of formData.entries()) {
      if (typeof value === 'string') {
        entries.push([name, value]);
        continue;
      }

      if (!value?.name && !value?.size) continue;

      throw new Error(
        'Новые изображения нельзя перенести в копию автоматически. ' +
        'Сначала сохраните объявление без новых файлов.'
      );
    }

    return entries;
  }
})();

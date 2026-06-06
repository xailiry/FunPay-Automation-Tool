(() => {
  const namespace = globalThis.FunPayAutomation;
  const {
    isLoginResponse,
    normalizeMessage,
    tryParseJson
  } = namespace.Utils;

  namespace.FunPayOfferClient = class FunPayOfferClient {
    async submitCopy(form, target) {
      const formData = new FormData(form);
      formData.set('node_id', target.nodeId);

      let response;

      try {
        response = await fetch(
          new URL(form.action || '/lots/offerSave', location.origin),
          {
            method: (form.method || 'POST').toUpperCase(),
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
        message: normalizeMessage(data.message || data.msg) || 'Копия создана'
      };
    }
  };
})();

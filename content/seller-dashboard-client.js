(() => {
  const namespace = globalThis.FunPayAutomation;
  const {
    isLoginResponse,
    normalizeMessage,
    sendRuntimeMessage,
    tryParseJson
  } = namespace.Utils;
  const CACHE_TTL_MS = 5 * 60 * 1000;

  namespace.SellerDashboardClient = class SellerDashboardClient {
    constructor({
      storage = chrome.storage.local,
      now = Date.now,
      messenger = sendRuntimeMessage
    } = {}) {
      this.storage = storage;
      this.now = now;
      this.messenger = messenger;
    }

    async getOrders(userId, forceRefresh = false) {
      const cached = await this.readCache(userId);

      if (!forceRefresh && cached && this.now() - cached.updatedAt < CACHE_TTL_MS) {
        return { ...cached, cached: true, stale: false };
      }

      try {
        const response = await this.requestPage({
          url: new URL('/orders/trade', location.origin),
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`Продажи FunPay вернули HTTP ${response.status}`);
        }

        if (isLoginResponse(response.url, response.text)) {
          throw new Error('Сессия FunPay истекла');
        }

        const document = new DOMParser().parseFromString(
          response.text,
          'text/html'
        );
        const orders = namespace.SellerDashboardData.parseOrdersDocument(document);
        const result = {
          userId,
          orders,
          updatedAt: this.now()
        };
        await this.storage.set({ sellerDashboardOrders: result });
        return { ...result, cached: false, stale: false };
      } catch (error) {
        if (cached) {
          return {
            ...cached,
            cached: true,
            stale: true,
            warning: error instanceof Error ? error.message : String(error)
          };
        }

        throw error;
      }
    }

    async deleteOffer({ offerId, nodeId }) {
      let envelope;

      try {
        envelope = await this.messenger({
          action: 'deleteFunPayOffer',
          offerId: String(offerId),
          nodeId: String(nodeId)
        });
      } catch {
        throw new Error('Нет соединения с вкладкой FunPay');
      }

      if (!envelope?.ok || !envelope.response) {
        throw new Error(envelope?.error || 'FunPay не вернул результат удаления');
      }
      const response = envelope.response;

      if (!response.ok) {
        throw new Error(`Удаление вернуло HTTP ${response.status}`);
      }
      if (isLoginResponse(response.url, response.text)) {
        throw new Error('Сессия FunPay истекла');
      }

      return parseMutationResponse(
        response.text,
        'FunPay отклонил удаление объявления'
      );
    }

    async updateOfferStatus({ offerId, nodeId, active }) {
      const { form, action } = await this.loadOfferForm({ offerId, nodeId });

      const formData = new FormData(form);
      if (active) {
        formData.set('active', 'on');
      } else {
        formData.delete('active');
      }

      const saveResponse = await this.requestPage({
        url: action,
        method: 'POST',
        entries: serializeFormData(formData),
        headers: {
          'x-requested-with': 'XMLHttpRequest'
        }
      });

      if (!saveResponse.ok) {
        throw new Error(`Сохранение вернуло HTTP ${saveResponse.status}`);
      }
      if (isLoginResponse(saveResponse.url, saveResponse.text)) {
        throw new Error('Сессия FunPay истекла');
      }

      return parseMutationResponse(
        saveResponse.text,
        'FunPay отклонил сохранение объявления'
      );
    }

    async triggerBump() {
      let response;

      try {
        response = await this.messenger({ action: 'triggerBumpNow' });
      } catch {
        throw new Error('Нет соединения с расширением');
      }

      if (!response?.ok || !response.result) {
        throw new Error(response?.error || 'Не удалось поднять объявления');
      }

      return response.result;
    }

    async loadOfferForm({ offerId, nodeId }) {
      const response = await this.requestPage({
        url: new URL(
          `/lots/offerEdit?node=${encodeURIComponent(nodeId)}&offer=${encodeURIComponent(offerId)}`,
          location.origin
        ),
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Форма объявления вернула HTTP ${response.status}`);
      }
      if (isLoginResponse(response.url, response.text)) {
        throw new Error('Сессия FunPay истекла');
      }

      const document = new DOMParser().parseFromString(
        response.text,
        'text/html'
      );
      const form =
        document.querySelector('form.form-offer-editor') ||
        document.querySelector('form[action*="offerSave"]');

      if (!form) {
        throw new Error('FunPay не вернул форму объявления');
      }

      const formOfferId = form.querySelector('[name="offer_id"]')?.value;
      const formNodeId = form.querySelector('[name="node_id"]')?.value;
      if (
        String(formOfferId || '') !== String(offerId) ||
        String(formNodeId || '') !== String(nodeId)
      ) {
        throw new Error('FunPay вернул форму другого объявления');
      }

      return {
        form,
        action: new URL(
          form.getAttribute('action') || '/lots/offerSave',
          response.url || location.origin
        )
      };
    }

    async readCache(userId) {
      const stored = await this.storage.get(['sellerDashboardOrders']);
      const cache = stored.sellerDashboardOrders;

      return cache?.userId === userId && Array.isArray(cache.orders)
        ? cache
        : null;
    }

    async requestPage(request) {
      let response;

      try {
        response = await this.messenger({
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

  function parseMutationResponse(text, fallbackMessage) {
    const data = tryParseJson(text);
    if (!data) {
      throw new Error('FunPay вернул неожиданный ответ');
    }

    const message = normalizeMessage(
      data.error || data.msg || data.message
    );
    if (data.error || data.success === false || data.status === 'error') {
      throw new Error(message || fallbackMessage);
    }

    return data;
  }

  function serializeFormData(formData) {
    const entries = [];
    for (const [name, value] of formData.entries()) {
      if (typeof value === 'string') entries.push([name, value]);
    }
    return entries;
  }
})();

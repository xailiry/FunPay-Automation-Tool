import {
  isAuthenticationPage,
  tryParseJson
} from './response-utils.js';

const FUNPAY_ORIGIN = 'https://funpay.com';

export class FunPayClient {
  constructor(fetchImplementation = globalThis.fetch.bind(globalThis)) {
    this.fetch = fetchImplementation;
  }

  getHomePage() {
    return this.request(`${FUNPAY_ORIGIN}/`);
  }

  getProfilePage(userId) {
    return this.request(`${FUNPAY_ORIGIN}/users/${userId}/`);
  }

  getCategoryPage(nodeId) {
    return this.request(`${FUNPAY_ORIGIN}/lots/${nodeId}/trade`);
  }

  raiseCategory(gameId, nodeId) {
    const formData = new FormData();
    formData.set('game_id', gameId);
    formData.set('node_id', nodeId);

    return this.request(`${FUNPAY_ORIGIN}/lots/raise`, {
      method: 'POST',
      body: formData,
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    });
  }

  async request(url, options = {}) {
    let response;

    try {
      response = await this.fetch(url, {
        credentials: 'include',
        cache: 'no-store',
        redirect: 'follow',
        ...options
      });
    } catch {
      throw new Error('Не удалось связаться с FunPay.');
    }

    const text = await response.text();

    if (isAuthenticationPage(response.url, text)) {
      throw new Error('Сессия FunPay не найдена или истекла.');
    }

    if (!response.ok) {
      throw new Error(`FunPay вернул ошибку HTTP ${response.status}.`);
    }

    return {
      url: response.url,
      text,
      contentType: response.headers.get('content-type') || '',
      json: tryParseJson(text)
    };
  }
}

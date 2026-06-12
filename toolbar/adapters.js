(() => {
  const namespace = globalThis.FunPayAutomationToolbar;

  namespace.Adapters = Object.freeze({
    clearCaches,
    getAccount,
    getCategories,
    getDiagnostics,
    getExtensionState,
    getLinks,
    openUrl,
    setAutoBump,
    triggerBump
  });

  function getAccount() {
    let appData = {};
    try {
      appData = JSON.parse(document.body?.dataset.appData || '{}');
    } catch {
      // FunPay occasionally renders a page without account metadata.
    }

    const profileLink = document.querySelector(
      '.user-link-dropdown[href*="/users/"], .navbar a[href*="/users/"], a.user-link[href*="/users/"]'
    );
    const avatarImg = document.querySelector('.user-link-photo img');
    const avatarUrl = avatarImg?.src || '';
    const profileUrl = profileLink?.href || '';
    const userId =
      String(appData.userId || '') ||
      profileUrl.match(/\/users\/(\d+)/)?.[1] ||
      '';

    return {
      userId,
      username:
        appData.username ||
        readUsername(profileLink?.textContent) ||
        (userId ? `Пользователь ${userId}` : 'Гость'),
      authenticated: Boolean(userId),
      profileUrl: profileUrl || (userId ? `${location.origin}/users/${userId}/` : ''),
      avatarUrl
    };
  }

  function readUsername(value) {
    return String(value || '')
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find((part) => part && part.toLocaleLowerCase('ru') !== 'профиль') || '';
  }

  function getLinks() {
    const account = getAccount();
    return {
      profile: account.profileUrl || `${location.origin}/`,
      sales: `${location.origin}/orders/trade`,
      createOffer: `${location.origin}/lots/offerEdit`,
      home: `${location.origin}/`
    };
  }

  async function getExtensionState() {
    return sendMessage({ action: 'getExtensionState' });
  }

  async function getCategories(forceRefresh = false) {
    const Catalog = globalThis.FunPayAutomation?.CategoryCatalog;
    if (!Catalog) {
      throw new Error('Каталог категорий расширения не загружен.');
    }
    return new Catalog().getCategories(forceRefresh);
  }

  async function setAutoBump(enabled) {
    return sendMessage({ action: 'setAutoBump', enabled });
  }

  async function triggerBump() {
    const response = await sendMessage({ action: 'triggerBumpNow' });
    if (!response?.result) {
      throw new Error(response?.error || 'Поднятие не вернуло результат.');
    }
    return response.result;
  }

  async function getDiagnostics() {
    const stored = await chrome.storage.local.get([
      'funpayCategories',
      'funpayCategoriesUpdatedAt',
      'sellerDashboardOrders',
      'sellerDashboardOffers',
      'lastBumpResult',
      'lastMultiPostResult'
    ]);
    return {
      categories: Array.isArray(stored.funpayCategories)
        ? stored.funpayCategories.length
        : 0,
      categoriesUpdatedAt: stored.funpayCategoriesUpdatedAt || null,
      salesUpdatedAt: stored.sellerDashboardOrders?.updatedAt || null,
      cachedOfferGroups: stored.sellerDashboardOffers?.groups?.length || 0,
      lastBumpResult: stored.lastBumpResult || null,
      lastMultiPostResult: stored.lastMultiPostResult || null
    };
  }

  async function clearCaches() {
    await chrome.storage.local.remove([
      'funpayCategories',
      'funpayCategoriesUpdatedAt',
      'sellerDashboardOrders',
      'sellerDashboardOffers'
    ]);
  }

  function openUrl(url) {
    location.href = url;
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.ok) {
          reject(new Error(response?.error || 'Расширение не вернуло ответ.'));
          return;
        }
        resolve(response);
      });
    });
  }
})();

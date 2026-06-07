import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {
  SellerDashboardData: {
    aggregateOrders() {
      return {
        orderCount: 0,
        revenue: 0,
        average: 0,
        refundCount: 0,
        refundAmount: 0,
        currency: '₽',
        topProducts: []
      };
    },
    createOfferSalesMap() {
      return new Map();
    }
  }
};
await import('../content/seller-dashboard-controller.js');

const { SellerDashboardController } = globalThis.FunPayAutomation;

test('keeps a successful FunPay status update successful when cache writing fails', async () => {
  const offer = createOffer();
  const messages = [];
  const controller = new SellerDashboardController({
    profile: createProfile(offer),
    view: createView(messages),
    client: {
      async updateOfferStatus() {}
    },
    offerStore: {
      async updateOfferStatus() {
        throw new Error('storage unavailable');
      }
    }
  });

  controller.toggleActiveState(offer.offerId, false);
  await controller.saveChanges();

  assert.equal(offer.active, false);
  assert.equal(controller.pendingActiveChanges.size, 0);
  assert.match(messages.at(-1).message, /Локальный список/);
  assert.doesNotMatch(messages.at(-1).message, /Ошибок/);
});

test('removes an offer after FunPay deletion even when cache writing fails', async () => {
  const offer = createOffer();
  const profile = createProfile(offer);
  const messages = [];
  const view = createView(messages);
  view.confirmDelete = async () => true;
  let deletion;
  const controller = new SellerDashboardController({
    profile,
    view,
    client: {
      async deleteOffer(request) {
        deletion = request;
      }
    },
    offerStore: {
      async removeOffer() {
        throw new Error('storage unavailable');
      }
    }
  });

  await controller.deleteOffer(offer);

  assert.deepEqual(deletion, {
    offerId: offer.offerId,
    nodeId: offer.nodeId
  });
  assert.deepEqual(profile.groups[0].offers, []);
  assert.equal(view.removedOfferId, offer.offerId);
  assert.match(messages.at(-1).message, /Объявление удалено/);
});

test('removes a restored cache entry without calling FunPay', async () => {
  const offer = {
    ...createOffer(),
    active: false,
    restoredFromCache: true
  };
  const profile = createProfile(offer);
  const messages = [];
  const view = createView(messages);
  view.confirmDelete = async () => true;
  let networkCalls = 0;
  let removedFromCache;
  const controller = new SellerDashboardController({
    profile,
    view,
    client: {
      async deleteOffer() {
        networkCalls += 1;
      }
    },
    offerStore: {
      async removeOffer(userId, offerId) {
        removedFromCache = { userId, offerId };
      }
    }
  });

  await controller.deleteOffer(offer);

  assert.equal(networkCalls, 0);
  assert.deepEqual(removedFromCache, {
    userId: '42',
    offerId: offer.offerId
  });
  assert.deepEqual(profile.groups[0].offers, []);
  assert.equal(view.removedOfferId, offer.offerId);
  assert.equal(messages.at(-1).message, 'Локальная запись убрана.');
});

function createOffer() {
  return {
    offerId: '69880658',
    nodeId: '1356',
    title: 'Тестовое объявление',
    titleKey: 'тестовое объявление',
    categoryKey: 'chatgpt прочее',
    active: true,
    restoredFromCache: false
  };
}

function createProfile(offer) {
  return {
    profileUserId: '42',
    groups: [{
      nodeId: offer.nodeId,
      offers: [offer]
    }]
  };
}

function createView(messages) {
  return {
    applyOffers() {},
    confirmDelete: async () => false,
    renderMetrics() {},
    removeOffer(offerId) {
      this.removedOfferId = offerId;
    },
    setBusyOffer() {},
    setOfferActive() {},
    setSaveState() {},
    showToast(message, type = '') {
      messages.push({ message, type });
    }
  };
}

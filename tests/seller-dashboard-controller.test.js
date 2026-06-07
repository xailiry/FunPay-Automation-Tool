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
  const controller = new SellerDashboardController({
    profile,
    view,
    client: {
      async deleteOffer() {}
    },
    offerStore: {
      async removeOffer() {
        throw new Error('storage unavailable');
      }
    }
  });

  await controller.deleteOffer(offer);

  assert.deepEqual(profile.groups[0].offers, []);
  assert.equal(view.removedOfferId, offer.offerId);
  assert.match(messages.at(-1).message, /Объявление удалено/);
});

function createOffer() {
  return {
    offerId: '69880658',
    nodeId: '1356',
    title: 'Тестовое объявление',
    titleKey: 'тестовое объявление',
    categoryKey: 'chatgpt прочее',
    active: true
  };
}

function createProfile(offer) {
  return {
    profileUserId: '42',
    csrfToken: 'csrf',
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

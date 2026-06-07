import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/seller-offer-store.js');

const { SellerOfferStore } = globalThis.FunPayAutomation;

test('hydrates cached offers as inactive and keeps current offers active', async () => {
  const storage = createStorage({
    sellerDashboardOffers: {
      version: 1,
      userId: '42',
      updatedAt: 900,
      groups: [{
        nodeId: '1356',
        title: 'ChatGPT · Прочее',
        categoryKey: 'chatgpt прочее',
        offers: [
          storedOffer('current', true, 800),
          storedOffer('inactive', true, 800)
        ]
      }]
    }
  });
  const store = new SellerOfferStore({ storage, now: () => 1000 });
  const profile = {
    profileUserId: '42',
    groups: [{
      nodeId: '1356',
      title: 'ChatGPT · Прочее',
      categoryKey: 'chatgpt прочее',
      element: {},
      table: {},
      offers: [profileOffer('current')]
    }]
  };

  await store.hydrate(profile);

  assert.deepEqual(
    profile.groups[0].offers.map(({ offerId, active }) => ({ offerId, active })),
    [
      { offerId: 'current', active: true },
      { offerId: 'inactive', active: false }
    ]
  );
  assert.equal(
    storage.state.sellerDashboardOffers.groups[0].offers[0].lastSeenAt,
    1000
  );
});

test('updates cached status and removes deleted offers', async () => {
  const storage = createStorage({
    sellerDashboardOffers: {
      version: 1,
      userId: '42',
      updatedAt: 900,
      groups: [{
        nodeId: '1356',
        title: 'ChatGPT · Прочее',
        categoryKey: 'chatgpt прочее',
        offers: [
          storedOffer('first', true, 800),
          storedOffer('second', false, 800)
        ]
      }]
    }
  });
  const store = new SellerOfferStore({ storage, now: () => 1000 });

  await store.updateOfferStatus('42', 'first', false);
  await store.removeOffer('42', 'second');

  const [remaining] =
    storage.state.sellerDashboardOffers.groups[0].offers;
  assert.equal(remaining.offerId, 'first');
  assert.equal(remaining.active, false);
  assert.equal(remaining.lastSeenAt, 1000);
});

test('drops inactive offers that have not been seen for 30 days', async () => {
  const now = 40 * 24 * 60 * 60 * 1000;
  const storage = createStorage({
    sellerDashboardOffers: {
      version: 1,
      userId: '42',
      updatedAt: 0,
      groups: [{
        nodeId: '1356',
        title: 'ChatGPT · Прочее',
        categoryKey: 'chatgpt прочее',
        offers: [storedOffer('stale', false, 1)]
      }]
    }
  });
  const store = new SellerOfferStore({ storage, now: () => now });
  const profile = { profileUserId: '42', groups: [] };

  await store.hydrate(profile);

  assert.deepEqual(profile.groups, []);
  assert.deepEqual(storage.state.sellerDashboardOffers.groups, []);
});

function createStorage(initialState) {
  return {
    state: structuredClone(initialState),
    async get(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => key in this.state)
          .map((key) => [key, structuredClone(this.state[key])])
      );
    },
    async set(values) {
      Object.assign(this.state, structuredClone(values));
    }
  };
}

function profileOffer(offerId) {
  return {
    ...storedOffer(offerId, true, 0),
    element: {},
    wrapper: null,
    salesElement: null
  };
}

function storedOffer(offerId, active, lastSeenAt) {
  return {
    offerId,
    nodeId: '1356',
    categoryTitle: 'ChatGPT · Прочее',
    categoryKey: 'chatgpt прочее',
    title: `Offer ${offerId}`,
    titleKey: `offer ${offerId}`,
    price: 10,
    currency: '₽',
    autoDelivery: false,
    publicUrl: `https://funpay.com/lots/offerEdit?node=1356&offer=${offerId}`,
    editUrl: `https://funpay.com/lots/offerEdit?node=1356&offer=${offerId}`,
    active,
    lastSeenAt
  };
}

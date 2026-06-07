(() => {
  const namespace = globalThis.FunPayAutomation;
  const STORAGE_KEY = 'sellerDashboardOffers';
  const CACHE_VERSION = 1;
  const INACTIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  namespace.SellerOfferStore = class SellerOfferStore {
    constructor({
      storage = chrome.storage.local,
      now = Date.now
    } = {}) {
      this.storage = storage;
      this.now = now;
    }

    async hydrate(profile) {
      const userId = profile.profileUserId;
      if (!userId) return profile;

      const stored = await this.read(userId);
      const groups = mergeGroups(profile.groups, stored?.groups || [], this.now());
      profile.groups = groups;
      await this.write(userId, groups);
      return profile;
    }

    async updateOfferStatus(userId, offerId, active) {
      await this.update(userId, (groups) => {
        const offer = findStoredOffer(groups, offerId);
        if (!offer) return groups;

        offer.active = Boolean(active);
        offer.lastSeenAt = this.now();
        return groups;
      });
    }

    async removeOffer(userId, offerId) {
      await this.update(userId, (groups) =>
        groups
          .map((group) => ({
            ...group,
            offers: group.offers.filter(
              (offer) => String(offer.offerId) !== String(offerId)
            )
          }))
          .filter((group) => group.offers.length > 0)
      );
    }

    async read(userId) {
      const stored = await this.storage.get([STORAGE_KEY]);
      const cache = stored[STORAGE_KEY];

      return (
        cache?.version === CACHE_VERSION &&
        cache.userId === String(userId) &&
        Array.isArray(cache.groups)
      ) ? cache : null;
    }

    async write(userId, groups) {
      const now = this.now();
      await this.storage.set({
        [STORAGE_KEY]: {
          version: CACHE_VERSION,
          userId: String(userId),
          updatedAt: now,
          groups: groups.map((group) => toStoredGroup(group, now))
        }
      });
    }

    async update(userId, updater) {
      const stored = await this.read(userId);
      if (!stored) return;
      await this.write(userId, updater(structuredClone(stored.groups)));
    }
  };

  function mergeGroups(currentGroups, storedGroups, now) {
    const currentByNode = new Map(
      currentGroups.map((group) => [String(group.nodeId), group])
    );

    for (const storedGroup of storedGroups) {
      const nodeId = String(storedGroup.nodeId);
      let group = currentByNode.get(nodeId);

      if (!group) {
        group = {
          nodeId,
          title: storedGroup.title,
          categoryKey: storedGroup.categoryKey,
          element: null,
          table: null,
          offers: []
        };
        currentByNode.set(nodeId, group);
      }

      const currentOfferIds = new Set(
        group.offers.map((offer) => String(offer.offerId))
      );
      for (const storedOffer of storedGroup.offers || []) {
        if (currentOfferIds.has(String(storedOffer.offerId))) continue;
        if (now - Number(storedOffer.lastSeenAt || 0) > INACTIVE_TTL_MS) continue;

        group.offers.push({
          ...storedOffer,
          active: false,
          restoredFromCache: true,
          element: null,
          wrapper: null,
          salesElement: null
        });
      }
    }

    return [...currentByNode.values()].filter(
      (group) => group.offers.length > 0
    );
  }

  function toStoredGroup(group, now) {
    return {
      nodeId: String(group.nodeId),
      title: group.title,
      categoryKey: group.categoryKey,
      offers: group.offers.map((offer) => toStoredOffer(offer, now))
    };
  }

  function toStoredOffer(offer, now) {
    return {
      offerId: String(offer.offerId),
      nodeId: String(offer.nodeId),
      categoryTitle: offer.categoryTitle,
      categoryKey: offer.categoryKey,
      title: offer.title,
      titleKey: offer.titleKey,
      price: offer.price,
      currency: offer.currency,
      autoDelivery: Boolean(offer.autoDelivery),
      publicUrl: offer.publicUrl,
      editUrl: offer.editUrl,
      active: Boolean(offer.active),
      lastSeenAt: Number(offer.lastSeenAt || now)
    };
  }

  function findStoredOffer(groups, offerId) {
    for (const group of groups) {
      const offer = group.offers.find(
        (item) => String(item.offerId) === String(offerId)
      );
      if (offer) return offer;
    }
    return null;
  }
})();

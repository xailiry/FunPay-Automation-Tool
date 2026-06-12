(() => {
  const namespace = globalThis.FunPayAutomation;
  const Data = namespace.SellerDashboardData;

  namespace.SellerDashboardController = class SellerDashboardController {
    constructor({ profile, view, client, offerStore }) {
      this.profile = profile;
      this.view = view;
      this.client = client;
      this.offerStore = offerStore;
      this.orders = [];
      this.salesMeta = {};
      this.pendingActiveChanges = new Map();
      this.filters = {
        query: '',
        category: 'all',
        type: 'all',
        status: 'all',
        sort: 'default'
      };
      this.metrics = {
        period: 'all',
        grouping: 'combined'
      };
    }

    initialize() {
      this.view.onFiltersChange((filters) => {
        this.filters = filters;
        this.renderOffers();
      });
      this.view.onMetricsChange((metrics) => {
        this.metrics = metrics;
        this.render();
      });
      this.view.onRefresh(() => this.loadOrders(true));
      this.view.onBump(() => this.triggerBump());
      this.view.onDelete((offer) => this.deleteOffer(offer));
      this.view.onActiveToggle((offerId, active) => this.toggleActiveState(offerId, active));
      this.view.onSave(() => this.saveChanges());
      this.view.mount();
      this.render();
      void this.loadOrders(false);
      void this.refreshBumpAvailability();
      window.setInterval(() => {
        void this.refreshBumpAvailability();
      }, 60_000);
    }

    async loadOrders(forceRefresh) {
      this.salesMeta = { loading: true };
      this.renderMetrics();

      try {
        const result = await this.client.getOrders(
          this.profile.profileUserId,
          forceRefresh
        );
        this.orders = result.orders;
        this.salesMeta = {
          updatedAt: result.updatedAt,
          stale: result.stale,
          error: result.warning || ''
        };
      } catch (error) {
        this.salesMeta = {
          error: error instanceof Error ? error.message : String(error)
        };
      }

      this.render();
    }

    render() {
      this.renderOffers();
      this.renderMetrics();
    }

    renderOffers() {
      const query = this.filters.query
        .trim()
        .toLocaleLowerCase('ru');
      const orderSales = Data.createOfferSalesMap(
        this.orders,
        this.metrics.period
      );
      const visibleIds = new Set();
      const salesByOffer = new Map();

      for (const group of this.profile.groups) {
        for (const offer of group.offers) {
          const sales = orderSales.get(
            `${offer.titleKey}::${offer.categoryKey}`
          );
          salesByOffer.set(offer.offerId, sales || null);

          const matchesQuery =
            !query ||
            offer.title.toLocaleLowerCase('ru').includes(query);
          const matchesCategory =
            this.filters.category === 'all' ||
            group.nodeId === this.filters.category;
          const matchesType =
            this.filters.type === 'all' ||
            (this.filters.type === 'auto' && offer.autoDelivery) ||
            (this.filters.type === 'regular' && !offer.autoDelivery);
          const matchesStatus =
            this.filters.status === 'all' ||
            (this.filters.status === 'active' && offer.active) ||
            (this.filters.status === 'inactive' && !offer.active);

          if (matchesQuery && matchesCategory && matchesType && matchesStatus) {
            visibleIds.add(offer.offerId);
          }
        }
      }

      this.view.applyOffers(
        this.profile.groups,
        visibleIds,
        salesByOffer,
        this.filters.sort
      );
    }

    renderMetrics() {
      const metrics = Data.aggregateOrders(this.orders, this.metrics);
      this.view.renderMetrics(metrics, this.salesMeta);
    }

    async deleteOffer(offer) {
      const confirmed = await this.view.confirmDelete(offer);
      if (!confirmed) return;

      this.view.setBusyOffer(offer.offerId, true);

      if (offer.restoredFromCache) {
        const cacheUpdated = await this.updateOfferCache(() =>
          this.offerStore?.removeOffer(
            this.profile.profileUserId,
            offer.offerId
          )
        );
        if (!cacheUpdated) {
          this.view.setBusyOffer(offer.offerId, false);
          this.view.showToast(
            'Не удалось убрать локальную запись. Попробуйте перезагрузить страницу.',
            'error'
          );
          return;
        }

        this.removeOfferFromProfile(offer);
        this.view.showToast('Локальная запись убрана.', 'success');
        this.renderOffers();
        return;
      }

      try {
        await this.client.deleteOffer({
          offerId: offer.offerId,
          nodeId: offer.nodeId
        });
        this.removeOfferFromProfile(offer);
        const cacheUpdated = await this.updateOfferCache(() =>
          this.offerStore?.removeOffer(
            this.profile.profileUserId,
            offer.offerId
          )
        );
        this.view.showToast(
          cacheUpdated
            ? 'Объявление удалено.'
            : 'Объявление удалено. Локальный список обновится после перезагрузки.',
          cacheUpdated ? 'success' : 'error'
        );
        this.renderOffers();
      } catch (error) {
        this.view.setBusyOffer(offer.offerId, false);
        this.view.showToast(
          error instanceof Error ? error.message : String(error),
          'error'
        );
      }
    }

    removeOfferFromProfile(offer) {
      const group = this.profile.groups.find(
        (item) => item.nodeId === offer.nodeId
      );
      this.view.removeOffer(offer.offerId);
      if (group) {
        group.offers = group.offers.filter(
          (item) => item.offerId !== offer.offerId
        );
      }
    }

    async triggerBump() {
      this.view.setBumpState(true);
      this.view.hideBanner();

      try {
        this.view.showBumpBanner(await this.client.triggerBump());
      } catch (error) {
        this.view.showBumpBanner({
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.view.setBumpState(false);
        await this.refreshBumpAvailability();
      }
    }

    async refreshBumpAvailability() {
      try {
        const state = await this.client.getExtensionState();
        this.view.setBumpAvailability(state.nextBumpAvailableAt);
      } catch {
        // The button remains usable even if the background state is unavailable.
      }
    }

    toggleActiveState(offerId, active) {
      const offer = findOffer(this.profile.groups, offerId);
      if (!offer) return;

      if (offer.active === Boolean(active)) {
        this.pendingActiveChanges.delete(String(offerId));
      } else {
        this.pendingActiveChanges.set(String(offerId), {
          offer,
          active: Boolean(active)
        });
      }

      this.view.setSaveState(this.pendingActiveChanges.size > 0);
    }

    async saveChanges() {
      if (this.pendingActiveChanges.size === 0) return;

      const changes = [...this.pendingActiveChanges.entries()];
      this.view.setSaveState(false, true);
      this.view.showToast(`Сохранение ${changes.length} объявлений...`);

      let success = 0;
      const errors = [];
      let cacheWarning = false;

      for (const [offerId, change] of changes) {
        this.view.setBusyOffer(offerId, true);
        try {
          await this.client.updateOfferStatus({
            offerId: change.offer.offerId,
            nodeId: change.offer.nodeId,
            active: change.active
          });
          change.offer.active = change.active;
          if (change.active) change.offer.restoredFromCache = false;
          this.view.setOfferActive(offerId, change.active);
          const cacheUpdated = await this.updateOfferCache(() =>
            this.offerStore?.updateOfferStatus(
              this.profile.profileUserId,
              offerId,
              change.active
            )
          );
          cacheWarning ||= !cacheUpdated;
          success += 1;
          this.pendingActiveChanges.delete(offerId);
        } catch (error) {
          errors.push(
            error instanceof Error ? error.message : String(error)
          );
        } finally {
          this.view.setBusyOffer(offerId, false);
        }
      }

      if (errors.length === 0) {
        this.view.showToast(
          cacheWarning
            ? `Сохранено ${success} объявлений. Локальный список обновится после перезагрузки.`
            : `Успешно сохранено ${success} объявлений`,
          cacheWarning ? 'error' : 'success'
        );
      } else {
        this.view.showToast(
          `Сохранено: ${success}. Ошибок: ${errors.length}. ${errors[0]}`,
          'error'
        );
      }

      this.view.setSaveState(this.pendingActiveChanges.size > 0);
      this.renderOffers();
    }

    async updateOfferCache(update) {
      if (!this.offerStore) return true;

      try {
        await update();
        return true;
      } catch {
        return false;
      }
    }
  };

  function findOffer(groups, offerId) {
    for (const group of groups) {
      const offer = group.offers.find(
        (item) => String(item.offerId) === String(offerId)
      );
      if (offer) return offer;
    }
    return null;
  }
})();

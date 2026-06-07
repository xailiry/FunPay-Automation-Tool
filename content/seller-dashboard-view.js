(() => {
  const namespace = globalThis.FunPayAutomation;
  const Elements = namespace.SellerDashboardElements;

  namespace.SellerDashboardView = class SellerDashboardView {
    constructor(profile) {
      this.profile = profile;
      this.panel = Elements.createPanel(profile.groups);
      this.elements = Elements.getElements(this.panel);
      this.handlers = {};
    }

    mount() {
      const section = this.profile.offersSection;
      if (!section || document.getElementById('fp-seller-dashboard')) return;

      document.body.classList.add('fp-seller-dashboard-active');
      section.classList.add('fp-seller-offers-section');
      section.insertBefore(this.panel, section.firstChild);
      section.querySelector(':scope > h5')?.classList.add('fp-native-offers-title');
      this.materializeCachedOffers(section);
      this.decorateOffers();
      this.bindControls();
    }

    onFiltersChange(handler) {
      this.handlers.filtersChange = handler;
    }

    onMetricsChange(handler) {
      this.handlers.metricsChange = handler;
    }

    onRefresh(handler) {
      this.handlers.refresh = handler;
    }

    onBump(handler) {
      this.handlers.bump = handler;
    }

    onDelete(handler) {
      this.handlers.delete = handler;
    }

    onSave(handler) {
      this.handlers.save = handler;
    }

    onActiveToggle(handler) {
      this.handlers.activeToggle = handler;
    }

    getFilterState() {
      return {
        query: this.elements.search.value,
        category: this.elements.category.value,
        type: this.elements.type.value,
        status: this.elements.status.value,
        sort: this.elements.sort.value
      };
    }

    getMetricsState() {
      return {
        period: this.elements.period.querySelector('[aria-pressed="true"]')
          ?.dataset.value || 'all',
        grouping: this.elements.grouping.querySelector('[aria-pressed="true"]')
          ?.dataset.value || 'combined'
      };
    }

    applyOffers(groups, visibleOfferIds, salesByOffer, sort) {
      for (const group of groups) {
        const visibleOffers = group.offers.filter((offer) =>
          visibleOfferIds.has(offer.offerId)
        );
        const sortedOffers = [...visibleOffers].sort((a, b) =>
          compareOffers(a, b, salesByOffer, sort)
        );

        for (const offer of group.offers) {
          offer.wrapper.hidden = !visibleOfferIds.has(offer.offerId);
          const sales = salesByOffer.get(offer.offerId);
          offer.salesElement.textContent = sales
            ? `${sales.count} продаж · ${Elements.formatMoney(sales.revenue, sales.currency)}`
            : 'Продаж нет';
        }

        for (const offer of sortedOffers) {
          group.table.appendChild(offer.wrapper);
        }

        group.element.hidden = visibleOffers.length === 0;
        group.countElement.textContent =
          `${visibleOffers.length} из ${group.offers.length}`;

        group._topVisibleOffer = sortedOffers[0] || null;
      }

      const sortedGroups = [...groups].sort((a, b) => {
        if (sort === 'default') {
          return groups.indexOf(a) - groups.indexOf(b);
        }
        if (!a._topVisibleOffer && !b._topVisibleOffer) return 0;
        if (!a._topVisibleOffer) return 1;
        if (!b._topVisibleOffer) return -1;
        return compareOffers(a._topVisibleOffer, b._topVisibleOffer, salesByOffer, sort);
      });

      let insertAfterNode = this.panel;
      for (const group of sortedGroups) {
        if (insertAfterNode.parentNode && insertAfterNode.nextSibling !== group.element) {
          insertAfterNode.parentNode.insertBefore(group.element, insertAfterNode.nextSibling);
        }
        insertAfterNode = group.element;
      }

      const visibleCount = visibleOfferIds.size;
      this.elements.resultCount.textContent =
        `${visibleCount} ${Elements.pluralize(visibleCount, ['объявление', 'объявления', 'объявлений'])}`;
      this.elements.empty.hidden = visibleCount > 0;
    }

    renderMetrics(metrics, meta = {}) {
      this.elements.sales.textContent = String(metrics.orderCount);
      this.elements.revenue.textContent = Elements.formatMoney(
        metrics.revenue,
        metrics.currency
      );
      this.elements.withdrawal.textContent = Elements.formatMoney(
        metrics.withdrawal.net,
        metrics.currency
      );
      this.elements.average.textContent = Elements.formatMoney(
        metrics.average,
        metrics.currency
      );
      this.elements.refunds.textContent = metrics.refundCount > 0
        ? `${metrics.refundCount} · ${Elements.formatMoney(metrics.refundAmount, metrics.currency)}`
        : '0';
      this.elements.topProducts.replaceChildren();

      if (metrics.topProducts.length === 0) {
        this.elements.topProducts.appendChild(
          Elements.createEmpty('За выбранный период продаж нет.')
        );
      } else {
        metrics.topProducts.forEach((product, index) => {
          this.elements.topProducts.appendChild(
            Elements.createTopProduct(product, index, metrics.currency)
          );
        });
      }

      const updatedAt = meta.updatedAt
        ? new Date(meta.updatedAt).toLocaleTimeString('ru', {
          hour: '2-digit',
          minute: '2-digit'
        })
        : '';
      this.elements.metricsMeta.textContent = meta.loading
        ? 'Загружаем продажи...'
        : meta.error
          ? `Метрики недоступны: ${meta.error}`
          : `${meta.stale ? 'Показан сохранённый результат' : 'Обновлено'}${updatedAt ? ` в ${updatedAt}` : ''}`;
      this.elements.metricsMeta.classList.toggle(
        'is-warning',
        Boolean(meta.error || meta.stale)
      );
      this.elements.refresh.disabled = Boolean(meta.loading);
    }

    setBusyOffer(offerId, busy) {
      const offer = findOffer(this.profile.groups, offerId);
      if (!offer) return;

      offer.wrapper.classList.toggle('is-busy', busy);
      offer.wrapper.querySelectorAll('button, a, input').forEach((control) => {
        if (control.classList.contains('fp-seller-edit')) return;
        control.disabled = busy;
      });
    }

    removeOffer(offerId) {
      const offer = findOffer(this.profile.groups, offerId);
      offer?.wrapper.remove();
    }

    setOfferActive(offerId, active) {
      const offer = findOffer(this.profile.groups, offerId);
      if (!offer) return;

      if (active) offer.restoredFromCache = false;
      offer.wrapper.classList.toggle('is-inactive', !active);
      offer.wrapper.classList.toggle(
        'is-restored',
        Boolean(offer.restoredFromCache)
      );
      const checkbox = offer.wrapper.querySelector(
        'input[type="checkbox"][data-offer-id]'
      );
      if (checkbox) checkbox.checked = active;
      const status = offer.wrapper.querySelector('.fp-seller-offer-active-text');
      if (status) status.textContent = active ? 'Активное' : 'Активировать';
      const type = offer.wrapper.querySelector('.fp-seller-offer__type');
      if (type) {
        type.textContent = offer.autoDelivery ? 'Автовыдача' : 'Обычное';
        if (offer.restoredFromCache) type.textContent += ' · локальная запись';
      }
      const remove = offer.wrapper.querySelector('.fp-seller-delete');
      if (remove) {
        remove.textContent = offer.restoredFromCache
          ? 'Убрать из списка'
          : 'Удалить';
      }
    }

    setSaveState(enabled, loading = false) {
      this.elements.save.disabled = !enabled || loading;
      this.elements.save.textContent = loading ? 'Сохранение...' : 'Сохранить изменения';
    }

    setBumpState(loading) {
      this.elements.bump.disabled = loading;
      this.elements.bump.textContent = loading ? 'Поднимаем...' : 'Поднять товары';
    }

    showToast(message, type = '') {
      this.elements.toast.textContent = message;
      this.elements.toast.className = 'fp-seller-toast';
      if (type) this.elements.toast.classList.add(`is-${type}`);
      window.setTimeout(() => {
        if (this.elements.toast.textContent === message) {
          this.elements.toast.textContent = '';
        }
      }, 4500);
    }

    hideBanner() {
      if (this.elements.banner && !this.elements.banner.hidden) {
        this.elements.banner.classList.add('is-hidden');
        if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
        this._bannerTimeout = window.setTimeout(() => {
          this.elements.banner.hidden = true;
          this.elements.banner.innerHTML = '';
        }, 300);
      }
    }

    showBumpBanner(result) {
      if (!this.elements.banner) return;
      const isError = result.status === 'failed';
      const isWarning = !isError && result.failedCount > 0;
      this.elements.banner.className = [
        'fp-seller-banner',
        isError ? 'is-error' : '',
        isWarning ? 'is-warning' : ''
      ].filter(Boolean).join(' ');

      const icon = isError
        ? `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg width="12" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5L5 9L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

      let title = getBumpTitle(result);
      let desc = '';

      if (isError) {
        desc = result.error || 'Не удалось завершить поднятие.';
      } else {
        const parts = [];
        if (result.successCount > 0) parts.push(`Поднято: ${result.successCount}`);
        if (result.skippedCount > 0) parts.push(`На кулдауне: ${result.skippedCount}`);
        if (result.failedCount > 0) parts.push(`Ошибок: ${result.failedCount}`);
        desc = parts.join(' · ') || 'Нет активных объявлений для поднятия.';
      }

      this.elements.banner.innerHTML = `
        <div class="fp-seller-banner-icon">${icon}</div>
        <div class="fp-seller-banner-content">
          <strong>${title}</strong>
          <span>${escapeHtml(desc)}</span>
        </div>
        <button type="button" class="fp-seller-banner-close" aria-label="Закрыть">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      `;

      const closeBtn = this.elements.banner.querySelector('.fp-seller-banner-close');
      closeBtn.addEventListener('click', () => this.hideBanner());

      if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
      this.elements.banner.hidden = false;
      this.elements.banner.classList.add('is-hidden');
      void this.elements.banner.offsetHeight; // Force reflow for animation
      this.elements.banner.classList.remove('is-hidden');
    }

    confirmDelete(offer) {
      return new Promise((resolve) => {
        const previouslyFocused = document.activeElement;
        const modal = document.createElement('div');
        modal.className = 'fp-seller-modal';
        modal.innerHTML = `
          <section class="fp-seller-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="fp-delete-title">
            <div class="fp-seller-modal__eyebrow">${
              offer.restoredFromCache ? 'Локальная запись' : 'Удаление объявления'
            }</div>
            <h2 id="fp-delete-title">${
              offer.restoredFromCache
                ? 'Убрать запись из панели?'
                : 'Удалить это объявление?'
            }</h2>
            <p></p>
            <div class="fp-seller-modal__actions">
              <button type="button" class="fp-seller-button fp-seller-button--secondary" data-action="cancel">Отмена</button>
              <button type="button" class="fp-seller-button fp-seller-button--danger" data-action="confirm">${
                offer.restoredFromCache ? 'Убрать' : 'Удалить'
              }</button>
            </div>
          </section>
        `;
        modal.querySelector('p').textContent = offer.title;

        const close = (result) => {
          document.removeEventListener('keydown', onKeyDown);
          modal.remove();
          previouslyFocused?.focus?.();
          resolve(result);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close(false);
        };
        modal.querySelector('[data-action="cancel"]')
          .addEventListener('click', () => close(false));
        modal.querySelector('[data-action="confirm"]')
          .addEventListener('click', () => close(true));
        modal.addEventListener('mousedown', (event) => {
          if (event.target === modal) close(false);
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(modal);
        modal.querySelector('[data-action="cancel"]').focus();
      });
    }

    materializeCachedOffers(section) {
      for (const group of this.profile.groups) {
        if (!group.element || !group.table) {
          const elements = Elements.createCachedGroup(group);
          group.element = elements.element;
          group.table = elements.table;
          section.appendChild(group.element);
        }

        for (const offer of group.offers) {
          if (offer.element) continue;
          offer.element = Elements.createCachedOffer(offer);
          group.table.appendChild(offer.element);
        }
      }
    }

    decorateOffers() {
      for (const group of this.profile.groups) {
        group.element.classList.add('fp-seller-category');
        group.table.classList.add('fp-seller-table');
        group.element.querySelector('.tc-header')?.remove();

        const titleContainer = group.element.querySelector(
          '.offer-list-title-container'
        );
        const count = document.createElement('span');
        count.className = 'fp-seller-category__count';
        count.textContent = `${group.offers.length}`;
        group.countElement = count;
        titleContainer?.querySelector('.offer-list-title')?.appendChild(count);

        const nativeEdit = titleContainer?.querySelector(
          '.offer-list-title-button a'
        );
        if (nativeEdit) {
          nativeEdit.classList.add('fp-seller-category-edit');
          nativeEdit.title = 'Управление категорией';
          nativeEdit.setAttribute('aria-label', `Управление категорией ${group.title}`);
        }

        for (const offer of group.offers) {
          const wrapper = document.createElement('div');
          wrapper.className = 'fp-seller-offer';
          wrapper.dataset.offerId = offer.offerId;
          offer.element.parentNode.insertBefore(wrapper, offer.element);
          wrapper.appendChild(offer.element);
          offer.element.classList.add('fp-seller-offer__link');

          const meta = document.createElement('div');
          meta.className = 'fp-seller-offer__meta';
          const sales = document.createElement('span');
          sales.className = 'fp-seller-offer__sales';
          sales.textContent = 'Загрузка продаж...';
          const type = document.createElement('span');
          type.className = 'fp-seller-offer__type';
          type.textContent = offer.autoDelivery ? 'Автовыдача' : 'Обычное';
          meta.append(sales, type);

          const actions = document.createElement('div');
          actions.className = 'fp-seller-offer__actions';

          const activeLabel = document.createElement('label');
          activeLabel.className = 'fp-seller-offer-active-toggle';
          const activeCheckbox = document.createElement('input');
          activeCheckbox.type = 'checkbox';
          activeCheckbox.checked =
            Boolean(offer.active) && !offer.restoredFromCache;
          activeCheckbox.dataset.offerId = offer.offerId;
          const activeText = document.createElement('span');
          activeText.className = 'fp-seller-offer-active-text';
          activeText.textContent = offer.restoredFromCache
            ? 'Активировать'
            : 'Активное';
          activeLabel.append(activeCheckbox, activeText);

          const edit = document.createElement('a');
          edit.className = 'fp-seller-action fp-seller-edit';
          edit.href = offer.editUrl;
          edit.textContent = 'Редактировать';
          const remove = document.createElement('button');
          remove.className = 'fp-seller-action fp-seller-delete';
          remove.type = 'button';
          remove.textContent = offer.restoredFromCache
            ? 'Убрать из списка'
            : 'Удалить';
          remove.addEventListener('click', () => {
            this.handlers.delete?.(offer);
          });
          actions.append(activeLabel, edit, remove);
          wrapper.append(meta, actions);

          if (!offer.active) {
            wrapper.classList.add('is-inactive');
          }
          if (offer.restoredFromCache) {
            wrapper.classList.add('is-restored');
            type.textContent += ' · локальная запись';
          }

          offer.wrapper = wrapper;
          offer.salesElement = sales;
        }
      }
    }

    bindControls() {
      this.elements.help.addEventListener('click', () => {
        globalThis.FunPayUserGuide.open();
      });

      const notifyFilters = () =>
        this.handlers.filtersChange?.(this.getFilterState());
      this.elements.search.addEventListener('input', notifyFilters);
      this.elements.category.addEventListener('change', notifyFilters);
      this.elements.type.addEventListener('change', notifyFilters);
      this.elements.status.addEventListener('change', notifyFilters);
      this.elements.sort.addEventListener('change', notifyFilters);

      this.elements.refresh.addEventListener('click', () => {
        this.handlers.refresh?.();
      });
      this.elements.bump?.addEventListener('click', () => {
        this.handlers.bump?.();
      });
      this.elements.save?.addEventListener('click', () => {
        this.handlers.save?.();
      });

      this.profile.offersSection.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"][data-offer-id]')) {
          this.handlers.activeToggle?.(e.target.dataset.offerId, e.target.checked);
        }
      });

      for (const container of [this.elements.period, this.elements.grouping]) {
        container.addEventListener('click', (event) => {
          const button = event.target.closest('button[data-value]');
          if (!button) return;
          container.querySelectorAll('button').forEach((item) => {
            item.setAttribute('aria-pressed', String(item === button));
          });
          this.handlers.metricsChange?.(this.getMetricsState());
        });
      }
    }
  };

  function compareOffers(a, b, salesByOffer, sort) {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'sales') {
      return (
        (salesByOffer.get(b.offerId)?.count || 0) -
        (salesByOffer.get(a.offerId)?.count || 0)
      );
    }
    return 0;
  }

  function findOffer(groups, offerId) {
    for (const group of groups) {
      const offer = group.offers.find((item) => item.offerId === offerId);
      if (offer) return offer;
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getBumpTitle(result) {
    if (result.status === 'failed') return 'Ошибка поднятия';
    if (result.failedCount > 0) return 'Поднятие завершено с ошибками';
    if (result.successCount > 0) return 'Объявления успешно подняты';
    if (result.skippedCount > 0) return 'Объявления уже на кулдауне';
    return 'Поднимать пока нечего';
  }
})();

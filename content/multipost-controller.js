(() => {
  const namespace = globalThis.FunPayAutomation;
  const Config = namespace.Config;
  const {
    createMultiPostSummary,
    delay,
    findSubmitButton,
    getCurrentNodeId,
    getErrorMessage,
    isSubmitControl
  } = namespace.Utils;

  namespace.MultiPostController = class MultiPostController {
    constructor({ form, view, client, catalog }) {
      this.form = form;
      this.view = view;
      this.client = client;
      this.catalog = catalog;
      this.categories = [];
      this.selectedCategories = new Map();
      this.searchQuery = '';
      this.isRunning = false;
      this.allowNativeSubmit = false;
      this.submitButton = findSubmitButton(form);

      this.handleSubmit = this.handleSubmit.bind(this);
      this.editCategory = this.editCategory.bind(this);
    }

    initialize() {
      this.view.mount(this.submitButton);
      this.view.onSearch((query) => {
        this.searchQuery = query;
        this.renderCategories();
      });
      this.view.onRefresh(() => this.loadCategories(true));
      this.form.addEventListener('submit', this.handleSubmit, true);

      this.renderSelection();
      void this.loadCategories(false);
    }

    async handleSubmit(event) {
      if (this.allowNativeSubmit || this.selectedCategories.size === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (this.isRunning) return;

      this.isRunning = true;
      const submitter = event.submitter || this.submitButton;
      const targets = this.getSelectedTargets();
      const startedAt = Date.now();

      this.view.setBusy(true);
      this.view.setSubmitDisabled(submitter, true);
      this.view.showNotice('', '');
      this.view.showProgress();
      this.view.updateProgress(0, targets.length, 'Подготовка очереди...');

      let shouldSaveOriginal = false;

      try {
        const results = await this.publishCopies(targets);
        const summary = createMultiPostSummary(startedAt, results);
        await this.saveSummary(summary);

        if (summary.failedCount > 0) {
          this.showFailedSummary(summary);
          return;
        }

        shouldSaveOriginal = true;
        this.showSummary(summary);
        await delay(Config.nativeSubmitDelayMs);
      } catch (error) {
        this.view.showNotice(
          `Мультипостинг прерван: ${getErrorMessage(error)}. Исходное объявление не сохранено.`,
          'error'
        );
      } finally {
        if (shouldSaveOriginal) {
          try {
            this.continueNativeSubmit(submitter);
          } finally {
            this.reset();
          }
        } else {
          this.isRunning = false;
          this.view.setBusy(false);
          this.view.setSubmitDisabled(submitter, false);
          this.view.hideProgress();
          this.renderSelection();
          this.renderCategories();
        }
      }
    }

    showFailedSummary(summary) {
      const failures = summary.results
        .filter((result) => result.status === 'failed')
        .map((result) => `${result.name}: ${result.message}`)
        .join('; ');

      this.view.showNotice(
        `Копии не созданы: ${failures}. Исходное объявление не сохранено.`,
        'error'
      );
    }

    async publishCopies(targets) {
      const results = [];

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        this.view.updateProgress(
          index,
          targets.length,
          `Адаптация формы: ${target.name}`
        );

        try {
          results.push(await this.client.submitCopy(this.form, target));
        } catch (error) {
          results.push({
            nodeId: target.nodeId,
            name: target.name,
            status: 'failed',
            message: getErrorMessage(error)
          });
          break;
        }

        this.view.updateProgress(
          index + 1,
          targets.length,
          `Обработано ${index + 1} из ${targets.length}`
        );

        if (index < targets.length - 1) {
          await delay(Config.multiPostDelayMs);
        }
      }

      return results;
    }

    async saveSummary(summary) {
      try {
        await chrome.storage.local.set({ lastMultiPostResult: summary });
      } catch (error) {
        console.warn('FunPay Automation: failed to save multipost result', error);
      }
    }

    showSummary(summary) {
      this.view.showNotice(
        `Создано копий: ${summary.successCount}. Сохраняем объявление...`,
        'success'
      );
    }

    continueNativeSubmit(submitter) {
      this.allowNativeSubmit = true;
      this.view.setSubmitDisabled(submitter, false);

      try {
        if (typeof this.form.requestSubmit === 'function') {
          this.form.requestSubmit(
            isSubmitControl(submitter) ? submitter : undefined
          );
        } else {
          HTMLFormElement.prototype.submit.call(this.form);
        }
      } finally {
        this.allowNativeSubmit = false;
      }
    }

    reset() {
      this.isRunning = false;
      this.selectedCategories.clear();
      this.view.setBusy(false);
      this.view.hideProgress();
      this.renderSelection();
      this.renderCategories();
    }

    async loadCategories(forceRefresh) {
      this.view.setCategoriesLoading(true);

      try {
        const catalog = await this.catalog.getCategories(forceRefresh);
        const currentNodeId = getCurrentNodeId(this.form);
        const categories = catalog.filter(
          (category) => category.id !== currentNodeId
        );

        if (categories.length === 0) {
          throw new Error('В каталоге FunPay не найдено доступных категорий.');
        }

        this.categories = categories;
        this.renderCategories();
      } catch (error) {
        const message = getErrorMessage(error);
        this.view.setCategoryMeta(message);
        this.view.showNotice(message, 'error');
      } finally {
        this.view.setCategoriesLoading(false);
      }
    }

    renderCategories() {
      const query = this.searchQuery.trim().toLocaleLowerCase('ru');
      const filtered = this.categories
        .filter((category) =>
          category.name.toLocaleLowerCase('ru').includes(query)
        )
        .slice(0, Config.maxVisibleCategories);

      this.view.setCategoryMeta(
        query
          ? `Найдено: ${filtered.length}`
          : `Показано: ${filtered.length} из ${this.categories.length}`
      );
      this.view.renderCategories({
        categories: filtered,
        selectedCategories: this.selectedCategories,
        onToggle: (category, selected) =>
          this.toggleCategory(category, selected)
      });
    }

    toggleCategory(category, selected) {
      if (!selected) {
        this.selectedCategories.delete(category.id);
        this.renderSelection();
        return true;
      }

      if (this.selectedCategories.size >= Config.maxMultiPostTargets) {
        this.view.showNotice(
          `За один запуск можно выбрать не больше ${Config.maxMultiPostTargets} категорий.`,
          'warning'
        );
        return false;
      }

      this.selectedCategories.set(category.id, category);
      this.renderSelection();
      return true;
    }

    async editCategory(categoryId) {
      const category = this.selectedCategories.get(categoryId);
      if (!category || this.isRunning) return;

      this.view.showNotice(`Загрузка черновика: ${category.name}...`, '');

      try {
        const draft = await this.client.prepareDraft(this.form, {
          ...category,
          nodeId: category.id
        });
        const overrides = await this.view.openDraftEditor({
          category,
          fields: draft.fields
        });

        this.view.showNotice('', '');
        if (!overrides) return;

        this.selectedCategories.set(categoryId, {
          ...category,
          overrides,
          customized: true
        });
        this.renderSelection();
      } catch (error) {
        this.view.showNotice(
          `Не удалось открыть черновик: ${getErrorMessage(error)}`,
          'error'
        );
      }
    }

    renderSelection() {
      this.view.renderSelection({
        selectedCategories: this.selectedCategories,
        onEdit: this.editCategory,
        onRemove: (categoryId) => {
          this.selectedCategories.delete(categoryId);
          this.renderSelection();
          this.renderCategories();
        }
      });
    }

    getSelectedTargets() {
      return [...this.selectedCategories.values()].map((category) => ({
        ...category,
        nodeId: category.id
      }));
    }
  };
})();

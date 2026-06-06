(() => {
  const namespace = globalThis.FunPayAutomation;
  const { createEmptyState } = namespace.Utils;

  namespace.MultiPostView = class MultiPostView {
    constructor(form) {
      this.form = form;
      this.panel = createPanel();
      this.elements = getPanelElements(this.panel);
    }

    mount(submitButton) {
      if (submitButton?.parentNode) {
        submitButton.parentNode.insertBefore(this.panel, submitButton);
        return;
      }

      this.form.appendChild(this.panel);
    }

    onSearch(handler) {
      this.elements.searchInput.addEventListener('input', (event) => {
        handler(event.target.value);
      });
    }

    onRefresh(handler) {
      this.elements.refreshButton.addEventListener('click', handler);
    }

    setCategoriesLoading(loading) {
      this.elements.refreshButton.disabled = loading;

      if (loading) {
        this.elements.categoryList.replaceChildren();
        this.setCategoryMeta('Загрузка категорий...');
      }
    }

    setCategoryMeta(message) {
      this.elements.categoryMeta.textContent = message;
    }

    renderCategories({ categories, selectedCategories, onToggle }) {
      const list = this.elements.categoryList;
      list.replaceChildren();

      if (categories.length === 0) {
        list.appendChild(createEmptyState('Ничего не найдено'));
        return;
      }

      const fragment = document.createDocumentFragment();

      for (const category of categories) {
        fragment.appendChild(
          createCategoryOption({
            category,
            selected: selectedCategories.has(category.id),
            onToggle
          })
        );
      }

      list.appendChild(fragment);
    }

    renderSelection({ selectedCategories, onRemove }) {
      const list = this.elements.selectedList;
      list.replaceChildren();
      this.elements.selectedCount.textContent = String(selectedCategories.size);

      if (selectedCategories.size === 0) {
        list.appendChild(
          createEmptyState(
            'Выберите категории слева. Обычное сохранение останется без изменений.'
          )
        );
        return;
      }

      for (const [id, name] of selectedCategories) {
        list.appendChild(createSelectedCategory(id, name, onRemove));
      }
    }

    setBusy(busy) {
      this.panel.classList.toggle('is-busy', busy);
      this.elements.searchInput.disabled = busy;
      this.elements.refreshButton.disabled = busy;
      this.elements.categoryList.querySelectorAll('input').forEach((input) => {
        input.disabled = busy;
      });
      this.elements.selectedList.querySelectorAll('button').forEach((button) => {
        button.disabled = busy;
      });
    }

    setSubmitDisabled(submitter, disabled) {
      if ('disabled' in (submitter || {})) {
        submitter.disabled = disabled;
      }
    }

    showProgress() {
      this.elements.progress.hidden = false;
    }

    hideProgress() {
      this.elements.progress.hidden = true;
    }

    updateProgress(current, total, text) {
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      this.elements.progressBar.style.width = `${percent}%`;
      this.elements.progressText.textContent = text;
    }

    showNotice(message, type) {
      this.elements.notice.textContent = message;
      this.elements.notice.className = 'fp-notice';

      if (type) {
        this.elements.notice.classList.add(`fp-notice--${type}`);
      }
    }
  };

  function createPanel() {
    const panel = document.createElement('section');
    panel.id = 'fp-automation-panel';
    panel.className = 'fp-panel';
    panel.setAttribute('aria-labelledby', 'fp-panel-title');
    panel.innerHTML = `
      <div class="fp-panel__header">
        <div>
          <div class="fp-panel__eyebrow">FunPay Automation Tool</div>
          <h2 id="fp-panel-title" class="fp-panel__title">Дополнительные категории</h2>
          <p class="fp-panel__description">
            При сохранении расширение последовательно создаст копии в выбранных категориях,
            а затем сохранит текущее объявление.
          </p>
        </div>
        <button class="fp-icon-button" type="button" id="fp-refresh-categories" title="Обновить категории">
          Обновить
        </button>
      </div>

      <div class="fp-panel__body">
        <div class="fp-picker">
          <label class="fp-field-label" for="fp-category-search">Найти категорию</label>
          <input
            class="fp-search"
            id="fp-category-search"
            type="search"
            autocomplete="off"
            placeholder="Название игры или услуги"
          >
          <div class="fp-list-meta" id="fp-category-meta">Загрузка категорий...</div>
          <div class="fp-category-list" id="fp-category-list" role="list"></div>
        </div>

        <div class="fp-selection">
          <div class="fp-selection__header">
            <span class="fp-field-label">Будут созданы копии</span>
            <span class="fp-counter" id="fp-selected-count">0</span>
          </div>
          <div class="fp-selected-list" id="fp-selected-list"></div>
        </div>
      </div>

      <div class="fp-progress" id="fp-progress" hidden>
        <div class="fp-progress__track">
          <div class="fp-progress__bar" id="fp-progress-bar"></div>
        </div>
        <div class="fp-progress__text" id="fp-progress-text"></div>
      </div>

      <div class="fp-notice" id="fp-notice" role="status" aria-live="polite"></div>
    `;

    return panel;
  }

  function getPanelElements(panel) {
    return {
      categoryList: panel.querySelector('#fp-category-list'),
      categoryMeta: panel.querySelector('#fp-category-meta'),
      searchInput: panel.querySelector('#fp-category-search'),
      selectedList: panel.querySelector('#fp-selected-list'),
      selectedCount: panel.querySelector('#fp-selected-count'),
      refreshButton: panel.querySelector('#fp-refresh-categories'),
      progress: panel.querySelector('#fp-progress'),
      progressBar: panel.querySelector('#fp-progress-bar'),
      progressText: panel.querySelector('#fp-progress-text'),
      notice: panel.querySelector('#fp-notice')
    };
  }

  function createCategoryOption({ category, selected, onToggle }) {
    const label = document.createElement('label');
    label.className = 'fp-category';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'fp-category__checkbox';
    checkbox.checked = selected;

    const name = document.createElement('span');
    name.className = 'fp-category__name';
    name.textContent = category.name;

    checkbox.addEventListener('change', () => {
      const accepted = onToggle(category, checkbox.checked);
      if (!accepted) checkbox.checked = false;
    });

    label.append(checkbox, name);
    return label;
  }

  function createSelectedCategory(id, name, onRemove) {
    const item = document.createElement('div');
    item.className = 'fp-selected';

    const label = document.createElement('span');
    label.className = 'fp-selected__name';
    label.textContent = name;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fp-selected__remove';
    remove.textContent = 'Удалить';
    remove.setAttribute('aria-label', `Удалить категорию ${name}`);
    remove.addEventListener('click', () => onRemove(id));

    item.append(label, remove);
    return item;
  }
})();

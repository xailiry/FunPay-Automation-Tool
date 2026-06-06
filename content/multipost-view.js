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

    renderSelection({ selectedCategories, onEdit, onRemove }) {
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

      for (const [id, category] of selectedCategories) {
        list.appendChild(
          createSelectedCategory({
            id,
            category,
            onEdit,
            onRemove
          })
        );
      }
    }

    openDraftEditor({ category, fields }) {
      return new Promise((resolve) => {
        const modal = createDraftModal(category, fields);
        const { dialog, closeButton, cancelButton, saveButton } =
          getDraftModalElements(modal);
        let settled = false;

        const close = (value) => {
          if (settled) return;
          settled = true;
          document.removeEventListener('keydown', onKeyDown);
          modal.remove();
          resolve(value);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close(null);
        };

        closeButton.addEventListener('click', () => close(null));
        cancelButton.addEventListener('click', () => close(null));
        saveButton.addEventListener('click', () =>
          close(collectDraftOverrides(modal))
        );
        modal.addEventListener('mousedown', (event) => {
          if (event.target === modal) close(null);
        });
        dialog.addEventListener('mousedown', (event) => {
          event.stopPropagation();
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(modal);
        modal.querySelector('input, textarea, select')?.focus();
      });
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
            Расширение загрузит форму каждой категории, перенесет совместимые поля
            и не отправит параметры, которых в целевой форме нет.
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
            placeholder="Например, Gemini или Claude · Услуги"
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

  function createSelectedCategory({ id, category, onEdit, onRemove }) {
    const item = document.createElement('div');
    item.className = 'fp-selected';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'fp-selected__edit';
    edit.setAttribute(
      'aria-label',
      `Настроить будущую копию ${category.name}`
    );

    const label = document.createElement('span');
    label.className = 'fp-selected__name';
    label.textContent = category.name;
    edit.appendChild(label);

    if (category.customized) {
      const badge = document.createElement('span');
      badge.className = 'fp-selected__badge';
      badge.textContent = 'Настроено';
      edit.appendChild(badge);
    }

    edit.addEventListener('click', () => onEdit(id));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'fp-selected__remove';
    remove.textContent = 'Удалить';
    remove.setAttribute('aria-label', `Удалить категорию ${category.name}`);
    remove.addEventListener('click', () => onRemove(id));

    item.append(edit, remove);
    return item;
  }

  function createDraftModal(category, fields) {
    const modal = document.createElement('div');
    modal.className = 'fp-modal';
    modal.setAttribute('role', 'presentation');

    const fieldMarkup = fields.length > 0
      ? fields.map(createDraftFieldMarkup).join('')
      : '<div class="fp-empty">В этой категории нет редактируемых полей.</div>';

    modal.innerHTML = `
      <section
        class="fp-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fp-draft-title"
      >
        <header class="fp-modal__header">
          <div>
            <div class="fp-panel__eyebrow">Черновик будущей копии</div>
            <h2 class="fp-modal__title" id="fp-draft-title"></h2>
          </div>
          <button
            class="fp-modal__close"
            type="button"
            aria-label="Закрыть редактор"
          >×</button>
        </header>
        <p class="fp-modal__description">
          Поля уже заполнены из исходного объявления. Изменения применятся
          только к этой копии.
        </p>
        <div class="fp-modal__body">${fieldMarkup}</div>
        <footer class="fp-modal__footer">
          <button class="fp-modal__cancel" type="button">Отмена</button>
          <button class="fp-modal__save" type="button">Сохранить настройки</button>
        </footer>
      </section>
    `;
    modal.querySelector('#fp-draft-title').textContent = category.name;
    bindDraftDependencies(modal);
    return modal;
  }

  function createDraftFieldMarkup(field, index) {
    const id = `fp-draft-field-${index}`;
    const semanticAttribute = field.semanticKey
      ? ` data-draft-semantic="${escapeAttribute(field.semanticKey)}"`
      : '';
    const commonAttributes =
      `data-draft-name="${escapeAttribute(field.name)}" ` +
      `data-draft-type="${field.type}"`;

    if (field.type === 'checkbox') {
      return `
        <label class="fp-draft-check"${semanticAttribute}>
          <input
            type="checkbox"
            ${commonAttributes}
            data-checked-value="${escapeAttribute(field.checkedValue)}"
            ${field.checked ? 'checked' : ''}
          >
          <span>${escapeHtml(field.label)}</span>
        </label>
      `;
    }

    if (field.type === 'select' || field.type === 'radio') {
      const options = (field.options || []).map((option) => {
        const selected = field.values.includes(String(option.value));
        return `
          <option
            value="${escapeAttribute(option.value)}"
            ${selected ? 'selected' : ''}
          >${escapeHtml(option.label)}</option>
        `;
      }).join('');

      return `
        <label class="fp-draft-field" for="${id}"${semanticAttribute}>
          <span>${escapeHtml(field.label)}</span>
          <select
            id="${id}"
            ${commonAttributes}
            ${field.multiple ? 'multiple' : ''}
          >${options}</select>
        </label>
      `;
    }

    const value = field.values[0] || '';
    const control = field.type === 'textarea'
      ? `<textarea id="${id}" ${commonAttributes}>${escapeHtml(value)}</textarea>`
      : `<input id="${id}" type="${field.type}" ${commonAttributes} value="${escapeAttribute(value)}">`;

    return `
      <label class="fp-draft-field" for="${id}"${semanticAttribute}>
        <span>${escapeHtml(field.label)}</span>
        ${control}
      </label>
    `;
  }

  function bindDraftDependencies(modal) {
    const autoDelivery = modal.querySelector(
      '[data-draft-semantic="autoDelivery"] input[data-draft-name]'
    );
    const goodsFields = modal.querySelectorAll(
      '[data-draft-semantic="deliveryGoods"]'
    );
    const stockFields = modal.querySelectorAll(
      '[data-draft-semantic="stock"]'
    );

    if (!autoDelivery) return;

    const setFieldsHidden = (fields, hidden) => {
      for (const field of fields) {
        field.hidden = hidden;
        field.querySelectorAll('[data-draft-name]').forEach((control) => {
          control.disabled = hidden;
        });
      }
    };
    const updateDependentFields = () => {
      setFieldsHidden(goodsFields, !autoDelivery.checked);
      setFieldsHidden(stockFields, autoDelivery.checked);
    };

    autoDelivery.addEventListener('change', updateDependentFields);
    updateDependentFields();
  }

  function getDraftModalElements(modal) {
    return {
      dialog: modal.querySelector('.fp-modal__dialog'),
      closeButton: modal.querySelector('.fp-modal__close'),
      cancelButton: modal.querySelector('.fp-modal__cancel'),
      saveButton: modal.querySelector('.fp-modal__save')
    };
  }

  function collectDraftOverrides(modal) {
    const overrides = {};

    for (const control of modal.querySelectorAll('[data-draft-name]')) {
      if (control.disabled) continue;

      const name = control.dataset.draftName;
      const type = control.dataset.draftType;
      let values;

      if (type === 'checkbox') {
        values = control.checked ? [control.dataset.checkedValue || 'on'] : [];
      } else if (control.tagName === 'SELECT' && control.multiple) {
        values = [...control.selectedOptions].map((option) => option.value);
      } else {
        values = [control.value];
      }

      overrides[name] = { values };
    }

    return overrides;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();

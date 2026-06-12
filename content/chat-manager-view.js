(() => {
  const namespace = globalThis.FunPayAutomation;

  class ChatManagerView {
    constructor() {
      this.host = null;
      this.panelOpen = false;
      this.searchQuery = '';
      this.settings = null;
      this.context = null;
      this.handlers = {};
      this.onOutside = this.onOutside.bind(this);
    }

    mount(chatForm, handlers) {
      this.handlers = handlers;
      this.host = document.createElement('section');
      this.host.id = 'fpat-chat-manager';
      this.host.setAttribute('aria-label', 'Быстрые ответы FunPay Automation');
      chatForm.before(this.host);
      this.host.addEventListener('click', (event) => this.onClick(event));
      this.host.addEventListener('input', (event) => this.onInput(event));
      document.addEventListener('mousedown', this.onOutside, true);
      document.addEventListener('keydown', this.onOutside, true);
    }

    destroy() {
      document.removeEventListener('mousedown', this.onOutside, true);
      document.removeEventListener('keydown', this.onOutside, true);
      this.host?.remove();
      this.host = null;
    }

    onOutside(event) {
      if (!this.panelOpen || !this.host) return;
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && this.host.contains(event.target)) return;
      this.panelOpen = false;
      this.render(this.settings, this.context);
    }

    render(settings, context) {
      if (!this.host) return;
      this.settings = settings;
      this.context = context;
      // Hide entirely until a dialog is actually open — there is nothing to
      // answer on the empty "Выберите диалог" screen.
      this.host.hidden = !settings.managerEnabled || !context.conversationId;
      if (this.host.hidden) {
        this.panelOpen = false;
        return;
      }

      const ordered = sortTemplates(settings.templates);
      const filtered = filterTemplates(ordered, this.searchQuery);
      // The bar surfaces up to three pinned templates, in the order set in
      // settings (drag-to-reorder), for one-tap insertion.
      const quickTemplates = settings.templates
        .filter((template) => template.pinned)
        .slice(0, 3);
      const actionLabel =
        settings.templateAction === 'send' ? 'Отправить' : 'Вставить';

      this.host.classList.toggle('is-open', this.panelOpen);
      this.host.innerHTML = `
        <div class="fpat-chat-manager__bar">
          <button class="fpat-chat-manager__toggle" type="button"
            data-chat-action="toggle" aria-expanded="${this.panelOpen}">
            ${icon('message')}
            <span>Быстрые ответы</span>
            <small>${settings.templates.length}</small>
          </button>
          <div class="fpat-chat-manager__quick">
            ${quickTemplates.map((template) => `
              <button type="button" data-template-id="${escapeAttribute(template.id)}"
                title="${escapeAttribute(template.text)}">
                ${escapeHtml(template.name)}
              </button>
            `).join('')}
          </div>
          <button class="fpat-chat-manager__settings" type="button"
            data-chat-action="settings" title="Настроить шаблоны">
            ${icon('settings')}
          </button>
        </div>
        <div class="fpat-chat-manager__panel" ${this.panelOpen ? '' : 'hidden'}>
          <header>
            <div>
              <strong>Ответ для ${escapeHtml(context.buyerName || 'покупателя')}</strong>
              <span>${escapeHtml(context.offerName || 'Личный диалог')}</span>
            </div>
            <button type="button" data-chat-action="close" aria-label="Закрыть">
              ${icon('close')}
            </button>
          </header>
          <div class="fpat-chat-manager__search">
            ${icon('search')}
            <input type="search" data-chat-search
              value="${escapeAttribute(this.searchQuery)}"
              placeholder="Найти шаблон">
          </div>
          <div class="fpat-chat-manager__list">
            ${renderGreeting(settings, actionLabel)}
            ${filtered.map((template) =>
              renderTemplateItem(template, actionLabel)
            ).join('')}
            ${filtered.length || settings.greetingEnabled ? '' : `
              <div class="fpat-chat-manager__empty">
                <strong>Шаблонов пока нет</strong>
                <span>Создайте первый шаблон в разделе «Сообщения».</span>
              </div>
            `}
          </div>
          <footer>
            <span>${settings.templateAction === 'send'
              ? 'Шаблон отправляется штатной формой FunPay'
              : 'Шаблон вставляется в поле ввода'}</span>
            <button type="button" data-chat-action="settings">Управлять шаблонами</button>
          </footer>
        </div>
        <div class="fpat-chat-manager__notice" role="status" aria-live="polite"></div>
      `;
    }

    showNotice(message, tone = '') {
      const notice = this.host?.querySelector('.fpat-chat-manager__notice');
      if (!notice) return;
      notice.textContent = message;
      notice.className = `fpat-chat-manager__notice is-visible${
        tone ? ` is-${tone}` : ''
      }`;
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => {
        notice.classList.remove('is-visible', 'is-error');
      }, 2600);
    }

    onClick(event) {
      const action = event.target.closest('[data-chat-action]')?.dataset.chatAction;
      const templateId = event.target.closest('[data-template-id]')
        ?.dataset.templateId;

      if (action === 'toggle') {
        this.panelOpen = !this.panelOpen;
        this.render(this.settings, this.context);
        if (this.panelOpen) {
          queueMicrotask(() => this.host.querySelector('[data-chat-search]')?.focus());
        }
        return;
      }
      if (action === 'close') {
        this.panelOpen = false;
        this.render(this.settings, this.context);
        return;
      }
      if (action === 'settings') {
        this.handlers.openSettings?.();
        return;
      }
      if (action === 'greeting') {
        this.handlers.useGreeting?.();
        this.closePanel();
        return;
      }
      if (templateId) {
        this.handlers.useTemplate?.(templateId);
        this.closePanel();
      }
    }

    closePanel() {
      if (!this.panelOpen) return;
      this.panelOpen = false;
      this.render(this.settings, this.context);
    }

    onInput(event) {
      if (!event.target.matches('[data-chat-search]')) return;
      this.searchQuery = event.target.value;
      const selection = event.target.selectionStart;
      this.render(this.settings, this.context);
      const search = this.host.querySelector('[data-chat-search]');
      search?.focus();
      search?.setSelectionRange(selection, selection);
    }
  }

  function renderGreeting(settings, actionLabel) {
    if (!settings.greetingEnabled || !settings.greetingText.trim()) return '';
    return `
      <button class="fpat-chat-manager__item is-greeting" type="button"
        data-chat-action="greeting">
        <span class="fpat-chat-manager__item-icon">${icon('spark')}</span>
        <span class="fpat-chat-manager__item-copy">
          <strong>Приветствие</strong>
          <small>${escapeHtml(settings.greetingText)}</small>
        </span>
        <span class="fpat-chat-manager__item-action">${actionLabel}</span>
      </button>
    `;
  }

  function renderTemplateItem(template, actionLabel) {
    return `
      <button class="fpat-chat-manager__item${template.pinned ? ' is-pinned' : ''}" type="button"
        data-template-id="${escapeAttribute(template.id)}">
        <span class="fpat-chat-manager__item-icon">${icon(template.pinned ? 'pin' : 'message')}</span>
        <span class="fpat-chat-manager__item-copy">
          <strong>${escapeHtml(template.name)}</strong>
          <small>${escapeHtml(template.text || 'Пустой шаблон')}</small>
        </span>
        <span class="fpat-chat-manager__item-action">${actionLabel}</span>
      </button>
    `;
  }

  function sortTemplates(templates) {
    return [...templates].sort(
      (left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))
    );
  }

  function filterTemplates(templates, query) {
    const normalized = String(query || '').trim().toLocaleLowerCase('ru');
    if (!normalized) return templates;
    return templates.filter((template) =>
      `${template.name} ${template.text}`
        .toLocaleLowerCase('ru')
        .includes(normalized)
    );
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('\n', ' ');
  }

  function icon(name) {
    const paths = {
      close: '<path d="m7 7 10 10M17 7 7 17"/>',
      message: '<path d="M5 5h14v10H9l-4 4zM8 9h8M8 12h5"/>',
      search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1z"/>',
      pin: '<path d="m12 4 2.3 4.7 5.2.8-3.7 3.7.9 5.1-4.7-2.5-4.7 2.5.9-5.1L4.5 9.5l5.2-.8z"/>',
      spark: '<path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8z"/><path d="m18 15 .7 2.3L21 18l-2.3.7L18 21l-.7-2.3L15 18l2.3-.7z"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${
      paths[name] || paths.message
    }</svg>`;
  }

  namespace.ChatManagerView = ChatManagerView;
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const { Config } = namespace;
  const ICONS = {
    overview: '<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z"/></svg>',
    offers: '<svg viewBox="0 0 24 24"><path d="M4 6.5h16v13H4zM8 6.5V4h8v2.5M8 11h8M8 15h5"/></svg>',
    messages: '<svg viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 4zM8 9h8M8 13h5"/></svg>',
    orders: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/></svg>',
    appearance: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4.5A4.5 4.5 0 0 0 21 8.5C21 5.5 17 3 12 3z"/><path d="M7.5 9h.01M10 6.5h.01M15 6.5h.01"/></svg>',
    calculators: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18H5zM8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>',
    notifications: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
    diagnostics: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h5M8 16h3"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.7 2c-1 .7-1.4 1.2-1.4 2.2M12 17h.01"/></svg>'
  };

  class ToolbarShell {
    constructor() {
      this.host = document.createElement('div');
      this.host.id = 'fpat-toolbar-host';
      this.host.style.cssText = 'position: fixed; z-index: 2147483647;';
      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.previouslyFocused = null;
      this.onNavigate = null;
      this.build();
    }

    build() {
      const style = document.createElement('style');
      style.textContent = namespace.styles;
      this.overlay = document.createElement('div');
      this.overlay.className = 'fpat-overlay';
      this.overlay.hidden = true;
      this.overlay.innerHTML = `
        <section class="fpat-shell" role="dialog" aria-modal="true" aria-labelledby="fpat-title">
          <aside class="fpat-sidebar">
            <div class="fpat-brand">
              <div class="fpat-brand__mark">F</div>
              <div>
                <strong id="fpat-title">FunPay Automation</strong>
                <span>Центр управления</span>
              </div>
            </div>
            <nav class="fpat-nav" aria-label="Разделы"></nav>
            <div class="fpat-sidebar__footer">Версия ${chrome.runtime.getManifest().version}</div>
          </aside>
          <main class="fpat-main">
            <header class="fpat-topbar">
              <input class="fpat-topbar__search" type="search" placeholder="Найти настройку">
              <div class="fpat-account">
                <div class="fpat-account__info">
                  <strong></strong>
                  <span></span>
                </div>
                <img class="fpat-account__avatar" src="" hidden alt="">
              </div>
              <button class="fpat-close" type="button" aria-label="Закрыть">×</button>
            </header>
            <div class="fpat-content"></div>
            <div class="fpat-toast" role="status" aria-live="polite"></div>
          </main>
        </section>
      `;
      this.shadow.append(style, this.overlay);
      this.content = this.shadow.querySelector('.fpat-content');
      this.nav = this.shadow.querySelector('.fpat-nav');
      this.search = this.shadow.querySelector('.fpat-topbar__search');
      this.toast = this.shadow.querySelector('.fpat-toast');
      this.renderNavigation();
      this.bind();
    }

    mount() {
      if (!this.host.isConnected) document.documentElement.append(this.host);
      this.applyTheme();
    }

    open(sectionId, account) {
      this.mount();
      this.previouslyFocused = document.activeElement;
      this.setAccount(account);
      this.overlay.hidden = false;
      this.lockPageScroll();
      requestAnimationFrame(() => this.overlay.classList.add('is-open'));
      document.addEventListener('keydown', this.handleKeyDown);
      this.navigate(sectionId);
      this.shadow.querySelector('.fpat-close').focus();
    }

    close() {
      this.overlay.classList.remove('is-open');
      document.removeEventListener('keydown', this.handleKeyDown);
      this.unlockPageScroll();
      window.setTimeout(() => {
        this.overlay.hidden = true;
      }, 160);
      this.previouslyFocused?.focus?.();
    }

    applyTheme() {
      const theme = namespace.currentTheme || {};
      this.host.dataset.theme = theme.mode || 'light';
      this.host.dataset.density = theme.density || 'standard';
      this.host.dataset.preset = theme.preset || 'standard';
      this.host.style.setProperty('--accent', theme.accent || '#d99a16');
      this.host.style.setProperty(
        '--accent-strong',
        theme.mode === 'dark' ? theme.accent || '#d99a16' : '#a96f00'
      );
    }

    lockPageScroll() {
      if (this.pageOverflow !== undefined) return;
      this.pageOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
    }

    unlockPageScroll() {
      if (this.pageOverflow === undefined) return;
      document.documentElement.style.overflow = this.pageOverflow;
      this.pageOverflow = undefined;
    }

    navigate(sectionId) {
      this.nav.querySelectorAll('button').forEach((button) => {
        button.setAttribute(
          'aria-current',
          button.dataset.section === sectionId ? 'page' : 'false'
        );
      });
      this.search.value = '';
      this.onNavigate?.(sectionId);
    }

    render(content, preserveScroll = false) {
      const offset = preserveScroll ? this.content.scrollTop : 0;
      this.content.replaceChildren(content);
      this.content.scrollTop = offset;
    }

    showToast(message) {
      this.toast.textContent = message;
      this.toast.classList.add('is-visible');
      clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(
        () => this.toast.classList.remove('is-visible'),
        2800
      );
    }

    confirm(title, message, confirmLabel = 'Подтвердить') {
      return new Promise((resolve) => {
        const layer = document.createElement('div');
        layer.className = 'fpat-confirm';
        layer.innerHTML = `
          <section class="fpat-confirm__dialog" role="alertdialog" aria-modal="true">
            <h3></h3>
            <p></p>
            <div class="fpat-confirm__actions">
              <button class="fpat-button" type="button" data-action="cancel">Отмена</button>
              <button class="fpat-button fpat-button--danger" type="button" data-action="confirm"></button>
            </div>
          </section>
        `;
        layer.querySelector('h3').textContent = title;
        layer.querySelector('p').textContent = message;
        layer.querySelector('[data-action="confirm"]').textContent = confirmLabel;
        const close = (result) => {
          layer.remove();
          resolve(result);
        };
        layer.querySelector('[data-action="cancel"]')
          .addEventListener('click', () => close(false));
        layer.querySelector('[data-action="confirm"]')
          .addEventListener('click', () => close(true));
        layer.addEventListener('mousedown', (event) => {
          if (event.target === layer) close(false);
        });
        this.overlay.querySelector('.fpat-shell').append(layer);
        layer.querySelector('[data-action="cancel"]').focus();
      });
    }

    setAccount(account) {
      const container = this.shadow.querySelector('.fpat-account');
      container.querySelector('strong').textContent = account.username;
      container.querySelector('span').textContent = account.authenticated
        ? `ID ${account.userId}`
        : 'FunPay не авторизован';

      const avatar = container.querySelector('.fpat-account__avatar');
      if (account.avatarUrl) {
        avatar.src = account.avatarUrl;
        avatar.hidden = false;
      } else {
        avatar.hidden = true;
      }
    }

    renderNavigation() {
      Config.sections.forEach(([id, title, subtitle]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.section = id;
        button.innerHTML = `
          <span class="fpat-nav__icon" aria-hidden="true">${ICONS[id]}</span>
          <span class="fpat-nav__copy">
            <strong>${title}</strong>
            <span>${subtitle}</span>
          </span>
        `;
        this.nav.append(button);
      });
    }

    bind() {
      this.handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          this.close();
          return;
        }
        if (event.key !== 'Tab') return;

        const focusable = [...this.shadow.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href]'
        )].filter((element) => !element.hidden);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && this.shadow.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && this.shadow.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };

      this.shadow.querySelector('.fpat-close')
        .addEventListener('click', () => this.close());
      this.overlay.addEventListener('mousedown', (event) => {
        if (event.target === this.overlay) this.close();
      });
      this.nav.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-section]');
        if (button) this.navigate(button.dataset.section);
      });
      this.search.addEventListener('input', () => {
        const query = this.search.value.trim().toLocaleLowerCase('ru');
        this.content.querySelectorAll(
          '.fpat-card, .fpat-metric, .fpat-section-header'
        ).forEach((element) => {
          element.hidden = Boolean(query) &&
            !element.textContent.toLocaleLowerCase('ru').includes(query);
        });
      });
    }
  }

  namespace.ToolbarShell = ToolbarShell;
})();

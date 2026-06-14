(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const { Config } = namespace;

  class ToolbarController {
    constructor({ store, shell, adapters }) {
      this.store = store;
      this.shell = shell;
      this.adapters = adapters;
      this.currentSection = Config.defaultSection;
      this.shell.onNavigate = (sectionId) => {
        void this.navigate(sectionId);
      };
    }

    async initialize() {
      const settings = await this.store.load();
      namespace.Theme.apply(settings.appearance);
      // Re-apply the page theme only when the appearance actually changes.
      // Re-applying on every settings write (e.g. toggling an order scenario)
      // repaints the page background/skin and makes tall toolbar sections flash.
      let lastAppearance = JSON.stringify(settings.appearance);
      this.store.subscribe((nextSettings) => {
        const nextAppearance = JSON.stringify(nextSettings.appearance);
        if (nextAppearance === lastAppearance) return;
        lastAppearance = nextAppearance;
        namespace.Theme.apply(nextSettings.appearance);
      });
      this.injectNavigationButton();
      chrome.runtime.onMessage.addListener((message) => {
        if (message?.action !== 'openToolbar') return false;
        void this.open(message.sectionId);
        return false;
      });
    }

    async open(sectionId = null) {
      const settings = this.store.get();
      const resolved = namespace.Sections[sectionId]
        ? sectionId
        : settings.ui.lastSection || Config.defaultSection;
      this.shell.open(resolved, this.adapters.getAccount());
    }

    async navigate(sectionId, { preserveScroll = false } = {}) {
      if (!namespace.Sections[sectionId]) return;
      this.currentSection = sectionId;
      await this.store.update('ui.lastSection', sectionId);
      const context = this.createContext();
      const content = await namespace.Sections[sectionId](context);
      if (this.currentSection === sectionId) {
        this.shell.render(content, preserveScroll);
      }
    }

    createContext() {
      return {
        adapters: this.adapters,
        links: this.adapters.getLinks(),
        settings: this.store.get(),
        store: this.store,
        shell: this.shell,
        navigate: (sectionId) => this.shell.navigate(sectionId),
        rerender: () => this.navigate(this.currentSection, { preserveScroll: true })
      };
    }

    injectNavigationButton() {
      if (document.getElementById('fpat-toolbar-entry')) return;
      const target = findNavigationTarget();
      if (!target) {
        const observer = new MutationObserver(() => {
          const nextTarget = findNavigationTarget();
          if (!nextTarget || document.getElementById('fpat-toolbar-entry')) return;
          observer.disconnect();
          this.appendNavigationButton(nextTarget);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        return;
      }
      this.appendNavigationButton(target);
    }

    appendNavigationButton(target) {
      const wrapper = document.createElement(target.tagName === 'UL' ? 'li' : 'span');
      wrapper.id = 'fpat-toolbar-entry';
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = 'Инструменты';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.open();
      });
      wrapper.append(link);
      target.append(wrapper);
    }
  }

  function findNavigationTarget() {
    return document.querySelector(
      '.navbar-nav.navbar-right, .navbar-right, header .navbar-nav, .navbar .nav'
    );
  }

  namespace.ToolbarController = ToolbarController;
})();

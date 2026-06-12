(() => {
  const namespace = globalThis.FunPayAutomation;
  const Core = namespace.ChatManagerCore;
  const Context = namespace.ChatManagerContext;

  class ChatManagerController {
    constructor({
      store = new namespace.ChatManagerStore(),
      view = new namespace.ChatManagerView()
    } = {}) {
      this.store = store;
      this.view = view;
      this.form = null;
      this.context = null;
      this.settings = Core.normalizeSettings();
      this.greetingTimer = null;
      this.scanTimer = null;
      this.observer = null;
    }

    async initialize() {
      this.settings = await this.store.load();
      this.store.subscribe((settings) => {
        this.settings = settings;
        this.render();
        this.scheduleGreeting();
      });

      this.observer = new MutationObserver((mutations) => {
        const host = this.view.host;
        const onlyManagerChanges =
          host &&
          mutations.every((mutation) =>
            mutation.target === host || host.contains(mutation.target)
          );
        if (!onlyManagerChanges) this.queueScan();
      });
      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'data-id']
      });
      this.scan();
    }

    destroy() {
      clearTimeout(this.greetingTimer);
      clearTimeout(this.scanTimer);
      this.observer?.disconnect();
      this.store.destroy();
      this.view.destroy();
    }

    queueScan() {
      clearTimeout(this.scanTimer);
      this.scanTimer = setTimeout(() => this.scan(), 60);
    }

    scan() {
      const form = Context.findChatForm();
      if (!form) {
        if (this.form) {
          this.form = null;
          this.context = null;
          this.view.destroy();
        }
        return;
      }

      if (form !== this.form) {
        this.form = form;
        this.view.destroy();
        this.view.mount(form.closest('.chat-form') || form, {
          openSettings: () => this.openSettings(),
          useGreeting: () => this.useMessage(
            this.settings.greetingText,
            this.settings.greetingAction
          ),
          useTemplate: (templateId) => this.useTemplate(templateId)
        });
      }

      const nextContext = Context.read(form);
      const conversationChanged =
        nextContext.conversationId !== this.context?.conversationId;
      this.context = nextContext;
      this.render();
      if (conversationChanged) this.scheduleGreeting();
    }

    render() {
      if (!this.context) return;
      this.view.render(this.settings, this.context);
    }

    useTemplate(templateId) {
      const template = this.settings.templates.find(
        (item) => item.id === templateId
      );
      if (!template) return;
      this.useMessage(template.text, this.settings.templateAction);
    }

    useMessage(source, requestedAction) {
      if (!this.context?.textarea) return;
      const text = Core.renderTemplate(source, this.context);
      if (!text.trim()) return;

      const textarea = this.context.textarea;
      const hasDraft = Boolean(textarea.value.trim());
      const action = requestedAction === 'send' && !hasDraft ? 'send' : 'insert';
      insertAtCursor(textarea, text);

      if (action === 'send') {
        this.submitNativeForm();
        this.view.showNotice('Сообщение передано штатной форме FunPay.');
        return;
      }

      this.view.showNotice(
        requestedAction === 'send' && hasDraft
          ? 'В поле уже был текст, поэтому шаблон только вставлен.'
          : 'Шаблон вставлен в поле сообщения.'
      );
    }

    scheduleGreeting() {
      clearTimeout(this.greetingTimer);
      if (!this.context?.ready) return;

      const conversationId = this.context.conversationId;
      const shouldApply = Core.shouldApplyGreeting({
        settings: this.settings,
        conversationId,
        handled: this.store.hasHandledGreeting(conversationId),
        hasOwnMessage: this.context.hasOwnMessage,
        textareaValue: this.context.textarea?.value,
        buyerName: this.context.buyerName
      });
      if (!shouldApply) return;

      const delayMs = Math.max(
        250,
        this.settings.greetingDelaySeconds * 1000
      );
      this.greetingTimer = setTimeout(async () => {
        this.scan();
        if (
          !this.context ||
          !this.context.ready ||
          this.context.conversationId !== conversationId ||
          !Core.shouldApplyGreeting({
            settings: this.settings,
            conversationId,
            handled: this.store.hasHandledGreeting(conversationId),
            hasOwnMessage: this.context.hasOwnMessage,
            textareaValue: this.context.textarea?.value,
            buyerName: this.context.buyerName
          })
        ) {
          return;
        }

        const action = this.settings.greetingAction;
        const text = Core.renderTemplate(
          this.settings.greetingText,
          this.context
        );
        insertAtCursor(this.context.textarea, text);
        await this.store.markGreetingHandled(conversationId, action);

        if (action === 'send') {
          this.submitNativeForm();
          this.view.showNotice('Приветствие передано штатной форме FunPay.');
        } else {
          this.view.showNotice('Приветствие подготовлено в поле сообщения.');
        }
      }, delayMs);
    }

    submitNativeForm() {
      const submit = this.form?.querySelector('button[type="submit"]');
      if (!this.form || !submit) return;
      this.form.requestSubmit(submit);
    }

    openSettings() {
      const toolbar = globalThis.FunPayAutomationToolbarAPI;
      if (toolbar?.open) {
        void toolbar.open('messages');
        return;
      }
      this.view.showNotice('Откройте «Инструменты → Сообщения».', 'error');
    }
  }

  function insertAtCursor(textarea, value) {
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    const separator =
      textarea.value &&
      start === textarea.value.length &&
      !textarea.value.endsWith('\n')
        ? '\n'
        : '';
    const inserted = separator + value;
    textarea.value =
      textarea.value.slice(0, start) +
      inserted +
      textarea.value.slice(end);
    const cursor = start + inserted.length;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange?.(cursor, cursor);
  }

  namespace.ChatManagerController = ChatManagerController;
})();

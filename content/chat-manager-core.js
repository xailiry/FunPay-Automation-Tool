(() => {
  const namespace = globalThis.FunPayAutomation ||= {};

  const DEFAULTS = Object.freeze({
    managerEnabled: true,
    greetingEnabled: false,
    greetingText: 'Здравствуйте! Спасибо за обращение.',
    greetingDelaySeconds: 5,
    onlyNewChats: true,
    greetingAction: 'insert',
    templateAction: 'insert',
    templates: []
  });

  namespace.ChatManagerCore = Object.freeze({
    defaults: DEFAULTS,
    getConversationId,
    normalizeSettings,
    renderTemplate,
    shouldApplyGreeting
  });

  function normalizeSettings(value = {}) {
    const source = isRecord(value) ? value : {};
    return {
      managerEnabled: source.managerEnabled !== false,
      greetingEnabled: Boolean(source.greetingEnabled),
      greetingText: String(source.greetingText || DEFAULTS.greetingText),
      greetingDelaySeconds: clampNumber(
        source.greetingDelaySeconds,
        0,
        300,
        DEFAULTS.greetingDelaySeconds
      ),
      onlyNewChats: source.onlyNewChats !== false,
      greetingAction: normalizeAction(source.greetingAction),
      templateAction: normalizeAction(source.templateAction),
      templates: normalizeTemplates(source.templates)
    };
  }

  function renderTemplate(value, context = {}) {
    const date = context.date instanceof Date ? context.date : new Date();
    const buyerName = normalizeText(context.buyerName) || 'покупатель';
    const offerName = normalizeText(context.offerName) || 'объявление';

    return String(value || '')
      .replaceAll('{buyername}', buyerName)
      .replaceAll('{offername}', offerName)
      .replaceAll(
        '{time}',
        date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })
      )
      .replaceAll(
        '{date}',
        date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long'
        })
      );
  }

  function getConversationId({
    activeContactId = '',
    pathname = '',
    search = ''
  } = {}) {
    const contactId = normalizeText(activeContactId);
    if (contactId) return `chat:${contactId}`;

    const orderId = String(pathname).match(/\/orders\/([^/]+)\/?$/i)?.[1];
    if (orderId && !['trade', 'orders'].includes(orderId.toLowerCase())) {
      return `order:${orderId}`;
    }

    const node = new URLSearchParams(String(search)).get('node');
    return node ? `chat:${node}` : '';
  }

  function shouldApplyGreeting({
    settings,
    conversationId,
    handled = false,
    hasOwnMessage = false,
    textareaValue = '',
    buyerName = ''
  }) {
    const normalized = normalizeSettings(settings);
    if (!normalized.managerEnabled || !normalized.greetingEnabled) return false;
    if (!conversationId || handled || String(textareaValue).trim()) return false;
    if (!normalized.greetingText.trim()) return false;
    if (normalized.onlyNewChats && hasOwnMessage) return false;
    return normalizeText(buyerName).toLocaleLowerCase('ru') !== 'funpay';
  }

  function normalizeTemplates(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.flatMap((item, index) => {
      if (!isRecord(item)) return [];
      const id = normalizeText(item.id) || `template-${index + 1}`;
      if (seen.has(id)) return [];
      seen.add(id);
      return [{
        id,
        name: normalizeText(item.name) || 'Без названия',
        text: String(item.text || ''),
        pinned: Boolean(item.pinned)
      }];
    });
  }

  function normalizeAction(value) {
    return value === 'send' ? 'send' : 'insert';
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
})();

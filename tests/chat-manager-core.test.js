import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomation = {};
await import('../content/chat-manager-core.js');

const Core = globalThis.FunPayAutomation.ChatManagerCore;

test('normalizes chat manager settings and template actions', () => {
  const settings = Core.normalizeSettings({
    managerEnabled: false,
    greetingDelaySeconds: 999,
    greetingAction: 'send',
    templateAction: 'unknown',
    templates: [
      { id: 'one', name: 'Ответ', text: 'Текст' },
      { id: 'one', name: 'Дубликат', text: 'Не попадёт' },
      { name: '', text: 'Без имени' }
    ]
  });

  assert.equal(settings.managerEnabled, false);
  assert.equal(settings.greetingDelaySeconds, 300);
  assert.equal(settings.greetingAction, 'send');
  assert.equal(settings.templateAction, 'insert');
  assert.deepEqual(settings.templates, [
    { id: 'one', name: 'Ответ', text: 'Текст', pinned: false },
    { id: 'template-3', name: 'Без названия', text: 'Без имени', pinned: false }
  ]);
});

test('keeps the pinned flag on templates', () => {
  const settings = Core.normalizeSettings({
    templates: [{ id: 'p', name: 'Закреплён', text: 'T', pinned: true }]
  });
  assert.equal(settings.templates[0].pinned, true);
});

test('renders chat variables with real context values', () => {
  const rendered = Core.renderTemplate(
    'Привет, {buyername}. Товар: {offername}. {date} {time}',
    {
      buyerName: 'Алексей',
      offerName: 'Подписка',
      date: new Date(2026, 5, 9, 14, 30)
    }
  );

  assert.match(rendered, /^Привет, Алексей\. Товар: Подписка\./);
  assert.match(rendered, /9 июня/);
  assert.match(rendered, /14:30/);
});

test('derives stable conversation ids for chats and orders', () => {
  assert.equal(
    Core.getConversationId({
      activeContactId: '264745499',
      pathname: '/chat/',
      search: '?node=1'
    }),
    'chat:264745499'
  );
  assert.equal(
    Core.getConversationId({
      pathname: '/orders/KM6B26A7/',
      search: ''
    }),
    'order:KM6B26A7'
  );
  assert.equal(
    Core.getConversationId({
      pathname: '/chat/',
      search: '?node=264745499'
    }),
    'chat:264745499'
  );
});

test('applies greeting only to eligible conversations', () => {
  const settings = {
    managerEnabled: true,
    greetingEnabled: true,
    greetingText: 'Здравствуйте',
    onlyNewChats: true
  };

  assert.equal(Core.shouldApplyGreeting({
    settings,
    conversationId: 'chat:1',
    buyerName: 'Покупатель'
  }), true);
  assert.equal(Core.shouldApplyGreeting({
    settings,
    conversationId: 'chat:1',
    buyerName: 'Покупатель',
    hasOwnMessage: true
  }), false);
  assert.equal(Core.shouldApplyGreeting({
    settings,
    conversationId: 'chat:1',
    buyerName: 'Покупатель',
    textareaValue: 'Черновик'
  }), false);
  assert.equal(Core.shouldApplyGreeting({
    settings,
    conversationId: 'chat:1',
    buyerName: 'FunPay'
  }), false);
  assert.equal(Core.shouldApplyGreeting({
    settings,
    conversationId: 'chat:1',
    buyerName: 'Покупатель',
    handled: true
  }), false);
});

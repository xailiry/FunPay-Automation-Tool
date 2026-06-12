(() => {
  const namespace = globalThis.FunPayAutomationToolbar ||= {};

  namespace.Config = Object.freeze({
    storageKey: 'toolbarSettings',
    schemaVersion: 4,
    defaultSection: 'overview',
    sections: [
      ['overview', 'Обзор', 'Главная'],
      ['offers', 'Объявления', 'Управление'],
      ['messages', 'Сообщения', 'Шаблоны'],
      ['orders', 'Заказы и отзывы', 'Сценарии'],
      ['appearance', 'Оформление', 'Интерфейс'],
      ['calculators', 'Калькуляторы', 'Расчёты'],
      ['notifications', 'Уведомления', 'События'],
      ['diagnostics', 'Данные', 'Диагностика'],
      ['help', 'Справка', 'Руководство']
    ],
    defaults: {
      schemaVersion: 4,
      ui: {
        lastSection: 'overview'
      },
      offers: {
        multipostDelayMs: 700,
        maxTargets: 20,
        stopOnError: true,
        presets: []
      },
      messages: {
        managerEnabled: true,
        greetingEnabled: false,
        greetingText: 'Здравствуйте! Спасибо за обращение.',
        greetingDelaySeconds: 5,
        onlyNewChats: true,
        greetingAction: 'insert',
        templateAction: 'insert',
        templates: [
          {
            id: 'thanks',
            name: 'Благодарность',
            text: 'Спасибо за покупку! Если появятся вопросы, напишите в этот чат.'
          }
        ]
      },
      orders: {
        afterPaymentEnabled: false,
        afterPaymentDelayMinutes: 1,
        afterPaymentMessage:
          'Здравствуйте, {buyername}! Спасибо за заказ #{order}. Если появятся вопросы — пишите в этот чат.',
        reviewRequestEnabled: false,
        reviewDelayHours: 2,
        reviewMessage:
          'Спасибо за покупку! Будем благодарны за отзыв о заказе #{order} - это очень помогает магазину.'
      },
      appearance: {
        preset: 'standard',
        mode: 'light',
        accent: '#d99a16',
        density: 'standard',
        customBg: '',
        customSurface: '',
        customText: '',
        backgroundUrl: '',
        backgroundOverlay: 40,
        backgroundBlur: 3,
        backgroundFit: 'cover',
        backgroundPosition: 'center',
        savedThemes: []
      },
      calculators: {
        withdrawalMethod: 'card',
        withdrawalAmount: 1000,
        desiredNet: 1000,
        profitPrice: 1000,
        profitCost: 600,
        profitMethod: 'card'
      },
      notifications: {
        newMessage: true,
        newOrder: true,
        orderClosed: false,
        bumpFinished: true,
        soundEnabled: true,
        volume: 60,
        quietHoursEnabled: false,
        quietFrom: '23:00',
        quietTo: '08:00'
      }
    }
  });
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;

  namespace.Sections ||= {};
  namespace.Sections.help = () => {
    const section = document.createElement('section');
    section.className = 'fpat-section fpat-help';
    section.append(C.sectionHeader(
      'Справка',
      'Краткое руководство по основным возможностям расширения.'
    ));

    const start = C.card('Быстрый старт', 'Три шага, чтобы начать пользоваться расширением.');
    const startBody = document.createElement('div');
    startBody.className = 'fpat-card__body';
    const list = document.createElement('ol');
    list.className = 'fpat-help-steps';
    [
      'Откройте свой профиль, чтобы увидеть панель продавца.',
      'Откройте объявление для выбора дополнительных категорий.',
      'Используйте раздел «Объявления» для ручного и автоматического поднятия.'
    ].forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    });
    startBody.append(list);
    start.append(startBody);

    const guide = C.card('Руководство и частые вопросы');
    const body = document.createElement('div');
    body.className = 'fpat-card__body';
    [
      [
        'Панель продавца',
        'Появляется только в профиле текущего пользователя. В ней доступны поиск, фильтры, метрики, статусы, редактирование и удаление.'
      ],
      [
        'Мультипостинг',
        'Расширение загружает реальную форму каждой целевой категории, переносит совместимые поля и позволяет изменить черновик будущей копии.'
      ],
      [
        'Поднятие объявлений',
        'Кулдаун означает, что категория уже недавно поднималась. Таймер обновляется только после хотя бы одного успешного поднятия.'
      ],
      [
        'Где хранятся данные',
        'Настройки, история операций и кэши хранятся локально в Chrome. Логин и пароль расширение не запрашивает.'
      ],
      [
        'Панель или категории не появились',
        'Перезагрузите расширение на chrome://extensions, обновите вкладку FunPay и проверьте авторизацию.'
      ],
      [
        'Копия объявления не создалась',
        'Проверьте сообщение под панелью. Частые причины: обязательное поле целевой формы, неподходящий тип объявления или завершившаяся сессия.'
      ]
    ].forEach(([title, text], index) => {
      const details = document.createElement('details');
      details.open = index === 0;
      const summary = document.createElement('summary');
      summary.textContent = title;
      const content = document.createElement('div');
      content.textContent = text;
      details.append(summary, content);
      body.append(details);
    });
    guide.append(body);

    const warning = document.createElement('div');
    warning.className = 'fpat-note';
    warning.textContent =
      'Расширение не связано с администрацией FunPay. Автоматизация зависит от интерфейса площадки и не отменяет её правила.';
    section.append(start, guide, warning);
    return section;
  };
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const EVENTS = [
    ['newMessage', 'Новое сообщение', 'Покупатель написал в чат.', 'message'],
    ['newOrder', 'Новый заказ', 'Оформлена покупка вашего товара.', 'cart'],
    ['orderClosed', 'Заказ закрыт', 'Покупатель подтвердил выполнение.', 'check'],
    ['bumpFinished', 'Поднятие завершено', 'Расширение подняло объявления.', 'arrow']
  ];

  namespace.Sections ||= {};
  namespace.Sections.notifications = (context) => {
    const settings = context.settings.notifications;
    const section = document.createElement('section');
    section.className = 'fpat-section';
    section.append(C.sectionHeader(
      'Уведомления',
      'Какие события показывать и когда соблюдать тишину. Сохраняется как единая конфигурация.'
    ));

    const events = C.card('События', 'Изменения, о которых расширение будет оповещать.');
    const eventsBody = document.createElement('div');
    eventsBody.className = 'fpat-card__body';
    EVENTS.forEach(([key, label, hint, iconName]) => {
      eventsBody.append(eventRow(key, label, hint, iconName, settings[key]));
    });
    events.append(eventsBody);

    const sound = C.card('Звук и расписание', 'Звуковой сигнал и время, когда уведомления молчат.');
    const body = document.createElement('div');
    body.className = 'fpat-card__body';
    const soundEnabled = C.checkbox('Звуковые уведомления', settings.soundEnabled);
    const quiet = C.checkbox('Использовать тихие часы', settings.quietHoursEnabled);
    const volume = document.createElement('input');
    volume.className = 'fpat-range';
    volume.type = 'range';
    volume.min = '0';
    volume.max = '100';
    volume.value = String(settings.volume);
    const from = C.text(settings.quietFrom);
    from.type = 'time';
    const to = C.text(settings.quietTo);
    to.type = 'time';
    bindCheck(soundEnabled, 'soundEnabled');
    bindCheck(quiet, 'quietHoursEnabled');
    bind(volume, 'volume', Number);
    bind(from, 'quietFrom', String);
    bind(to, 'quietTo', String);
    const times = document.createElement('div');
    times.className = 'fpat-grid fpat-grid--2';
    times.append(
      C.field('Не беспокоить с', from),
      C.field('Не беспокоить до', to)
    );
    body.append(
      soundEnabled.wrapper,
      C.field('Громкость', volume),
      quiet.wrapper,
      times
    );
    sound.append(body);

    const workGrid = document.createElement('div');
    workGrid.className = 'fpat-work-grid';
    workGrid.append(events, sound);
    section.append(workGrid, note());
    return section;

    function eventRow(key, label, hint, iconName, checked) {
      const row = document.createElement('label');
      row.className = 'fpat-event';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = Boolean(checked);
      const icon = document.createElement('span');
      icon.className = 'fpat-event__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = eventIcon(iconName);
      const copy = document.createElement('span');
      copy.className = 'fpat-event__copy';
      copy.textContent = label;
      copy.title = hint;
      const track = document.createElement('span');
      track.className = 'fpat-switch';
      input.addEventListener('change', () =>
        context.store.update(`notifications.${key}`, input.checked)
      );
      row.append(input, icon, copy, track);
      return row;
    }

    function bind(control, key, cast) {
      control.addEventListener('change', () =>
        context.store.update(`notifications.${key}`, cast(control.value))
      );
    }

    function bindCheck(control, key) {
      control.input.addEventListener('change', () =>
        context.store.update(`notifications.${key}`, control.input.checked)
      );
    }
  };

  function note() {
    const node = document.createElement('div');
    node.className = 'fpat-note';
    node.textContent =
      'Параметры готовы для будущих обработчиков событий. Этот экран сам не читает чаты и заказы.';
    return node;
  }

  function eventIcon(name) {
    const paths = {
      message: '<path d="M5 5h14v10H9l-4 4zM8 9h8M8 12h5"/>',
      cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2 12h11l2-8H6"/>',
      check: '<circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
      arrow: '<path d="M12 19V5M6 11l6-6 6 6"/>'
    };
    return `<svg viewBox="0 0 24 24">${paths[name] || paths.message}</svg>`;
  }
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const VARIABLES = [
    ['{buyername}', 'Имя покупателя'],
    ['{offername}', 'Название товара'],
    ['{order}', 'Номер заказа']
  ];

  namespace.Sections ||= {};
  namespace.Sections.orders = (context) => {
    const settings = context.settings.orders;
    const section = document.createElement('section');
    section.className = 'fpat-section';
    section.append(C.sectionHeader(
      'Заказы и отзывы',
      'Автосообщения покупателю после оплаты и закрытия заказа. Работают в фоне, пока открыт FunPay.'
    ));

    const payment = scenarioCard({
      icon: icon('receipt'),
      title: 'После оплаты заказа',
      description: 'Сообщение покупателю сразу после успешной оплаты.',
      enabled: settings.afterPaymentEnabled
    });
    const paymentEnabled = C.checkbox('Отправлять сообщение после оплаты', settings.afterPaymentEnabled);
    const paymentDelay = C.number(settings.afterPaymentDelayMinutes, { min: 0, max: 1440 });
    const paymentMessage = composer(
      settings.afterPaymentMessage,
      'Например: спасибо за заказ и инструкция, что делать дальше.'
    );
    bindCheck(paymentEnabled, 'afterPaymentEnabled', payment.setState);
    bind(paymentDelay, 'afterPaymentDelayMinutes', Number);
    bindText(paymentMessage.textarea, 'afterPaymentMessage');
    payment.body.append(
      paymentEnabled.wrapper,
      C.field('Задержка, минут', paymentDelay, 'Отсчёт начинается с момента оплаты.'),
      paymentMessage.field
    );

    const review = scenarioCard({
      icon: icon('star'),
      title: 'Просьба оставить отзыв',
      description: 'Напоминание покупателю об отзыве после закрытия заказа.',
      enabled: settings.reviewRequestEnabled
    });
    const reviewEnabled = C.checkbox('Отправлять просьбу после закрытия заказа', settings.reviewRequestEnabled);
    const reviewDelay = C.number(settings.reviewDelayHours, { min: 0, max: 168 });
    const reviewMessage = composer(
      settings.reviewMessage,
      'Например: вежливая просьба оставить отзыв о заказе.'
    );
    bindCheck(reviewEnabled, 'reviewRequestEnabled', review.setState);
    bind(reviewDelay, 'reviewDelayHours', Number);
    bindText(reviewMessage.textarea, 'reviewMessage');
    review.body.append(
      reviewEnabled.wrapper,
      C.field('Задержка после закрытия, часов', reviewDelay),
      reviewMessage.field
    );

    section.append(payment.card, review.card, note());
    return section;

    function bind(control, key, cast) {
      control.addEventListener('change', () =>
        context.store.update(`orders.${key}`, cast(control.value))
      );
    }

    function bindCheck(control, key, onState) {
      control.input.addEventListener('change', () => {
        context.store.update(`orders.${key}`, control.input.checked);
        onState?.(control.input.checked);
      });
    }

    function bindText(control, key) {
      control.addEventListener('change', () =>
        context.store.update(`orders.${key}`, control.value)
      );
    }
  };

  function scenarioCard({ icon, title, description, enabled }) {
    const card = document.createElement('section');
    card.className = 'fpat-card';
    const head = document.createElement('div');
    head.className = 'fpat-card__head';
    head.innerHTML = `
      <div class="fpat-panel-head">
        <span class="fpat-panel-head__icon" aria-hidden="true">${icon}</span>
        <div class="fpat-panel-head__copy">
          <strong></strong>
          <span></span>
        </div>
      </div>
      <span class="fpat-pill"></span>
    `;
    head.querySelector('.fpat-panel-head__copy strong').textContent = title;
    head.querySelector('.fpat-panel-head__copy span').textContent = description;
    const pill = head.querySelector('.fpat-pill');
    const body = document.createElement('div');
    body.className = 'fpat-card__body';
    card.append(head, body);
    const setState = (on) => {
      pill.classList.toggle('is-on', Boolean(on));
      pill.textContent = on ? 'Активно' : 'Выключено';
    };
    setState(enabled);
    return { card, body, setState };
  }

  function composer(value, placeholder) {
    const textarea = C.textarea(value, placeholder);
    textarea.classList.add('fpat-message-composer__input');
    const field = C.field('Текст сообщения', textarea, 'Переменные подставятся при отправке.');
    field.classList.add('fpat-field--wide');
    field.append(variableBar(textarea), preview(textarea));
    return { field, textarea };
  }

  function variableBar(textarea) {
    const bar = document.createElement('div');
    bar.className = 'fpat-message-variables';
    const label = document.createElement('span');
    label.textContent = 'Вставить переменную:';
    bar.append(label);
    for (const [token, title] of VARIABLES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = token;
      button.title = title;
      button.addEventListener('click', () => insertAtCursor(textarea, token));
      bar.append(button);
    }
    return bar;
  }

  function preview(textarea) {
    const node = document.createElement('div');
    node.className = 'fpat-message-preview';
    node.innerHTML = `
      <span class="fpat-message-preview__label">Как увидит покупатель</span>
      <div class="fpat-message-preview__chat">
        <span class="fpat-message-preview__avatar">F</span>
        <div class="fpat-message-preview__bubble"></div>
      </div>
    `;
    const bubble = node.querySelector('.fpat-message-preview__bubble');
    const render = () => {
      bubble.textContent = renderPreview(textarea.value);
    };
    textarea.addEventListener('input', render);
    render();
    return node;
  }

  function renderPreview(value) {
    const text = String(value || '').trim();
    if (!text) return 'Здесь появится предпросмотр сообщения.';
    return text
      .replaceAll('{buyername}', 'Алексей')
      .replaceAll('{offername}', 'ваш товар')
      .replaceAll('{order}', 'A1B2C3D4');
  }

  function insertAtCursor(control, token) {
    const start = control.selectionStart ?? control.value.length;
    const end = control.selectionEnd ?? start;
    control.value = control.value.slice(0, start) + token + control.value.slice(end);
    const cursor = start + token.length;
    control.focus();
    control.setSelectionRange?.(cursor, cursor);
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function note() {
    const node = document.createElement('div');
    node.className = 'fpat-note';
    node.textContent =
      'Сообщения отправляются автоматически, пока открыта вкладка FunPay. Каждому заказу — не больше одного сообщения на сценарий; заказы, оформленные до включения, не затрагиваются.';
    return node;
  }

  function icon(name) {
    const paths = {
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
      star: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/>'
    };
    return `<svg viewBox="0 0 24 24">${paths[name] || ''}</svg>`;
  }
})();

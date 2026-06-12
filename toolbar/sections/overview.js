(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;

  namespace.Sections ||= {};
  namespace.Sections.overview = async (context) => {
    const section = document.createElement('section');
    section.className = 'fpat-section';

    const [state, diagnostics] = await Promise.all([
      context.adapters.getExtensionState().catch(() => ({})),
      context.adapters.getDiagnostics()
    ]);
    const account = context.adapters.getAccount();
    const countdown = globalThis.FunPayBumpCountdown.format(
      state.nextBumpAvailableAt
    );

    section.append(C.sectionHeader(
      'Рабочий стол',
      `Основные действия и последние результаты для ${account.username}.`
    ));

    const status = document.createElement('section');
    status.className = 'fpat-overview-status';
    const statusInfo = document.createElement('div');
    statusInfo.className = 'fpat-overview-status__info';
    statusInfo.innerHTML = `
      <span class="fpat-overview-status__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>
      </span>
      <div class="fpat-overview-status__text">
        <span>Следующее поднятие</span>
        <strong></strong>
        <span class="fpat-overview-status__chip${state.autoBumpEnabled ? ' is-on' : ''}">${
          state.autoBumpEnabled ? 'Авто-поднятие включено' : 'Авто-поднятие выключено'
        }</span>
      </div>
    `;
    statusInfo.querySelector('.fpat-overview-status__text > strong').textContent =
      countdown;

    const statusActions = document.createElement('div');
    statusActions.className = 'fpat-overview-status__actions';
    const bumpNow = C.button(
      state.bumpRunning ? 'Поднятие выполняется...' : 'Поднять товары',
      'primary'
    );
    bumpNow.disabled = Boolean(state.bumpRunning);
    const bumpSettings = C.button('Настроить');
    bumpSettings.addEventListener('click', () => context.navigate('offers'));
    bumpNow.addEventListener('click', async () => {
      bumpNow.disabled = true;
      bumpNow.textContent = 'Проверяем товары...';
      try {
        const result = await context.adapters.triggerBump();
        context.shell.showToast(
          `Поднято: ${result.successCount || 0}, кулдаун: ${result.skippedCount || 0}, ошибок: ${result.failedCount || 0}`
        );
        await context.rerender();
      } catch (error) {
        context.shell.showToast(error.message);
        bumpNow.disabled = false;
        bumpNow.textContent = 'Поднять товары';
      }
    });
    statusActions.append(bumpNow, bumpSettings);
    status.append(statusInfo, statusActions);
    section.append(status);

    const workGrid = document.createElement('div');
    workGrid.className = 'fpat-work-grid';

    const quick = C.card(
      'Продолжить работу',
      'Самые частые действия без поиска по меню FunPay.'
    );
    const quickBody = document.createElement('div');
    quickBody.className = 'fpat-card__body';
    const quickGrid = document.createElement('div');
    quickGrid.className = 'fpat-quick-grid';
    quickGrid.append(
      quickAction(
        'Панель продавца',
        'Объявления, фильтры и статистика продаж.',
        'Открыть профиль',
        () => context.adapters.openUrl(context.links.profile)
      ),
      quickAction(
        'Мои продажи',
        'Заказы, покупатели и история операций.',
        'Открыть продажи',
        () => context.adapters.openUrl(context.links.sales)
      ),
      quickAction(
        'Новое объявление',
        'Создание товара и выбор категорий.',
        'Создать',
        () => context.adapters.openUrl(context.links.createOffer)
      ),
      quickAction(
        'Мультипостинг',
        'Параметры копий и настройки публикации.',
        'Настроить',
        () => context.navigate('offers')
      )
    );
    quickBody.append(quickGrid);
    quick.append(quickBody);

    const operations = C.card(
      'Последние операции',
      'Коротко о том, что расширение делало в последний раз.'
    );
    const operationsBody = document.createElement('div');
    operationsBody.className = 'fpat-card__body';
    operationsBody.append(
      operation(
        'Поднятие товаров',
        formatDate(diagnostics.lastBumpResult?.finishedAt),
        formatBump(diagnostics.lastBumpResult),
        diagnostics.lastBumpResult?.failedCount ? 'warning' : 'good'
      ),
      operation(
        'Мультипостинг',
        formatDate(diagnostics.lastMultiPostResult?.finishedAt),
        formatMultipost(diagnostics.lastMultiPostResult),
        diagnostics.lastMultiPostResult?.failedCount ? 'warning' : 'good'
      ),
      operation(
        'Продажи',
        'Локальные данные панели продавца',
        diagnostics.salesUpdatedAt
          ? `Обновлены ${formatDate(diagnostics.salesUpdatedAt)}`
          : 'Ещё не обновлялись'
      )
    );
    operations.append(operationsBody);
    workGrid.append(quick, operations);
    section.append(workGrid);
    return section;
  };

  function quickAction(title, description, label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fpat-quick-action';
    const copy = document.createElement('span');
    copy.innerHTML = '<strong></strong><span></span>';
    copy.querySelector('strong').textContent = title;
    copy.querySelector('span').textContent = description;
    const action = document.createElement('b');
    action.textContent = `${label} →`;
    button.append(copy, action);
    button.addEventListener('click', onClick);
    return button;
  }

  function operation(title, detail, result, tone = '') {
    const row = document.createElement('div');
    row.className = 'fpat-operation';
    const copy = document.createElement('div');
    const heading = document.createElement('strong');
    const description = document.createElement('span');
    heading.textContent = title;
    description.textContent = detail || 'Нет данных о времени';
    copy.append(heading, description);
    const value = document.createElement('div');
    value.className = `fpat-operation__result${tone ? ` is-${tone}` : ''}`;
    value.textContent = result;
    row.append(copy, value);
    return row;
  }

  function formatBump(result) {
    if (!result) return 'Операций не было';
    if (result.status === 'running') return 'Выполняется';
    if (result.status === 'failed') return result.error || 'Завершилось ошибкой';
    return `Поднято ${result.successCount || 0}, кулдаун ${result.skippedCount || 0}`;
  }

  function formatMultipost(result) {
    if (!result) return 'Операций не было';
    return `Создано ${result.successCount || 0}, ошибок ${result.failedCount || 0}`;
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'Нет данных о времени';
    return new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const MAX_IMPORT_SIZE = 5 * 1024 * 1024;

  namespace.Sections ||= {};
  namespace.Sections.diagnostics = async (context) => {
    const diagnostics = await context.adapters.getDiagnostics();
    const account = context.adapters.getAccount();
    const section = document.createElement('section');
    section.className = 'fpat-section';
    section.append(C.sectionHeader(
      'Данные и диагностика',
      'Локальные настройки, кэши и состояние подключения.'
    ));

    const state = C.card('Состояние', 'Подключение к FunPay и локальные кэши расширения.');
    const stateBody = document.createElement('div');
    stateBody.className = 'fpat-card__body';
    stateBody.append(
      stat('Сессия FunPay', account.authenticated ? 'Активна' : 'Не найдена', account.authenticated ? 'good' : 'warning'),
      stat('Категории в кэше', String(diagnostics.categories), 'plain'),
      stat('Группы объявлений в кэше', String(diagnostics.cachedOfferGroups), 'plain'),
      stat('Продажи обновлены', formatDate(diagnostics.salesUpdatedAt), diagnostics.salesUpdatedAt ? 'good' : 'plain'),
      stat('Категории обновлены', formatDate(diagnostics.categoriesUpdatedAt), diagnostics.categoriesUpdatedAt ? 'good' : 'plain')
    );
    state.append(stateBody);

    const data = C.card('Настройки');
    const dataBody = document.createElement('div');
    dataBody.className = 'fpat-card__body';
    const exportAction = C.action(
      'Экспортировать настройки',
      'Скачать JSON-файл с конфигурацией центра управления.',
      'Экспорт'
    );
    const importAction = C.action(
      'Импортировать настройки',
      'Загрузить ранее сохранённый JSON-файл.',
      'Импорт'
    );
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'application/json,.json';
    file.hidden = true;
    exportAction.control.addEventListener('click', () => downloadSettings(context.store.export()));
    importAction.control.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const selected = file.files?.[0];
      if (!selected) return;
      try {
        if (selected.size > MAX_IMPORT_SIZE) {
          throw new Error('Файл настроек слишком большой. Максимальный размер - 5 МБ.');
        }
        await context.store.import(JSON.parse(await selected.text()));
        namespace.Theme.apply(context.store.getSection('appearance'));
        context.shell.showToast('Настройки импортированы.');
        context.rerender();
      } catch (error) {
        context.shell.showToast(error.message);
      } finally {
        file.value = '';
      }
    });
    dataBody.append(exportAction.row, importAction.row, file);
    data.append(dataBody);

    const maintenance = C.card('Обслуживание');
    const maintenanceBody = document.createElement('div');
    maintenanceBody.className = 'fpat-card__body';
    const resetSection = C.action(
      'Сбросить отдельный раздел',
      'Вернуть выбранный раздел к исходным значениям.',
      'Сбросить'
    );
    const sectionSelect = C.select('appearance', [
      ['offers', 'Объявления'],
      ['messages', 'Сообщения'],
      ['orders', 'Заказы и отзывы'],
      ['appearance', 'Оформление'],
      ['calculators', 'Калькуляторы'],
      ['notifications', 'Уведомления']
    ]);
    sectionSelect.style.width = '180px';
    resetSection.row.insertBefore(sectionSelect, resetSection.control);
    const clear = C.action(
      'Очистить кэши FunPay',
      'Удалить локальные категории, продажи и сохранённый список объявлений.',
      'Очистить'
    );
    const reset = C.action(
      'Сбросить настройки',
      'Вернуть все разделы центра управления к исходным значениям.',
      'Сбросить'
    );
    clear.control.classList.add('fpat-button--danger');
    reset.control.classList.add('fpat-button--danger');
    clear.control.addEventListener('click', async () => {
      const confirmed = await context.shell.confirm(
        'Очистить кэши?',
        'Категории, продажи и локальный список объявлений будут загружены заново.',
        'Очистить'
      );
      if (!confirmed) return;
      await context.adapters.clearCaches();
      context.shell.showToast('Кэши очищены.');
      context.rerender();
    });
    reset.control.addEventListener('click', async () => {
      const confirmed = await context.shell.confirm(
        'Сбросить все настройки?',
        'Оформление, шаблоны и параметры всех разделов вернутся к исходным значениям.',
        'Сбросить всё'
      );
      if (!confirmed) return;
      await context.store.resetAll();
      namespace.Theme.apply(context.store.getSection('appearance'));
      context.shell.showToast('Настройки сброшены.');
      context.rerender();
    });
    resetSection.control.addEventListener('click', async () => {
      await context.store.resetSection(sectionSelect.value);
      if (sectionSelect.value === 'appearance') {
        namespace.Theme.apply(context.store.getSection('appearance'));
      }
      context.shell.showToast('Раздел сброшен.');
    });
    maintenanceBody.append(resetSection.row, clear.row, reset.row);
    maintenance.append(maintenanceBody);
    section.append(state, data, maintenance);
    return section;
  };

  function stat(label, value, tone = 'plain') {
    const row = document.createElement('div');
    row.className = 'fpat-stat';
    const name = document.createElement('span');
    name.textContent = label;
    const result = document.createElement('span');
    result.className = `fpat-stat__value is-${tone}`;
    result.textContent = value;
    row.append(name, result);
    return row;
  }

  function downloadSettings(text) {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `funpay-automation-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function formatDate(timestamp) {
    return timestamp
      ? new Date(timestamp).toLocaleString('ru-RU')
      : 'Нет данных';
  }
})();

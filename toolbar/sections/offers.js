(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const Presets = globalThis.FunPayAutomationPresets;

  namespace.Sections ||= {};
  namespace.Sections.offers = async (context) => {
    const settings = Presets.normalizeOffersSettings(context.settings.offers);
    let state = await context.adapters.getExtensionState().catch(() => ({}));
    const section = document.createElement('section');
    section.className = 'fpat-section fpat-offers';
    section.append(C.sectionHeader(
      'Объявления',
      'Поднятие товаров, параметры публикации и быстрый доступ к панели продавца.'
    ));

    const bump = createBumpPanel();
    section.append(bump.panel, createMultipostPanel());
    startCountdown();
    return section;

    function createBumpPanel() {
      const panel = document.createElement('section');
      panel.className = 'fpat-offers-bump';

      const main = document.createElement('div');
      main.className = 'fpat-offers-bump__main';
      const copy = document.createElement('div');
      copy.className = 'fpat-offers-bump__copy';
      copy.innerHTML = `
        <div class="fpat-offers-eyebrow">Поднятие объявлений</div>
        <h3></h3>
        <p>Расширение проверит активные категории и поднимет только доступные товары.</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'fpat-offers-bump__actions';
      const bumpNow = C.button(
        state.bumpRunning ? 'Поднятие выполняется...' : 'Поднять товары',
        'primary'
      );
      bumpNow.classList.add('fpat-offers-bump__button');
      bumpNow.disabled = Boolean(state.bumpRunning);
      actions.append(bumpNow);
      main.append(copy, actions);

      const footer = document.createElement('div');
      footer.className = 'fpat-offers-bump__footer';
      const auto = C.checkbox(
        'Автоматически проверять товары каждые 4 часа',
        state.autoBumpEnabled
      );
      const autoCopy = document.createElement('span');
      autoCopy.className = 'fpat-offers-bump__hint';
      autoCopy.textContent =
        'Кулдаун и ошибки не запускают новый четырёхчасовой отсчёт.';
      const autoText = auto.wrapper.querySelector('.fpat-switch-row__copy');
      autoText?.append(autoCopy);
      footer.append(auto.wrapper);
      panel.append(main, footer);
      renderBumpState();

      auto.input.addEventListener('change', async () => {
        auto.input.disabled = true;
        try {
          await context.adapters.setAutoBump(auto.input.checked);
          state.autoBumpEnabled = auto.input.checked;
          renderBumpState();
          context.shell.showToast(
            auto.input.checked
              ? 'Авто-поднятие включено.'
              : 'Авто-поднятие выключено.'
          );
        } catch (error) {
          auto.input.checked = !auto.input.checked;
          context.shell.showToast(error.message);
        } finally {
          auto.input.disabled = false;
        }
      });

      bumpNow.addEventListener('click', async () => {
        bumpNow.disabled = true;
        bumpNow.textContent = 'Проверяем товары...';
        panel.classList.add('is-running');
        try {
          const result = await context.adapters.triggerBump();
          context.shell.showToast(
            `Поднято: ${result.successCount || 0}, кулдаун: ${result.skippedCount || 0}, ошибок: ${result.failedCount || 0}`
          );
          state = await context.adapters.getExtensionState();
          renderBumpState();
        } catch (error) {
          context.shell.showToast(error.message);
        } finally {
          panel.classList.remove('is-running');
          bumpNow.disabled = false;
          bumpNow.textContent = 'Поднять товары';
        }
      });

      return { panel, renderBumpState };

      function renderBumpState() {
        const countdown = globalThis.FunPayBumpCountdown.format(
          state.nextBumpAvailableAt
        );
        copy.querySelector('h3').textContent = countdown;
      }
    }

    function createMultipostPanel() {
      const card = C.card(
        'Мультипостинг',
        'Общие параметры очереди для новых копий объявлений.'
      );
      card.classList.add('fpat-offers-multipost');
      const body = document.createElement('div');
      body.className = 'fpat-card__body';

      const summary = document.createElement('div');
      summary.className = 'fpat-offers-summary';
      summary.innerHTML = `
        <div>
          <span>Интервал</span>
          <strong data-summary="delay"></strong>
        </div>
        <div>
          <span>Лимит очереди</span>
          <strong data-summary="targets"></strong>
        </div>
        <div>
          <span>При ошибке</span>
          <strong data-summary="errors"></strong>
        </div>
      `;

      const fields = document.createElement('div');
      fields.className = 'fpat-offers-fields';
      const delay = C.number(settings.multipostDelayMs, {
        min: 300,
        max: 5000,
        step: 100
      });
      const targets = C.number(settings.maxTargets, { min: 1, max: 50 });
      fields.append(
        C.field(
          'Задержка между публикациями',
          withSuffix(delay, 'мс'),
          'Небольшая пауза снижает нагрузку на сайт.'
        ),
        C.field(
          'Максимум целевых категорий',
          withSuffix(targets, 'кат.'),
          'Ограничение одной очереди публикации.'
        )
      );

      const safety = document.createElement('div');
      safety.className = 'fpat-offers-safety';
      const safetyCopy = document.createElement('div');
      safetyCopy.innerHTML = `
        <strong>Безопасное выполнение очереди</strong>
        <span>Выберите, нужно ли прекращать публикацию остальных копий после первой ошибки FunPay.</span>
      `;
      const stop = C.checkbox(
        'Остановить при первой ошибке',
        settings.stopOnError
      );
      safety.append(safetyCopy, stop.wrapper);

      bind(delay, 'multipostDelayMs', Number, renderSummary);
      bind(targets, 'maxTargets', Number, renderSummary);
      stop.input.addEventListener('change', async () => {
        settings.stopOnError = stop.input.checked;
        await context.store.update(
          'offers.stopOnError',
          stop.input.checked
        );
        renderSummary();
      });

      const presetManager = createPresetManager();
      body.append(summary, fields, safety, presetManager);
      card.append(body);
      renderSummary();
      return card;

      function renderSummary() {
        summary.querySelector('[data-summary="delay"]').textContent =
          `${Number(delay.value) || 0} мс`;
        summary.querySelector('[data-summary="targets"]').textContent =
          `${Number(targets.value) || 0}`;
        summary.querySelector('[data-summary="errors"]').textContent =
          stop.input.checked ? 'Остановка' : 'Продолжать';
      }

      function createPresetManager() {
        let catalog = [];
        let catalogLoaded = false;
        let editingPresetId = null;
        let selectedCategories = new Map();

        const manager = document.createElement('section');
        manager.className = 'fpat-multipost-presets';

        const header = document.createElement('div');
        header.className = 'fpat-multipost-presets__header';
        header.innerHTML = `
          <div>
            <h4>Пресеты категорий</h4>
            <p>Сохраняйте часто используемые наборы и загружайте их на форме объявления одним нажатием.</p>
          </div>
        `;
        const add = C.button('Новый пресет', 'primary');
        header.append(add);

        const tools = document.createElement('div');
        tools.className = 'fpat-multipost-presets__tools';
        const presetSearch = C.text('', 'Найти пресет');
        presetSearch.type = 'search';
        tools.append(presetSearch);

        const list = document.createElement('div');
        list.className = 'fpat-multipost-presets__list';

        const editor = document.createElement('div');
        editor.className = 'fpat-multipost-preset-editor';
        editor.hidden = true;
        const editorHeader = document.createElement('div');
        editorHeader.className = 'fpat-multipost-preset-editor__header';
        const editorTitle = document.createElement('div');
        editorTitle.innerHTML = `
          <strong>Новый пресет</strong>
          <span>Выберите категории, которые будут добавляться в будущую публикацию.</span>
        `;
        const cancel = C.button('Закрыть');
        editorHeader.append(editorTitle, cancel);

        const name = C.text('', 'Например, ИИ-сервисы');
        const categorySearch = C.text('', 'Gemini, Claude или название категории');
        categorySearch.type = 'search';
        const categoryMeta = document.createElement('div');
        categoryMeta.className = 'fpat-multipost-preset-editor__meta';
        const picker = document.createElement('div');
        picker.className = 'fpat-multipost-preset-editor__picker';
        const results = document.createElement('div');
        results.className = 'fpat-multipost-preset-editor__results';
        const selection = document.createElement('div');
        selection.className = 'fpat-multipost-preset-editor__selection';
        picker.append(results, selection);

        const editorActions = document.createElement('div');
        editorActions.className = 'fpat-toolbar';
        const refresh = C.button('Обновить категории');
        const save = C.button('Сохранить пресет', 'primary');
        editorActions.append(refresh, save);

        editor.append(
          editorHeader,
          C.field('Название пресета', name),
          C.field('Поиск категорий', categorySearch),
          categoryMeta,
          picker,
          editorActions
        );
        manager.append(header, tools, list, editor);

        presetSearch.addEventListener('input', renderPresetList);
        categorySearch.addEventListener('input', renderCategoryPicker);
        add.addEventListener('click', () => openEditor());
        cancel.addEventListener('click', closeEditor);
        refresh.addEventListener('click', () => loadCatalog(true));
        save.addEventListener('click', savePreset);
        renderPresetList();
        return manager;

        function renderPresetList() {
          const presets = Presets.filterPresets(
            settings.presets,
            presetSearch.value
          );
          list.replaceChildren();

          if (presets.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'fpat-multipost-presets__empty';
            empty.textContent = settings.presets.length
              ? 'По этому запросу пресеты не найдены.'
              : 'Пресетов пока нет. Создайте первый набор категорий.';
            list.append(empty);
            return;
          }

          for (const preset of presets) {
            const item = document.createElement('article');
            item.className = 'fpat-multipost-preset';
            const copy = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = preset.name;
            const meta = document.createElement('span');
            meta.textContent = `${preset.categories.length} категорий`;
            const preview = document.createElement('small');
            preview.textContent = preset.categories
              .slice(0, 3)
              .map((category) => category.name)
              .join(' · ');
            copy.append(title, meta, preview);

            const actions = document.createElement('div');
            actions.className = 'fpat-toolbar';
            const edit = C.button('Изменить');
            const remove = C.button('Удалить', 'danger');
            edit.addEventListener('click', () => openEditor(preset));
            remove.addEventListener('click', () => removePreset(preset));
            actions.append(edit, remove);
            item.append(copy, actions);
            list.append(item);
          }
        }

        async function openEditor(preset = null) {
          editingPresetId = preset?.id || null;
          selectedCategories = new Map(
            (preset?.categories || []).map((category) => [
              category.id,
              category
            ])
          );
          name.value = preset?.name || '';
          categorySearch.value = '';
          editorTitle.querySelector('strong').textContent = preset
            ? 'Редактирование пресета'
            : 'Новый пресет';
          editor.hidden = false;
          renderEditorSelection();
          await loadCatalog(false);
          name.focus();
        }

        function closeEditor() {
          editor.hidden = true;
          editingPresetId = null;
          selectedCategories.clear();
        }

        async function loadCatalog(forceRefresh) {
          refresh.disabled = true;
          categoryMeta.textContent = 'Загрузка категорий...';
          try {
            catalog = await context.adapters.getCategories(forceRefresh);
            catalogLoaded = true;
            renderCategoryPicker();
          } catch (error) {
            categoryMeta.textContent = error.message;
            results.replaceChildren();
          } finally {
            refresh.disabled = false;
          }
        }

        function renderCategoryPicker() {
          results.replaceChildren();
          const query = categorySearch.value
            .trim()
            .toLocaleLowerCase('ru');
          const filtered = catalog
            .filter((category) =>
              category.name.toLocaleLowerCase('ru').includes(query)
            )
            .slice(0, 80);

          categoryMeta.textContent = catalogLoaded
            ? query
              ? `Найдено: ${filtered.length}`
              : `Показано: ${filtered.length} из ${catalog.length}`
            : 'Каталог ещё не загружен.';

          for (const category of filtered) {
            const option = document.createElement('label');
            option.className = 'fpat-multipost-preset-option';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedCategories.has(category.id);
            const label = document.createElement('span');
            label.textContent = category.name;
            checkbox.addEventListener('change', () => {
              if (checkbox.checked) {
                const limit = Number(targets.value) || 20;
                if (selectedCategories.size >= limit) {
                  checkbox.checked = false;
                  context.shell.showToast(
                    `В пресете может быть не больше ${limit} категорий.`
                  );
                  return;
                }
                selectedCategories.set(category.id, category);
              } else {
                selectedCategories.delete(category.id);
              }
              renderEditorSelection();
            });
            option.append(checkbox, label);
            results.append(option);
          }
        }

        function renderEditorSelection() {
          selection.replaceChildren();
          const heading = document.createElement('div');
          heading.className = 'fpat-multipost-preset-editor__selection-title';
          heading.textContent =
            `Выбрано категорий: ${selectedCategories.size}`;
          selection.append(heading);

          if (selectedCategories.size === 0) {
            const empty = document.createElement('span');
            empty.className = 'fpat-multipost-presets__empty';
            empty.textContent = 'Выберите категории слева.';
            selection.append(empty);
            return;
          }

          for (const [id, category] of selectedCategories) {
            const item = document.createElement('div');
            item.className = 'fpat-multipost-preset-selected';
            const label = document.createElement('span');
            label.textContent = category.name;
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.textContent = '×';
            remove.setAttribute(
              'aria-label',
              `Удалить категорию ${category.name}`
            );
            remove.addEventListener('click', () => {
              selectedCategories.delete(id);
              renderEditorSelection();
              renderCategoryPicker();
            });
            item.append(label, remove);
            selection.append(item);
          }
        }

        async function savePreset() {
          const presetName = name.value.trim();
          if (!presetName) {
            context.shell.showToast('Укажите название пресета.');
            name.focus();
            return;
          }
          if (selectedCategories.size === 0) {
            context.shell.showToast('Выберите хотя бы одну категорию.');
            return;
          }

          const next = Presets.normalizePreset({
            id: editingPresetId || createPresetId(),
            name: presetName,
            categories: [...selectedCategories.values()]
          });
          const index = settings.presets.findIndex(
            (preset) => preset.id === next.id
          );
          if (index >= 0) settings.presets[index] = next;
          else settings.presets.push(next);

          await context.store.update('offers.presets', settings.presets);
          closeEditor();
          renderPresetList();
          context.shell.showToast('Пресет сохранён.');
        }

        async function removePreset(preset) {
          const confirmed = await context.shell.confirm(
            'Удалить пресет?',
            `Набор «${preset.name}» будет удалён. На уже выбранные категории это не повлияет.`,
            'Удалить'
          );
          if (!confirmed) return;
          settings.presets = settings.presets.filter(
            (item) => item.id !== preset.id
          );
          await context.store.update('offers.presets', settings.presets);
          if (editingPresetId === preset.id) closeEditor();
          renderPresetList();
        }
      }
    }

    function startCountdown() {
      const timer = window.setInterval(() => {
        if (!section.isConnected) {
          window.clearInterval(timer);
          return;
        }
        bump.renderBumpState();
      }, 15_000);
    }

    function bind(control, key, cast, afterChange = null) {
      control.addEventListener('change', async () => {
        settings[key] = cast(control.value);
        await context.store.update(`offers.${key}`, settings[key]);
        afterChange?.();
      });
    }
  };

  function withSuffix(control, suffix) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fpat-input-suffix';
    const label = document.createElement('span');
    label.textContent = suffix;
    wrapper.append(control, label);
    return wrapper;
  }

  function createPresetId() {
    return globalThis.crypto?.randomUUID?.() ||
      `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

})();

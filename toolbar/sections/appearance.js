(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const PRESET_COPY = {
    standard: ['Стандартная', 'Светлая тема FunPay без лишних изменений'],
    graphite: ['Графитовая', 'Тёплый графит и янтарный акцент'],
    night: ['Ночная', 'Холодная синяя палитра и компактные отступы'],
    custom: ['Ручная настройка', 'Нейтральная палитра с выбранными параметрами']
  };

  namespace.Sections ||= {};
  namespace.Sections.appearance = (context) => {
    let settings = context.settings.appearance;
    const section = document.createElement('section');
    section.className = 'fpat-section fpat-appearance';

    const heading = document.createElement('div');
    heading.className = 'fpat-section-heading';
    heading.append(C.sectionHeader(
      'Оформление',
      'Выберите готовую основу или настройте цвета и фон под себя.'
    ));
    const reset = C.button('Сбросить');
    reset.addEventListener('click', async () => {
      await context.store.resetSection('appearance');
      namespace.Theme.apply(context.store.getSection('appearance'));
      context.rerender();
    });
    heading.append(reset);
    section.append(heading);

    const presetCard = C.card(
      'Готовые стили',
      'Каждый стиль задаёт свою палитру, акцент, режим и плотность.'
    );
    const presetBody = document.createElement('div');
    presetBody.className = 'fpat-card__body';
    const presetGrid = document.createElement('div');
    presetGrid.className = 'fpat-theme-grid';
    [
      ['standard', 'Стандартная', 'Светлая и привычная', 'light'],
      ['graphite', 'Графитовая', 'Тёплый графит и янтарный акцент', 'graphite'],
      ['night', 'Ночная', 'Холодная синяя палитра', 'night']
    ].forEach(([id, title, description, preview]) => {
      const button = createPresetButton({
        id,
        title,
        description,
        preview,
        selected: settings.preset === id
      });
      button.addEventListener('click', async () => {
        settings = namespace.Theme.applyPreset(settings, id);
        await context.store.replaceSection('appearance', settings);
        namespace.Theme.apply(settings);
        context.rerender();
      });
      presetGrid.append(button);
    });
    presetBody.append(presetGrid);
    presetCard.append(presetBody);
    section.append(presetCard);

    const interfaceCard = C.card(
      'Ручная настройка',
      'Любое изменение ниже создаёт нейтральную пользовательскую тему.'
    );
    const interfaceBody = document.createElement('div');
    interfaceBody.className = 'fpat-card__body';
    const mode = C.select(settings.mode, [
      ['light', 'Светлый'],
      ['dark', 'Тёмный нейтральный'],
      ['system', 'Как в системе']
    ]);
    const density = createSegment(settings.density, [
      ['spacious', 'Просторная'],
      ['standard', 'Стандартная'],
      ['compact', 'Компактная']
    ], async (value) => {
      // Density is independent of the colour preset — changing it must not drop
      // the selected theme's palette (graphite/night) to the generic one.
      settings.density = value;
      await context.store.replaceSection('appearance', settings);
      namespace.Theme.apply(settings);
      context.rerender();
    });
    const palette = namespace.Theme.getPalette(settings);
    const accent = document.createElement('input');
    accent.className = 'fpat-color';
    accent.type = 'color';
    accent.value = settings.accent;
    const accentControl = document.createElement('div');
    accentControl.className = 'fpat-color-control';
    const accentValue = document.createElement('span');
    accentValue.textContent = settings.accent.toUpperCase();
    const resetAccent = C.button('Сбросить');
    resetAccent.classList.add('fpat-color-reset');
    resetAccent.addEventListener('click', async () => {
      const preset = namespace.Theme.presets[settings.preset];
      settings.accent =
        preset?.accent || namespace.Theme.presets.standard.accent;
      settings.customBg = '';
      settings.customSurface = '';
      settings.customText = '';
      await context.store.replaceSection('appearance', settings);
      namespace.Theme.apply(settings);
      context.rerender();
    });
    accentControl.append(accent, accentValue, resetAccent);
    const pageColor = createColorSetting(
      settings.customBg || palette.bg,
      'Цвет страницы'
    );
    const surfaceColor = createColorSetting(
      settings.customSurface || palette.surface,
      'Цвет панелей'
    );
    const textColor = createColorSetting(
      settings.customText || palette.text,
      'Цвет текста'
    );
    const paletteGrid = document.createElement('div');
    paletteGrid.className = 'fpat-palette-grid';
    paletteGrid.append(
      C.field('Страница', pageColor.wrapper),
      C.field('Панели', surfaceColor.wrapper),
      C.field('Текст', textColor.wrapper)
    );

    const current = document.createElement('div');
    current.className = 'fpat-current-theme';
    const currentSwatch = document.createElement('span');
    currentSwatch.style.background = settings.accent;
    const currentCopy = document.createElement('div');
    const [currentTitle, currentDescription] =
      PRESET_COPY[settings.preset] || PRESET_COPY.custom;
    currentCopy.innerHTML = '<strong></strong><span></span>';
    currentCopy.querySelector('strong').textContent = currentTitle;
    currentCopy.querySelector('span').textContent = currentDescription;
    current.append(currentSwatch, currentCopy);

    const interfacePair = document.createElement('div');
    interfacePair.className = 'fpat-grid fpat-grid--2';
    interfacePair.append(
      C.field('Базовый режим', mode, 'Отдельно от готовых стилей'),
      C.field(
        'Плотность',
        density,
        'Центр управления, попап и плотность строк на страницах FunPay (списки, заказы, панель продавца, чаты).'
      )
    );
    interfaceBody.append(
      current,
      interfacePair,
      C.field(
        'Акцентный цвет',
        accentControl,
        'Акцент центра управления и активных элементов страницы (кнопки, ссылки, переключатели). «Сбросить» возвращает акцент и цвета палитры.'
      ),
      paletteGrid
    );
    interfaceCard.append(interfaceBody);

    const backgroundCard = C.card(
      'Фон страницы',
      'Можно использовать ссылку или загрузить изображение с компьютера.'
    );
    const backgroundBody = document.createElement('div');
    backgroundBody.className = 'fpat-card__body';
    const background = C.text(
      settings.backgroundUrl,
      'https://example.com/background.jpg'
    );
    const backgroundFile = document.createElement('input');
    backgroundFile.type = 'file';
    backgroundFile.accept = 'image/png,image/jpeg,image/webp';
    backgroundFile.hidden = true;
    const upload = document.createElement('button');
    upload.type = 'button';
    upload.className = 'fpat-upload';
    upload.innerHTML = `
      <span class="fpat-upload__icon" aria-hidden="true">↑</span>
      <span>
        <strong>Загрузить изображение</strong>
        <small>PNG, JPEG или WebP до 2 МБ</small>
      </span>
    `;
    upload.addEventListener('click', () => backgroundFile.click());
    const overlay = C.number(settings.backgroundOverlay, { min: 0, max: 80 });
    const blur = C.number(settings.backgroundBlur, { min: 0, max: 20 });
    const fit = C.select(settings.backgroundFit, [
      ['cover', 'Заполнить экран'],
      ['contain', 'Показать целиком'],
      ['auto', 'Исходный размер']
    ]);
    const position = C.select(settings.backgroundPosition, [
      ['center', 'По центру'],
      ['top', 'Сверху'],
      ['bottom', 'Снизу'],
      ['left', 'Слева'],
      ['right', 'Справа']
    ]);
    const backgroundPair = document.createElement('div');
    backgroundPair.className = 'fpat-grid fpat-grid--2';
    backgroundPair.append(
      C.field('Затемнение, %', overlay),
      C.field('Размытие, px', blur)
    );
    const backgroundLayout = document.createElement('div');
    backgroundLayout.className = 'fpat-grid fpat-grid--2';
    backgroundLayout.append(
      C.field('Масштаб', fit),
      C.field('Положение', position)
    );
    const clearBackground = C.button('Убрать фон');
    clearBackground.classList.add('fpat-background-clear');
    clearBackground.disabled = !settings.backgroundUrl;
    clearBackground.addEventListener('click', async () => {
      settings.backgroundUrl = '';
      settings.preset = 'custom';
      await context.store.replaceSection('appearance', settings);
      namespace.Theme.apply(settings);
      context.rerender();
    });
    const backgroundPreview = document.createElement('div');
    backgroundPreview.className = 'fpat-background-preview';
    backgroundPreview.classList.toggle('is-empty', !settings.backgroundUrl);
    if (settings.backgroundUrl) {
      backgroundPreview.style.backgroundImage = `url("${settings.backgroundUrl}")`;
      backgroundPreview.style.backgroundSize = settings.backgroundFit;
      backgroundPreview.style.backgroundPosition = settings.backgroundPosition;
    }
    backgroundPreview.innerHTML = `
      <span>${settings.backgroundUrl ? 'Предпросмотр фона' : 'Фон не выбран'}</span>
    `;
    backgroundBody.append(
      backgroundPreview,
      C.field('Ссылка на изображение', background),
      upload,
      backgroundFile,
      backgroundLayout,
      backgroundPair,
      clearBackground
    );
    backgroundCard.append(backgroundBody);
    section.append(interfaceCard, backgroundCard);

    const savedThemesCard = C.card(
      'Мои стили',
      'Сохраните текущую палитру, фон и плотность, чтобы переключаться между ними одним нажатием.'
    );
    const savedThemesBody = document.createElement('div');
    savedThemesBody.className = 'fpat-card__body';
    const savedThemeToolbar = document.createElement('div');
    savedThemeToolbar.className = 'fpat-saved-theme-toolbar';
    const savedThemeName = C.text('', 'Например, Рабочая тёмная');
    savedThemeName.maxLength = 50;
    const saveTheme = C.button('Сохранить текущий стиль', 'primary');
    savedThemeToolbar.append(savedThemeName, saveTheme);
    const savedThemeList = document.createElement('div');
    savedThemeList.className = 'fpat-saved-theme-list';
    savedThemesBody.append(savedThemeToolbar, savedThemeList);
    savedThemesCard.append(savedThemesBody);
    section.append(savedThemesCard);
    renderSavedThemes();

    bind(mode, 'mode', String);
    bind(background, 'backgroundUrl', String);
    bind(overlay, 'backgroundOverlay', Number);
    bind(blur, 'backgroundBlur', Number);
    bind(fit, 'backgroundFit', String);
    bind(position, 'backgroundPosition', String);
    accent.addEventListener('input', () => {
      accentValue.textContent = accent.value.toUpperCase();
      currentSwatch.style.background = accent.value;
    });
    bind(accent, 'accent', String);
    bindColor(pageColor, 'customBg');
    bindColor(surfaceColor, 'customSurface');
    bindColor(textColor, 'customText');

    saveTheme.addEventListener('click', async () => {
      const name = savedThemeName.value.trim();
      if (!name) {
        context.shell.showToast('Введите название стиля.');
        savedThemeName.focus();
        return;
      }
      if (settings.savedThemes.length >= 8) {
        context.shell.showToast('Можно сохранить не больше 8 пользовательских стилей.');
        return;
      }
      const savedTheme = {
        id: `theme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        settings: snapshotAppearance(settings)
      };
      settings.savedThemes = [...settings.savedThemes, savedTheme];
      try {
        await context.store.replaceSection('appearance', settings);
      } catch {
        settings.savedThemes = settings.savedThemes.filter(
          (theme) => theme.id !== savedTheme.id
        );
        context.shell.showToast(
          'Не удалось сохранить стиль. Загруженный фон занимает слишком много места.'
        );
        return;
      }
      context.rerender();
    });

    backgroundFile.addEventListener('change', async () => {
      const file = backgroundFile.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        context.shell.showToast('Изображение должно быть меньше 2 МБ.');
        backgroundFile.value = '';
        return;
      }
      settings.backgroundUrl = await readAsDataUrl(file);
      settings.preset = 'custom';
      await context.store.replaceSection('appearance', settings);
      namespace.Theme.apply(settings);
      context.rerender();
    });
    return section;

    function bind(control, key, cast) {
      control.addEventListener('change', async () => {
        settings[key] = cast(control.value);
        settings.preset = 'custom';
        await context.store.replaceSection('appearance', settings);
        namespace.Theme.apply(settings);
        context.rerender();
      });
    }

    function bindColor(control, key) {
      control.input.addEventListener('input', () => {
        control.value.textContent = control.input.value.toUpperCase();
      });
      control.input.addEventListener('change', async () => {
        settings[key] = control.input.value;
        settings.preset = 'custom';
        await context.store.replaceSection('appearance', settings);
        namespace.Theme.apply(settings);
        context.rerender();
      });
    }

    function renderSavedThemes() {
      savedThemeList.replaceChildren();
      if (settings.savedThemes.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'fpat-saved-theme-empty';
        empty.textContent =
          'Пользовательских стилей пока нет. Настройте оформление и сохраните его здесь.';
        savedThemeList.append(empty);
        return;
      }

      for (const theme of settings.savedThemes) {
        const item = document.createElement('article');
        item.className = 'fpat-saved-theme';
        const swatches = document.createElement('span');
        swatches.className = 'fpat-saved-theme__swatches';
        const themePalette = namespace.Theme.getPalette(theme.settings);
        [themePalette.bg, themePalette.surface, theme.settings.accent].forEach(
          (color) => {
            const swatch = document.createElement('i');
            swatch.style.background = color;
            swatches.append(swatch);
          }
        );
        const copy = document.createElement('div');
        copy.innerHTML = '<strong></strong><span></span>';
        copy.querySelector('strong').textContent = theme.name;
        copy.querySelector('span').textContent = [
          theme.settings.mode === 'dark' ? 'Тёмный' : 'Светлый',
          theme.settings.backgroundUrl ? 'с фоном' : 'без фона'
        ].join(' · ');
        const actions = document.createElement('div');
        actions.className = 'fpat-saved-theme__actions';
        const apply = C.button('Применить');
        const remove = C.button('Удалить', 'danger');
        apply.addEventListener('click', async () => {
          const savedThemes = settings.savedThemes;
          settings = {
            ...theme.settings,
            preset: 'custom',
            savedThemes
          };
          await context.store.replaceSection('appearance', settings);
          namespace.Theme.apply(settings);
          context.rerender();
        });
        remove.addEventListener('click', async () => {
          const confirmed = await context.shell.confirm(
            'Удалить пользовательский стиль?',
            `Стиль «${theme.name}» исчезнет из списка. Текущее оформление страницы не изменится.`
          );
          if (!confirmed) return;
          settings.savedThemes = settings.savedThemes.filter(
            (item) => item.id !== theme.id
          );
          await context.store.replaceSection('appearance', settings);
          context.rerender();
        });
        actions.append(apply, remove);
        item.append(swatches, copy, actions);
        savedThemeList.append(item);
      }
    }
  };

  function createPresetButton({
    id,
    title,
    description,
    preview,
    selected
  }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `fpat-theme-option${selected ? ' is-selected' : ''}`;
    button.dataset.preset = id;
    button.innerHTML = `
      <span class="fpat-theme-preview fpat-theme-preview--${preview}">
        <i class="fpat-theme-preview__sidebar"></i>
        <i class="fpat-theme-preview__header"></i>
        <i class="fpat-theme-preview__card fpat-theme-preview__card--one"></i>
        <i class="fpat-theme-preview__card fpat-theme-preview__card--two"></i>
        <i class="fpat-theme-preview__accent"></i>
      </span>
      <span class="fpat-theme-option__copy">
        <strong>${title}</strong>
        <span>${description}</span>
      </span>
      <span class="fpat-theme-option__check" aria-hidden="true">✓</span>
    `;
    return button;
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result || '')));
      reader.addEventListener('error', () => reject(reader.error));
      reader.readAsDataURL(file);
    });
  }

  function createSegment(value, options, onChange) {
    const group = document.createElement('div');
    group.className = 'fpat-segment';
    group.setAttribute('role', 'group');
    const buttons = options.map(([optionValue, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.value = optionValue;
      button.textContent = label;
      button.setAttribute('aria-pressed', String(optionValue === value));
      button.addEventListener('click', () => {
        if (button.getAttribute('aria-pressed') === 'true') return;
        buttons.forEach((other) =>
          other.setAttribute('aria-pressed', String(other === button))
        );
        onChange(optionValue);
      });
      group.append(button);
      return button;
    });
    return group;
  }

  function createColorSetting(value, label) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fpat-mini-color';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = value;
    input.setAttribute('aria-label', label);
    const text = document.createElement('span');
    text.textContent = value.toUpperCase();
    wrapper.append(input, text);
    return { wrapper, input, value: text };
  }

  function snapshotAppearance(settings) {
    const {
      savedThemes: _savedThemes,
      ...snapshot
    } = settings;
    return structuredClone(snapshot);
  }
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const VARIABLES = [
    ['{buyername}', 'Имя покупателя'],
    ['{offername}', 'Название товара'],
    ['{time}', 'Текущее время'],
    ['{date}', 'Текущая дата']
  ];

  namespace.Sections ||= {};
  namespace.Sections.messages = (context) => {
    const settings = context.settings.messages;
    const section = document.createElement('section');
    section.className = 'fpat-section fpat-messages';
    section.append(C.sectionHeader(
      'Сообщения',
      'Подготовьте приветствие и библиотеку быстрых ответов для общения с покупателями.'
    ));

    const greeting = createGreetingPanel();
    const templates = createTemplateLibrary();
    section.append(greeting, templates);
    return section;

    function createGreetingPanel() {
      const panel = document.createElement('section');
      panel.className = 'fpat-message-greeting';

      const hero = document.createElement('div');
      hero.className = 'fpat-message-greeting__hero';
      const heroCopy = document.createElement('div');
      heroCopy.className = 'fpat-message-greeting__copy';
      heroCopy.innerHTML = `
        <span class="fpat-message-eyebrow">Сценарий нового диалога</span>
        <h3></h3>
        <p>Приветствие работает в штатном чате FunPay: его можно подготовить в поле ввода или отправить автоматически.</p>
      `;
      const enabled = C.checkbox(
        'Использовать приветствие',
        settings.greetingEnabled
      );
      enabled.wrapper.classList.add('fpat-message-greeting__master');
      hero.append(heroCopy, enabled.wrapper);

      const workspace = document.createElement('div');
      workspace.className = 'fpat-message-greeting__workspace';

      const composer = document.createElement('div');
      composer.className = 'fpat-message-composer';
      const composerHeader = document.createElement('div');
      composerHeader.className = 'fpat-message-block-heading';
      composerHeader.innerHTML = `
        <div>
          <strong>Текст приветствия</strong>
          <span>Переменные подставятся перед отправкой.</span>
        </div>
        <small data-message-length></small>
      `;
      const text = C.textarea(settings.greetingText);
      text.placeholder = 'Напишите короткое приветствие для покупателя';
      text.classList.add('fpat-message-composer__input');
      const variableBar = createVariableBar(text);
      const preview = createMessagePreview();
      composer.append(composerHeader, text, variableBar, preview);

      const rules = document.createElement('aside');
      rules.className = 'fpat-message-rules';
      const rulesHeader = document.createElement('div');
      rulesHeader.className = 'fpat-message-block-heading';
      rulesHeader.innerHTML = `
        <div>
          <strong>Условия сценария</strong>
          <span>Правила применяются прямо на страницах чата и заказа.</span>
        </div>
      `;
      const manager = C.checkbox(
        'Показывать быстрые ответы в чате',
        settings.managerEnabled
      );
      manager.wrapper.classList.add('fpat-message-rule');
      const onlyNew = C.checkbox(
        'Только для новых диалогов',
        settings.onlyNewChats
      );
      onlyNew.wrapper.classList.add('fpat-message-rule');
      const onlyNewHint = document.createElement('span');
      onlyNewHint.className = 'fpat-message-rule__hint';
      onlyNewHint.textContent =
        'Существующие переписки не будут получать приветствие повторно.';
      onlyNew.wrapper.querySelector('.fpat-switch-row__copy')?.append(onlyNewHint);

      const delay = C.number(settings.greetingDelaySeconds, {
        min: 0,
        max: 300
      });
      const delayField = C.field(
        'Задержка перед действием',
        withSuffix(delay, 'сек.'),
        'Отсчёт отменяется, если вы сменили диалог или уже начали печатать.'
      );
      delayField.classList.add('fpat-message-delay');
      const greetingAction = C.select(settings.greetingAction, [
        ['insert', 'Подготовить в поле ввода'],
        ['send', 'Отправить автоматически']
      ]);
      const actionField = C.field(
        'Что делать с приветствием',
        greetingAction,
        'Автоотправка использует обычную форму FunPay и включается только явно.'
      );
      actionField.classList.add('fpat-message-delay');

      const localNote = document.createElement('div');
      localNote.className = 'fpat-message-local-note';
      localNote.innerHTML = `
        <span aria-hidden="true">${messageIcon('lock')}</span>
        <div>
          <strong>Данные остаются в расширении</strong>
          <p>Шаблоны не отправляются на сторонние серверы. Для сообщений используется только штатная форма FunPay.</p>
        </div>
      `;
      rules.append(
        rulesHeader,
        manager.wrapper,
        onlyNew.wrapper,
        delayField,
        actionField,
        localNote
      );
      workspace.append(composer, rules);
      panel.append(hero, workspace);

      enabled.input.addEventListener('change', async () => {
        settings.greetingEnabled = enabled.input.checked;
        await context.store.update(
          'messages.greetingEnabled',
          enabled.input.checked
        );
        renderGreetingState();
      });
      manager.input.addEventListener('change', async () => {
        settings.managerEnabled = manager.input.checked;
        await context.store.update(
          'messages.managerEnabled',
          manager.input.checked
        );
      });
      onlyNew.input.addEventListener('change', async () => {
        settings.onlyNewChats = onlyNew.input.checked;
        await context.store.update(
          'messages.onlyNewChats',
          onlyNew.input.checked
        );
      });
      delay.addEventListener('change', async () => {
        settings.greetingDelaySeconds = Number(delay.value);
        await context.store.update(
          'messages.greetingDelaySeconds',
          settings.greetingDelaySeconds
        );
      });
      greetingAction.addEventListener('change', async () => {
        settings.greetingAction = greetingAction.value;
        await context.store.update(
          'messages.greetingAction',
          greetingAction.value
        );
      });
      text.addEventListener('input', renderGreetingText);
      text.addEventListener('change', async () => {
        settings.greetingText = text.value;
        await context.store.update('messages.greetingText', text.value);
      });

      renderGreetingState();
      renderGreetingText();
      return panel;

      function renderGreetingState() {
        panel.classList.toggle('is-enabled', enabled.input.checked);
        heroCopy.querySelector('h3').textContent = enabled.input.checked
          ? 'Приветствие настроено'
          : 'Приветствие выключено';
      }

      function renderGreetingText() {
        composerHeader.querySelector('[data-message-length]').textContent =
          `${text.value.length} симв.`;
        preview.querySelector('.fpat-message-preview__bubble').textContent =
          renderPreviewText(text.value);
      }
    }

    function createTemplateLibrary() {
      let searchQuery = '';
      let draggedId = null;
      const card = document.createElement('section');
      card.className = 'fpat-message-library';

      const header = document.createElement('div');
      header.className = 'fpat-message-library__header';
      const headerCopy = document.createElement('div');
      headerCopy.innerHTML = `
        <span class="fpat-message-eyebrow">Библиотека ответов</span>
        <h3>Шаблоны сообщений</h3>
        <p>Перетаскивайте карточки, чтобы задать порядок. Первые три закреплённых (★) показываются в быстрых ответах чата.</p>
      `;
      const add = C.button('Новый шаблон', 'primary');
      header.append(headerCopy, add);

      const tools = document.createElement('div');
      tools.className = 'fpat-message-library__tools';
      const search = C.text('', 'Найти шаблон');
      search.type = 'search';
      const templateAction = C.select(settings.templateAction, [
        ['insert', 'Вставлять в поле'],
        ['send', 'Отправлять сразу']
      ]);
      templateAction.title = 'Действие при выборе шаблона в чате';
      const count = document.createElement('span');
      tools.append(search, templateAction, count);

      const list = document.createElement('div');
      list.className = 'fpat-message-template-grid';
      const editor = createEditor();
      card.append(header, tools, list, editor);

      add.addEventListener('click', () => showEditor());
      search.addEventListener('input', () => {
        searchQuery = search.value;
        renderList();
      });
      templateAction.addEventListener('change', async () => {
        settings.templateAction = templateAction.value;
        await context.store.update(
          'messages.templateAction',
          templateAction.value
        );
        context.shell.showToast(
          templateAction.value === 'send'
            ? 'Шаблоны будут отправляться сразу.'
            : 'Шаблоны будут вставляться в поле сообщения.'
        );
      });
      renderList();
      return card;

      function renderList() {
        const query = searchQuery.trim().toLocaleLowerCase('ru');
        const filtered = settings.templates.filter((template) =>
          `${template.name} ${template.text}`
            .toLocaleLowerCase('ru')
            .includes(query)
        );
        list.replaceChildren();
        count.textContent = query
          ? `Найдено: ${filtered.length}`
          : `${settings.templates.length} шабл.`;

        if (filtered.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'fpat-message-template-empty';
          empty.innerHTML = settings.templates.length
            ? '<strong>Ничего не найдено</strong><span>Попробуйте изменить поисковый запрос.</span>'
            : '<strong>Шаблонов пока нет</strong><span>Создайте первый готовый ответ для покупателей.</span>';
          list.append(empty);
          return;
        }

        // Drag-to-reorder only makes sense over the full, unfiltered list.
        const canReorder = !query && settings.templates.length > 1;

        for (const template of filtered) {
          const item = document.createElement('article');
          item.className = `fpat-message-template${template.pinned ? ' is-pinned' : ''}`;
          if (canReorder) attachDragHandlers(item, template);
          const top = document.createElement('div');
          top.className = 'fpat-message-template__top';
          const title = document.createElement('div');
          const name = document.createElement('strong');
          name.textContent = template.name;
          const meta = document.createElement('span');
          meta.textContent = template.pinned
            ? `★ В быстрых ответах · ${template.text.length} симв.`
            : `${template.text.length} символов`;
          title.append(name, meta);
          const pin = document.createElement('button');
          pin.type = 'button';
          pin.className = `fpat-message-template__pin${template.pinned ? ' is-pinned' : ''}`;
          pin.title = template.pinned
            ? 'Убрать из быстрых ответов'
            : 'Закрепить в быстрые ответы (до 3)';
          pin.setAttribute('aria-pressed', String(Boolean(template.pinned)));
          pin.innerHTML = messageIcon('star');
          pin.addEventListener('click', () => togglePin(template));
          top.append(title, pin);

          const preview = document.createElement('p');
          preview.textContent = template.text || 'Пустой шаблон';
          const controls = document.createElement('div');
          controls.className = 'fpat-message-template__actions';
          const edit = C.button('Изменить');
          const remove = C.button('Удалить', 'danger');
          edit.addEventListener('click', () => showEditor(template));
          remove.addEventListener('click', () => removeTemplate(template));
          controls.append(edit, remove);
          item.append(top, preview, controls);
          list.append(item);
        }
      }

      function attachDragHandlers(item, template) {
        item.draggable = true;
        item.classList.add('is-draggable');
        item.addEventListener('dragstart', (event) => {
          draggedId = template.id;
          item.classList.add('is-dragging');
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', template.id);
        });
        item.addEventListener('dragend', () => {
          draggedId = null;
          item.classList.remove('is-dragging');
          clearDropTargets();
        });
        item.addEventListener('dragover', (event) => {
          if (!draggedId || draggedId === template.id) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          clearDropTargets();
          item.classList.add('is-drop-target');
        });
        item.addEventListener('dragleave', () => {
          item.classList.remove('is-drop-target');
        });
        item.addEventListener('drop', (event) => {
          event.preventDefault();
          item.classList.remove('is-drop-target');
          void reorderTemplates(draggedId, template.id);
        });
      }

      function clearDropTargets() {
        list
          .querySelectorAll('.is-drop-target')
          .forEach((node) => node.classList.remove('is-drop-target'));
      }

      async function reorderTemplates(fromId, toId) {
        if (!fromId || fromId === toId) return;
        const fromIndex = settings.templates.findIndex((item) => item.id === fromId);
        const toIndex = settings.templates.findIndex((item) => item.id === toId);
        if (fromIndex < 0 || toIndex < 0) return;
        const [moved] = settings.templates.splice(fromIndex, 1);
        settings.templates.splice(toIndex, 0, moved);
        await context.store.update('messages.templates', settings.templates);
        renderList();
      }

      function createEditor() {
        const node = document.createElement('div');
        node.className = 'fpat-message-editor';
        node.hidden = true;

        const editorHeader = document.createElement('div');
        editorHeader.className = 'fpat-message-editor__header';
        editorHeader.innerHTML = `
          <div>
            <span class="fpat-message-eyebrow">Редактор шаблона</span>
            <h4 data-editor-title>Новый шаблон</h4>
            <p>После сохранения шаблон сразу появится в панели над полем чата.</p>
          </div>
        `;
        const close = C.button('Закрыть');
        editorHeader.append(close);

        const workspace = document.createElement('div');
        workspace.className = 'fpat-message-editor__workspace';
        const fields = document.createElement('div');
        fields.className = 'fpat-message-editor__fields';
        const name = C.text('', 'Например, Инструкция после оплаты');
        const value = C.textarea('', 'Текст сообщения');
        value.classList.add('fpat-message-editor__textarea');
        const nameField = C.field('Название', name);
        const valueField = C.field('Сообщение', value);
        nameField.classList.add('fpat-message-editor__field');
        valueField.classList.add('fpat-message-editor__field');
        const variables = createVariableBar(value);
        fields.append(nameField, valueField, variables);

        const preview = createMessagePreview('Предпросмотр');
        preview.classList.add('fpat-message-editor__preview');
        workspace.append(fields, preview);

        const footer = document.createElement('div');
        footer.className = 'fpat-message-editor__footer';
        const cancel = C.button('Отмена');
        const save = C.button('Сохранить шаблон', 'primary');
        footer.append(cancel, save);
        node.append(editorHeader, workspace, footer);

        node._name = name;
        node._value = value;
        node._save = save;
        node._title = editorHeader.querySelector('[data-editor-title]');
        node._preview = preview.querySelector('.fpat-message-preview__bubble');
        value.addEventListener('input', () => {
          node._preview.textContent = renderPreviewText(value.value);
        });
        close.addEventListener('click', hideEditor);
        cancel.addEventListener('click', hideEditor);
        return node;

        function hideEditor() {
          node.hidden = true;
        }
      }

      function showEditor(template = null) {
        editor.hidden = false;
        editor._title.textContent = template
          ? 'Редактирование шаблона'
          : 'Новый шаблон';
        editor._name.value = template?.name || '';
        editor._value.value = template?.text || '';
        editor._preview.textContent = renderPreviewText(editor._value.value);
        editor._save.onclick = async () => {
          const next = {
            id: template?.id || createTemplateId(),
            name: editor._name.value.trim() || 'Новый шаблон',
            text: editor._value.value.trim(),
            pinned: Boolean(template?.pinned)
          };
          const index = settings.templates.findIndex(
            (item) => item.id === next.id
          );
          if (index >= 0) settings.templates[index] = next;
          else settings.templates.push(next);
          await context.store.update('messages.templates', settings.templates);
          editor.hidden = true;
          renderList();
          context.shell.showToast('Шаблон сохранён.');
        };
        editor._name.focus();
      }

      async function togglePin(template) {
        template.pinned = !template.pinned;
        await context.store.update('messages.templates', settings.templates);
        renderList();
        context.shell.showToast(
          template.pinned ? 'Шаблон закреплён вверху.' : 'Шаблон откреплён.'
        );
      }

      async function removeTemplate(template) {
        const confirmed = await context.shell.confirm(
          'Удалить шаблон?',
          `Шаблон «${template.name}» будет удалён без возможности восстановления.`,
          'Удалить'
        );
        if (!confirmed) return;
        settings.templates = settings.templates.filter(
          (item) => item.id !== template.id
        );
        await context.store.update('messages.templates', settings.templates);
        renderList();
      }
    }
  };

  function createVariableBar(control) {
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
      button.addEventListener('click', () => insertAtCursor(control, token));
      bar.append(button);
    }
    return bar;
  }

  function createMessagePreview(label = 'Как увидит покупатель') {
    const preview = document.createElement('div');
    preview.className = 'fpat-message-preview';
    const heading = document.createElement('span');
    heading.className = 'fpat-message-preview__label';
    heading.textContent = label;
    const chat = document.createElement('div');
    chat.className = 'fpat-message-preview__chat';
    const avatar = document.createElement('span');
    avatar.className = 'fpat-message-preview__avatar';
    avatar.textContent = 'F';
    const bubble = document.createElement('div');
    bubble.className = 'fpat-message-preview__bubble';
    chat.append(avatar, bubble);
    preview.append(heading, chat);
    return preview;
  }

  function insertAtCursor(control, value) {
    const start = control.selectionStart ?? control.value.length;
    const end = control.selectionEnd ?? start;
    control.value =
      control.value.slice(0, start) + value + control.value.slice(end);
    const cursor = start + value.length;
    control.focus();
    control.setSelectionRange?.(cursor, cursor);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderPreviewText(value) {
    const text = String(value || '').trim();
    if (!text) return 'Здесь появится предпросмотр сообщения.';
    return text
      .replaceAll('{buyername}', 'Алексей')
      .replaceAll('{offername}', 'ваш товар')
      .replaceAll('{time}', '14:30')
      .replaceAll('{date}', '9 июня');
  }

  function withSuffix(control, suffix) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fpat-input-suffix';
    const label = document.createElement('span');
    label.textContent = suffix;
    wrapper.append(control, label);
    return wrapper;
  }

  function createTemplateId() {
    return globalThis.crypto?.randomUUID?.() ||
      `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function messageIcon(name) {
    const paths = {
      lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/>',
      message: '<path d="M5 5h14v10H9l-4 4zM8 9h8M8 12h5"/>',
      star: '<path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8z"/>'
    };
    return `<svg viewBox="0 0 24 24">${paths[name] || paths.message}</svg>`;
  }
})();

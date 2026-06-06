const MULTIPOST_DELAY_MS = 700;
const MAX_VISIBLE_CATEGORIES = 120;
const MAX_MULTIPOST_TARGETS = 20;

const form =
  document.querySelector('form.js-lot-form') ||
  document.querySelector('form[action*="offerSave"]');

if (form) {
  injectMultiPostPanel(form);
}

function injectMultiPostPanel(targetForm) {
  if (document.getElementById('fp-automation-panel')) return;

  const panel = document.createElement('section');
  panel.id = 'fp-automation-panel';
  panel.className = 'fp-panel';
  panel.setAttribute('aria-labelledby', 'fp-panel-title');
  panel.innerHTML = `
    <div class="fp-panel__header">
      <div>
        <div class="fp-panel__eyebrow">FunPay Automation Tool</div>
        <h2 id="fp-panel-title" class="fp-panel__title">Дополнительные категории</h2>
        <p class="fp-panel__description">
          При сохранении расширение последовательно создаст копии в выбранных категориях,
          а затем сохранит текущее объявление.
        </p>
      </div>
      <button class="fp-icon-button" type="button" id="fp-refresh-categories" title="Обновить категории">
        Обновить
      </button>
    </div>

    <div class="fp-panel__body">
      <div class="fp-picker">
        <label class="fp-field-label" for="fp-category-search">Найти категорию</label>
        <input
          class="fp-search"
          id="fp-category-search"
          type="search"
          autocomplete="off"
          placeholder="Название игры или услуги"
        >
        <div class="fp-list-meta" id="fp-category-meta">Загрузка категорий...</div>
        <div class="fp-category-list" id="fp-category-list" role="list"></div>
      </div>

      <div class="fp-selection">
        <div class="fp-selection__header">
          <span class="fp-field-label">Будут созданы копии</span>
          <span class="fp-counter" id="fp-selected-count">0</span>
        </div>
        <div class="fp-selected-list" id="fp-selected-list"></div>
      </div>
    </div>

    <div class="fp-progress" id="fp-progress" hidden>
      <div class="fp-progress__track">
        <div class="fp-progress__bar" id="fp-progress-bar"></div>
      </div>
      <div class="fp-progress__text" id="fp-progress-text"></div>
    </div>

    <div class="fp-notice" id="fp-notice" role="status" aria-live="polite"></div>
  `;

  const submitButton = targetForm.querySelector(
    'button[type="submit"], input[type="submit"], .btn-primary'
  );

  if (submitButton?.parentNode) {
    submitButton.parentNode.insertBefore(panel, submitButton);
  } else {
    targetForm.appendChild(panel);
  }

  const categoryList = panel.querySelector('#fp-category-list');
  const categoryMeta = panel.querySelector('#fp-category-meta');
  const searchInput = panel.querySelector('#fp-category-search');
  const selectedList = panel.querySelector('#fp-selected-list');
  const selectedCount = panel.querySelector('#fp-selected-count');
  const refreshButton = panel.querySelector('#fp-refresh-categories');
  const progress = panel.querySelector('#fp-progress');
  const progressBar = panel.querySelector('#fp-progress-bar');
  const progressText = panel.querySelector('#fp-progress-text');
  const notice = panel.querySelector('#fp-notice');

  const selectedCategories = new Map();
  let categories = [];
  let multiPostRunning = false;
  let allowNativeSubmit = false;

  loadCategories(false);

  searchInput.addEventListener('input', renderCategories);
  refreshButton.addEventListener('click', () => loadCategories(true));

  targetForm.addEventListener(
    'submit',
    async (event) => {
      if (allowNativeSubmit || selectedCategories.size === 0) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (multiPostRunning) return;
      multiPostRunning = true;

      const submitter = event.submitter || submitButton;
      setSubmitDisabled(submitter, true);
      setPanelBusy(true);
      showNotice('', '');

      const targets = [...selectedCategories.entries()].map(([nodeId, name]) => ({
        nodeId,
        name
      }));
      const startedAt = Date.now();
      const results = [];

      progress.hidden = false;
      updateProgress(0, targets.length, 'Подготовка очереди...');

      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        updateProgress(index, targets.length, `Публикация: ${target.name}`);

        try {
          const result = await submitCopy(targetForm, target);
          results.push(result);
        } catch (error) {
          results.push({
            nodeId: target.nodeId,
            name: target.name,
            status: 'failed',
            message: error.message
          });
        }

        updateProgress(index + 1, targets.length, `Обработано ${index + 1} из ${targets.length}`);

        if (index < targets.length - 1) {
          await delay(MULTIPOST_DELAY_MS);
        }
      }

      const summary = createMultiPostSummary(startedAt, results);
      await chrome.storage.local.set({ lastMultiPostResult: summary });

      if (summary.failedCount === 0) {
        showNotice(`Создано копий: ${summary.successCount}. Сохраняем объявление...`, 'success');
      } else {
        showNotice(
          `Создано: ${summary.successCount}, ошибок: ${summary.failedCount}. Сохраняем исходное объявление...`,
          'warning'
        );
      }

      await delay(700);
      allowNativeSubmit = true;
      setSubmitDisabled(submitter, false);

      if (typeof targetForm.requestSubmit === 'function') {
        targetForm.requestSubmit(isSubmitControl(submitter) ? submitter : undefined);
      } else {
        HTMLFormElement.prototype.submit.call(targetForm);
      }

      allowNativeSubmit = false;
      multiPostRunning = false;
      setPanelBusy(false);
      selectedCategories.clear();
      renderSelection();
      renderCategories();
      progress.hidden = true;
    },
    true
  );

  async function loadCategories(forceRefresh) {
    categoryList.replaceChildren();
    categoryMeta.textContent = 'Загрузка категорий...';
    refreshButton.disabled = true;

    try {
      const response = await sendRuntimeMessage({
        action: 'getCategories',
        forceRefresh
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Не удалось загрузить категории.');
      }

      categories = response.categories.filter(
        (category) => category.id !== getCurrentNodeId(targetForm)
      );
      renderCategories();
    } catch (error) {
      categoryMeta.textContent = error.message;
      showNotice(error.message, 'error');
    } finally {
      refreshButton.disabled = false;
    }
  }

  function renderCategories() {
    const query = searchInput.value.trim().toLocaleLowerCase('ru');
    const filtered = categories
      .filter((category) => category.name.toLocaleLowerCase('ru').includes(query))
      .slice(0, MAX_VISIBLE_CATEGORIES);

    categoryList.replaceChildren();
    categoryMeta.textContent = query
      ? `Найдено: ${filtered.length}`
      : `Показано: ${filtered.length} из ${categories.length}`;

    if (filtered.length === 0) {
      categoryList.appendChild(createEmptyState('Ничего не найдено'));
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const category of filtered) {
      const label = document.createElement('label');
      label.className = 'fp-category';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'fp-category__checkbox';
      checkbox.checked = selectedCategories.has(category.id);

      const name = document.createElement('span');
      name.className = 'fp-category__name';
      name.textContent = category.name;

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          if (selectedCategories.size >= MAX_MULTIPOST_TARGETS) {
            checkbox.checked = false;
            showNotice(
              `За один запуск можно выбрать не больше ${MAX_MULTIPOST_TARGETS} категорий.`,
              'warning'
            );
            return;
          }

          selectedCategories.set(category.id, category.name);
        } else {
          selectedCategories.delete(category.id);
        }
        renderSelection();
      });

      label.append(checkbox, name);
      fragment.appendChild(label);
    }

    categoryList.appendChild(fragment);
  }

  function renderSelection() {
    selectedList.replaceChildren();
    selectedCount.textContent = String(selectedCategories.size);

    if (selectedCategories.size === 0) {
      selectedList.appendChild(
        createEmptyState('Выберите категории слева. Обычное сохранение останется без изменений.')
      );
      return;
    }

    for (const [id, name] of selectedCategories) {
      const item = document.createElement('div');
      item.className = 'fp-selected';

      const label = document.createElement('span');
      label.className = 'fp-selected__name';
      label.textContent = name;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'fp-selected__remove';
      remove.textContent = 'Удалить';
      remove.setAttribute('aria-label', `Удалить категорию ${name}`);
      remove.addEventListener('click', () => {
        selectedCategories.delete(id);
        renderSelection();
        renderCategories();
      });

      item.append(label, remove);
      selectedList.appendChild(item);
    }
  }

  function updateProgress(current, total, text) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    progressBar.style.width = `${percent}%`;
    progressText.textContent = text;
  }

  function setPanelBusy(busy) {
    panel.classList.toggle('is-busy', busy);
    searchInput.disabled = busy;
    refreshButton.disabled = busy;
    categoryList.querySelectorAll('input').forEach((input) => {
      input.disabled = busy;
    });
    selectedList.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
  }

  function showNotice(message, type) {
    notice.textContent = message;
    notice.className = 'fp-notice';
    if (type) notice.classList.add(`fp-notice--${type}`);
  }

  renderSelection();
}

async function submitCopy(targetForm, target) {
  const formData = new FormData(targetForm);
  formData.set('node_id', target.nodeId);

  let response;

  try {
    response = await fetch(new URL(targetForm.action || '/lots/offerSave', location.origin), {
      method: (targetForm.method || 'POST').toUpperCase(),
      body: formData,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'x-requested-with': 'XMLHttpRequest'
      }
    });
  } catch {
    throw new Error('Нет соединения с FunPay');
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (isLoginResponse(response.url, text)) {
    throw new Error('Сессия FunPay истекла');
  }

  const data = tryParseJson(text);

  if (!data) {
    throw new Error('FunPay вернул неожиданный ответ');
  }

  const errorMessage = normalizeMessage(data.error || data.message || data.msg);

  if (data.success === false || data.status === 'error' || data.error) {
    throw new Error(errorMessage || 'FunPay отклонил публикацию');
  }

  return {
    nodeId: target.nodeId,
    name: target.name,
    status: 'success',
    message: normalizeMessage(data.message || data.msg) || 'Копия создана'
  };
}

function createMultiPostSummary(startedAt, results) {
  return {
    status: 'completed',
    startedAt,
    finishedAt: Date.now(),
    successCount: results.filter((item) => item.status === 'success').length,
    failedCount: results.filter((item) => item.status === 'failed').length,
    results
  };
}

function getCurrentNodeId(targetForm) {
  return new FormData(targetForm).get('node_id')?.toString() || null;
}

function createEmptyState(text) {
  const element = document.createElement('div');
  element.className = 'fp-empty';
  element.textContent = text;
  return element;
}

function setSubmitDisabled(submitter, disabled) {
  if ('disabled' in (submitter || {})) submitter.disabled = disabled;
}

function isSubmitControl(element) {
  if (element instanceof HTMLButtonElement) {
    return element.type === 'submit';
  }

  if (element instanceof HTMLInputElement) {
    return element.type === 'submit' || element.type === 'image';
  }

  return false;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function isLoginResponse(url, text) {
  const pathname = getPathname(url);
  return (
    pathname.includes('/account/login') ||
    /name=["']login["']/i.test(text) &&
      /name=["']password["']/i.test(text)
  );
}

function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeMessage(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean).join(', ');
  }
  return '';
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

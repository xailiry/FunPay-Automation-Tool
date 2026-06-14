document.addEventListener('DOMContentLoaded', () => {
  const autoBumpToggle = document.getElementById('auto-bump-toggle');
  const bumpNowButton = document.getElementById('bump-now-button');
  const bumpCountdown = document.getElementById('bump-countdown');
  const refreshStateButton = document.getElementById('refresh-state-button');
  const inlineStatus = document.getElementById('inline-status');
  const bumpActivityText = document.getElementById('bump-activity-text');
  const bumpActivityTime = document.getElementById('bump-activity-time');
  const multiPostActivityText = document.getElementById('multipost-activity-text');
  const multiPostActivityTime = document.getElementById('multipost-activity-time');
  const userGuideButton = document.getElementById('open-user-guide');
  const toolbarButton = document.getElementById('open-toolbar');
  let nextBumpAvailableAt = null;

  refreshState();
  window.setInterval(renderBumpCountdown, 15_000);
  userGuideButton.addEventListener('click', () => openToolbar('help'));
  toolbarButton.addEventListener('click', () => openToolbar('overview'));

  autoBumpToggle.addEventListener('change', async () => {
    autoBumpToggle.disabled = true;

    try {
      const response = await sendRuntimeMessage({
        action: 'setAutoBump',
        enabled: autoBumpToggle.checked
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Не удалось изменить расписание.');
      }

      showStatus(
        autoBumpToggle.checked
          ? `Авто-поднятие включено. Следующая проверка ${formatRemainingTime(
            response.nextAutoBumpAt
          )}.`
          : 'Авто-поднятие выключено.',
        'success'
      );
    } catch (error) {
      autoBumpToggle.checked = !autoBumpToggle.checked;
      showStatus(error.message, 'error');
    } finally {
      autoBumpToggle.disabled = false;
    }
  });

  bumpNowButton.addEventListener('click', async () => {
    setBumpRunning(true);
    showStatus('Проверяем активные категории...', 'warning');

    try {
      const response = await sendRuntimeMessage({ action: 'triggerBumpNow' });

      if (!response?.ok) {
        throw new Error(response?.error || 'Авто-поднятие не выполнено.');
      }

      const result = response.result;
      const message = [
        `Поднято: ${result.successCount}`,
        result.skippedCount ? `на кулдауне: ${result.skippedCount}` : '',
        result.failedCount ? `ошибок: ${result.failedCount}` : ''
      ].filter(Boolean).join(', ');

      showStatus(
        message,
        result.successCount > 0 && result.failedCount === 0
          ? 'success'
          : 'warning'
      );
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      setBumpRunning(false);
      await refreshState();
    }
  });

  refreshStateButton.addEventListener('click', refreshState);

  async function refreshState() {
    try {
      const state = await sendRuntimeMessage({ action: 'getExtensionState' });

      if (!state?.ok) {
        throw new Error(state?.error || 'Не удалось получить состояние расширения.');
      }

      autoBumpToggle.checked = Boolean(state.autoBumpEnabled);
      nextBumpAvailableAt = state.nextBumpAvailableAt;
      renderBumpCountdown();
      setBumpRunning(Boolean(state.bumpRunning));
      renderBumpActivity(state.lastBumpResult);
      renderMultiPostActivity(state.lastMultiPostResult);
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  function renderBumpActivity(result) {
    if (!result) {
      bumpActivityText.textContent = 'Операций пока не было';
      bumpActivityTime.textContent = '';
      return;
    }

    if (result.status === 'running') {
      bumpActivityText.textContent = 'Выполняется...';
      bumpActivityTime.textContent = formatTime(result.startedAt);
      return;
    }

    if (result.status === 'failed') {
      bumpActivityText.textContent = result.error || 'Операция завершилась ошибкой';
      bumpActivityTime.textContent = formatTime(result.finishedAt);
      return;
    }

    bumpActivityText.textContent =
      `Поднято ${result.successCount}, на кулдауне ${result.skippedCount}, ошибок ${result.failedCount}`;
    bumpActivityTime.textContent = formatTime(result.finishedAt);
  }

  function renderMultiPostActivity(result) {
    if (!result) {
      multiPostActivityText.textContent = 'Операций пока не было';
      multiPostActivityTime.textContent = '';
      return;
    }

    multiPostActivityText.textContent =
      `Создано ${result.successCount}, ошибок ${result.failedCount}`;
    multiPostActivityTime.textContent = formatTime(result.finishedAt);
  }

  function setBumpRunning(running) {
    bumpNowButton.disabled = running;
    bumpNowButton.textContent = running ? 'Выполняется...' : 'Поднять сейчас';
  }

  function renderBumpCountdown() {
    bumpCountdown.textContent = globalThis.FunPayBumpCountdown.format(
      nextBumpAvailableAt
    );
  }

  function showStatus(message, type) {
    inlineStatus.textContent = message;
    inlineStatus.className = 'inline-status';
    if (type) inlineStatus.classList.add(`inline-status--${type}`);
  }

  async function openToolbar(sectionId) {
    try {
      await sendRuntimeMessage({ action: 'openToolbar', sectionId });
      window.close();
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }
});

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

function formatTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatRemainingTime(timestamp) {
  const remainingMs = Number(timestamp) - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 60_000) {
    return 'в ближайшее время';
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `примерно через ${minutes} мин.`;
  if (minutes === 0) return `примерно через ${hours} ч.`;
  return `примерно через ${hours} ч. ${minutes} мин.`;
}

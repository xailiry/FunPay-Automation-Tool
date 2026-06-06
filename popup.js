document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('autoBumpToggle');
  const bumpBtn = document.getElementById('bumpNowBtn');
  const status = document.getElementById('bumpStatus');

  chrome.storage.local.get(['autoBumpEnabled'], (res) => {
    toggle.checked = !!res.autoBumpEnabled;
  });

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({autoBumpEnabled: enabled});
    if (enabled) {
      chrome.alarms.create('autoBumpAlarm', { periodInMinutes: 240 });
    } else {
      chrome.alarms.clear('autoBumpAlarm');
    }
  });

  bumpBtn.addEventListener('click', () => {
    bumpBtn.disabled = true;
    bumpBtn.textContent = "Выполняется...";
    status.classList.remove('visible');
    
    chrome.runtime.sendMessage({action: 'triggerBumpNow'}, (response) => {
      bumpBtn.disabled = false;
      bumpBtn.textContent = "Поднять сейчас";
      
      if (response && response.success) {
        status.textContent = `Успешно поднято категорий: ${response.count}`;
      } else {
        status.textContent = `Ошибка: ${response ? response.error : 'Неизвестная ошибка'}`;
      }
      status.classList.add('visible');
      
      setTimeout(() => {
          status.classList.remove('visible');
      }, 4000);
    });
  });
});

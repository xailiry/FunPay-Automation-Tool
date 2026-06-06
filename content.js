async function updateCategoryList() {
  try {
    let res = await fetch('https://funpay.com/');
    let text = await res.text();
    let matches = [...text.matchAll(/href="https:\/\/funpay\.com\/lots\/(\d+)\/">(.*?)<\/a>/g)];
    let categories = matches.map(m => ({ id: m[1], name: m[2].replace(/<[^>]*>?/gm, '').trim() }));
    
    let uniqueCats = [];
    let ids = new Set();
    categories.forEach(c => {
       if (c.name && !ids.has(c.id)) {
          ids.add(c.id);
          uniqueCats.push(c);
       }
    });
    chrome.storage.local.set({funpayCategories: uniqueCats});
  } catch(e) {
    console.log("FP Automator: Failed to fetch categories");
  }
}

function injectMultiPostUI() {
  const form = document.querySelector('form.js-lot-form') || document.querySelector('form[action*="offerSave"]');
  if (!form) return;
  if (document.getElementById('fp-multipost-container')) return;

  const container = document.createElement('div');
  container.id = 'fp-multipost-container';
  
  container.innerHTML = `
    <div class="fp-editorial-card">
      <h3 class="fp-title">Мульти-постинг</h3>
      <p class="fp-subtitle">Выберите дополнительные категории для публикации этого объявления при сохранении.</p>
      
      <div class="fp-layout-split">
          <div class="fp-column">
              <input type="text" id="fp-cat-search" class="fp-input" placeholder="Поиск категории (например, ChatGPT)...">
              <div id="fp-cat-list" class="fp-list"></div>
          </div>
          <div class="fp-column fp-column-selected">
              <h4 class="fp-subheading">Выбранные категории</h4>
              <div id="fp-selected-list" class="fp-selected-items">
                  <div class="fp-empty-state">Нет выбранных категорий.</div>
              </div>
          </div>
      </div>
    </div>
  `;

  const submitBtn = form.querySelector('button[type="submit"], .btn-primary');
  if (submitBtn) {
    submitBtn.parentNode.insertBefore(container, submitBtn);
  } else {
    form.appendChild(container);
  }

  let selectedNodes = new Map();

  function updateSelectedUI() {
    const selList = document.getElementById('fp-selected-list');
    selList.innerHTML = '';
    if (selectedNodes.size === 0) {
        selList.innerHTML = '<div class="fp-empty-state">Нет выбранных категорий.</div>';
        return;
    }
    
    selectedNodes.forEach((name, id) => {
        let tag = document.createElement('div');
        tag.className = 'fp-selected-tag';
        tag.innerHTML = `<span>${name}</span> <span class="fp-remove" data-id="${id}">×</span>`;
        selList.appendChild(tag);
    });

    selList.querySelectorAll('.fp-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            let id = e.target.getAttribute('data-id');
            selectedNodes.delete(id);
            updateSelectedUI();
            
            let cb = document.querySelector(`.fp-cb[value="${id}"]`);
            if (cb) cb.checked = false;
        });
    });
  }

  chrome.storage.local.get(['funpayCategories'], (res) => {
    let cats = res.funpayCategories || [];
    if (cats.length === 0) {
      updateCategoryList().then(() => {
        chrome.storage.local.get(['funpayCategories'], (res2) => renderList(res2.funpayCategories || []));
      });
    } else {
      renderList(cats);
    }
  });

  function renderList(cats) {
    const listEl = document.getElementById('fp-cat-list');
    const searchEl = document.getElementById('fp-cat-search');
    
    const popularWords = ['ChatGPT', 'Claude', 'Midjourney', 'Gemini', 'Discord', 'Telegram', 'Spotify', 'YouTube'];

    function draw(filterText) {
      listEl.innerHTML = '';
      let filtered = cats.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));
      
      if (!filterText) {
         filtered.sort((a,b) => {
            let aPop = popularWords.some(w => a.name.includes(w));
            let bPop = popularWords.some(w => b.name.includes(w));
            if (aPop && !bPop) return -1;
            if (!aPop && bPop) return 1;
            return 0;
         });
      }

      filtered.slice(0, 100).forEach(c => {
        let label = document.createElement('label');
        label.className = 'fp-item-row';
        
        let cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'fp-cb';
        cb.value = c.id;
        cb.checked = selectedNodes.has(c.id);
        
        cb.addEventListener('change', () => {
          if (cb.checked) {
              selectedNodes.set(c.id, c.name);
          } else {
              selectedNodes.delete(c.id);
          }
          updateSelectedUI();
        });

        label.appendChild(cb);
        let textSpan = document.createElement('span');
        textSpan.className = 'fp-item-text';
        textSpan.textContent = c.name;
        label.appendChild(textSpan);
        listEl.appendChild(label);
      });
    }

    draw('');
    searchEl.addEventListener('input', (e) => draw(e.target.value));
  }

  form.addEventListener('submit', (e) => {
    if (selectedNodes.size > 0) {
      let formData = new FormData(form);
      let entries = Array.from(formData.entries());
      chrome.runtime.sendMessage({
        action: 'doMultiPost',
        targetNodes: Array.from(selectedNodes.keys()),
        formDataEntries: entries
      });
    }
  });
}

if (window.location.href.includes('/offerEdit') || document.querySelector('form[action*="offerSave"]')) {
  injectMultiPostUI();
}

if (Math.random() < 0.1) {
  updateCategoryList();
}

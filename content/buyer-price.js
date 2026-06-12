(() => {
  const namespace = globalThis.FunPayAutomation ||= {};
  const Core = namespace.BuyerPriceCore;
  const form =
    namespace.Utils?.findOfferForm?.() ||
    document.querySelector('form.js-lot-form') ||
    document.querySelector('form[action*="offerSave"]');

  if (!form || !Core || document.getElementById('fp-buyer-price')) return;

  const priceInput = findPriceInput(form);
  const preview = findPreviewBlock(form);
  if (!priceInput || !preview) return;

  const PROBE_PRICE = 1000;
  const CALIBRATION_TIMEOUT_MS = 8000;
  const ratios = { card: 0, sbp: 0 };
  let method = 'card';
  let calibrated = false;
  let internalWrite = false;
  let manualCalibrationVersion = 0;

  const ui = buildUi();
  insertAfterPriceField(priceInput, ui.root);
  setUiPending(true);
  void calibrateWithProbe();

  function buildUi() {
    const root = document.createElement('div');
    root.id = 'fp-buyer-price';
    root.className = 'fp-buyer-price';
    root.innerHTML = `
      <div class="fp-buyer-price__header">
        <div class="fp-panel__eyebrow">FunPay Automation Tool</div>
        <h2 class="fp-buyer-price__title">Цена для покупателя</h2>
        <p class="fp-buyer-price__description">
          Укажите итоговую сумму с комиссией — поле «Цена за 1 шт.» заполнится автоматически.
        </p>
      </div>
      <div class="fp-buyer-price__body">
        <label class="fp-buyer-price__control">
          <span class="fp-buyer-price__control-label">Желаемая сумма</span>
          <div class="fp-buyer-price__field">
            <input class="fp-buyer-price__input" type="number" min="0" step="0.01"
              inputmode="decimal" placeholder="Например, 200">
            <span class="fp-buyer-price__unit">₽</span>
          </div>
        </label>
        <fieldset class="fp-buyer-price__control fp-buyer-price__method-control">
          <legend class="fp-buyer-price__control-label">Способ оплаты</legend>
          <div class="fp-buyer-price__methods" role="group" aria-label="Способ оплаты">
            <button type="button" data-method="card" aria-pressed="true">Карта</button>
            <button type="button" data-method="sbp" aria-pressed="false">СБП</button>
          </div>
        </fieldset>
      </div>
      <div class="fp-buyer-price__footer">
        <span class="fp-buyer-price__status-icon" aria-hidden="true"></span>
        <div class="fp-buyer-price__hint" role="status" aria-live="polite"></div>
      </div>
    `;

    const input = root.querySelector('.fp-buyer-price__input');
    const hint = root.querySelector('.fp-buyer-price__hint');
    const methodButtons = [...root.querySelectorAll('[data-method]')];

    input.addEventListener('input', applyBuyerPrice);
    methodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        method = button.dataset.method;
        methodButtons.forEach((other) =>
          other.setAttribute('aria-pressed', String(other === button))
        );
        applyBuyerPrice();
        refreshHint();
      });
    });

    return { root, input, hint };
  }

  async function calibrateWithProbe() {
    const originalValue = priceInput.value;
    const priceGroup = priceInput.closest('.form-group') || priceInput.parentElement;
    const wasReadOnly = priceInput.readOnly;
    const baseline = preview.innerText;
    const ratiosPromise = waitForRatios({
      sellerPrice: PROBE_PRICE,
      baseline,
      acceptBaseline: Core.parseAmount(originalValue) === PROBE_PRICE
    });

    priceInput.readOnly = true;
    priceInput.setAttribute('aria-busy', 'true');
    priceGroup?.classList.add('fp-price-calibrating');

    let detected;
    try {
      setNativePrice(String(PROBE_PRICE));
      detected = await ratiosPromise;
    } finally {
      setNativePrice(originalValue);
      priceInput.readOnly = wasReadOnly;
      priceInput.removeAttribute('aria-busy');
      priceGroup?.classList.remove('fp-price-calibrating');
    }

    if (applyDetectedRatios(detected)) {
      calibrated = true;
      setUiPending(false);
      refreshHint();
      return;
    }

    setUiPending(false);
    ui.hint.textContent =
      'Комиссию не удалось определить автоматически. Введите обычную цену один раз — расширение повторит расчёт.';
    ui.hint.classList.remove('is-ready');
    priceInput.addEventListener('input', calibrateFromManualPrice);
  }

  function calibrateFromManualPrice() {
    if (internalWrite) return;
    const sellerPrice = Core.parseAmount(priceInput.value);
    if (!(sellerPrice > 0)) return;

    const version = ++manualCalibrationVersion;
    const baseline = preview.innerText;
    void waitForRatios({ sellerPrice, baseline }).then((detected) => {
      if (version !== manualCalibrationVersion) return;
      if (!applyDetectedRatios(detected)) return;

      calibrated = true;
      priceInput.removeEventListener('input', calibrateFromManualPrice);
      refreshHint();
    });
  }

  function waitForRatios({
    sellerPrice,
    baseline,
    acceptBaseline = false
  }) {
    return new Promise((resolve) => {
      let settled = false;
      const body = preview.querySelector('.js-calc-table-body') || preview;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearInterval(pollTimer);
        clearTimeout(timeoutTimer);
        resolve(result);
      };

      const check = () => {
        const textChanged = preview.innerText !== baseline;
        if (!acceptBaseline && !textChanged) return;

        const detected = readCurrentRatios(sellerPrice);
        if (detected.card > 0 || detected.sbp > 0) finish(detected);
      };

      const observer = new MutationObserver(check);
      observer.observe(preview, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
      });
      const pollTimer = setInterval(check, 100);
      const timeoutTimer = setTimeout(
        () => finish({ card: 0, sbp: 0 }),
        CALIBRATION_TIMEOUT_MS
      );

      if (acceptBaseline && body.textContent.trim()) check();
    });
  }

  function readCurrentRatios(sellerPrice) {
    const rows = [...preview.querySelectorAll('tr')].map((row) => ({
      label: row.querySelector('th')?.textContent || '',
      amount: row.querySelector('td')?.textContent || ''
    }));
    return Core.readRatios(rows, sellerPrice);
  }

  function applyDetectedRatios(detected) {
    if (detected.card > 0) ratios.card = detected.card;
    if (detected.sbp > 0) ratios.sbp = detected.sbp;
    return ratios.card > 0 || ratios.sbp > 0;
  }

  function applyBuyerPrice() {
    if (!calibrated || ui.input.value.trim() === '') return;
    const sellerPrice = Core.calculateSellerPrice(
      ui.input.value,
      ratios[method]
    );
    if (sellerPrice) setNativePrice(sellerPrice);
  }

  function setNativePrice(value) {
    internalWrite = true;
    priceInput.value = value;
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    priceInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    priceInput.dispatchEvent(new Event('change', { bubbles: true }));
    internalWrite = false;
  }

  function setUiPending(pending) {
    ui.input.disabled = pending;
    ui.root.classList.toggle('is-loading', pending);
    if (pending) {
      ui.hint.textContent = 'Определяем комиссию категории…';
      ui.hint.classList.remove('is-ready');
    }
  }

  function refreshHint() {
    if (!calibrated) return;
    const ratio = ratios[method];
    if (!(ratio > 0)) {
      ui.hint.textContent =
        'Для этого способа оплаты комиссию определить не удалось.';
      ui.hint.classList.remove('is-ready');
      return;
    }

    const percent = (ratio - 1) * 100;
    ui.hint.textContent =
      `Комиссия ${method === 'sbp' ? 'СБП' : 'карты'} в этой категории — ` +
      `+${percent.toLocaleString('ru-RU', {
        maximumFractionDigits: 1
      })}%. Поле «Цена за 1 шт.» заполняется автоматически.`;
    ui.hint.classList.add('is-ready');
  }

  function findPriceInput(scope) {
    const byName = scope.querySelector('input[name="price"]');
    if (byName) return byName;

    for (const input of scope.querySelectorAll(
      'input[type="text"], input[type="number"], input:not([type])'
    )) {
      if (/цена\s*за|price/i.test(labelTextFor(input))) return input;
    }
    return null;
  }

  function findPreviewBlock(scope) {
    return (
      scope.querySelector('.js-calc-table') ||
      [...scope.querySelectorAll('.form-group, fieldset, section')].find(
        (node) => /цена\s+для\s+покупател/i.test(node.textContent || '')
      ) ||
      null
    );
  }

  function labelTextFor(input) {
    const group = input.closest('.form-group') || input.parentElement;
    return (
      group?.querySelector('label, .control-label')?.textContent || ''
    ).trim();
  }

  function insertAfterPriceField(input, node) {
    const group = input.closest('.form-group') || input.parentElement;
    if (group?.parentNode) {
      group.parentNode.insertBefore(node, group.nextSibling);
    } else {
      form.insertBefore(node, form.firstChild);
    }
  }
})();

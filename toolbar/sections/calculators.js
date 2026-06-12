(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const C = namespace.Components;
  const Calculations = namespace.Calculations;

  namespace.Sections ||= {};
  namespace.Sections.calculators = (context) => {
    const settings = context.settings.calculators;
    const section = document.createElement('section');
    section.className = 'fpat-section';
    section.append(C.sectionHeader(
      'Калькуляторы',
      'Расчёты комиссий и цен. Выполняются на вашем устройстве, без сетевых запросов.'
    ));

    const withdrawal = C.card('Вывод средств', 'Сколько останется после комиссии при выводе с FunPay.');
    const withdrawalBody = document.createElement('div');
    withdrawalBody.className = 'fpat-card__body fpat-grid fpat-grid--2';
    const method = C.select(settings.withdrawalMethod, [
      ['card', 'СБП или банковская карта'],
      ['usdt', 'USDT']
    ]);
    const amount = C.number(settings.withdrawalAmount, { min: 0, step: 0.01 });
    const feeOutput = result('Комиссия', '0 ₽');
    const netOutput = result('К получению', '0 ₽', true);
    method.addEventListener('change', saveWithdrawal);
    amount.addEventListener('input', saveWithdrawal);
    withdrawalBody.append(
      C.field('Способ вывода', method),
      C.field('Сумма, ₽', amount),
      results(feeOutput, netOutput)
    );
    withdrawal.append(withdrawalBody);

    const desired = C.card('Цена по сумме на руки', 'Какую цену указать, чтобы получить нужную сумму.');
    const desiredBody = document.createElement('div');
    desiredBody.className = 'fpat-card__body fpat-grid fpat-grid--2';
    const desiredNet = C.number(settings.desiredNet, { min: 0, step: 0.01 });
    const desiredMethod = C.select(settings.withdrawalMethod, [
      ['card', 'СБП или карта'],
      ['usdt', 'USDT']
    ]);
    const grossOutput = result('Нужная сумма до вывода', '0 ₽', true);
    desiredNet.addEventListener('input', saveDesired);
    desiredMethod.addEventListener('change', updateDesired);
    desiredBody.append(
      C.field('Хочу получить, ₽', desiredNet),
      C.field('Способ вывода', desiredMethod),
      results(grossOutput)
    );
    desired.append(desiredBody);

    const profit = C.card('Прибыль с продажи', 'Чистая прибыль после комиссии вывода и наценка к себестоимости.');
    const profitBody = document.createElement('div');
    profitBody.className = 'fpat-card__body fpat-grid fpat-grid--3';
    const profitPrice = C.number(settings.profitPrice, { min: 0, step: 0.01 });
    const profitCost = C.number(settings.profitCost, { min: 0, step: 0.01 });
    const profitMethod = C.select(settings.profitMethod, [
      ['card', 'СБП или карта'],
      ['usdt', 'USDT']
    ]);
    const profitOutput = result('Чистая прибыль', '0 ₽', true);
    const markupOutput = result('Наценка', '0 %');
    profitPrice.addEventListener('input', saveProfit);
    profitCost.addEventListener('input', saveProfit);
    profitMethod.addEventListener('change', saveProfit);
    profitBody.append(
      C.field('Цена продажи, ₽', profitPrice),
      C.field('Себестоимость, ₽', profitCost),
      C.field('Способ вывода', profitMethod),
      results(profitOutput, markupOutput)
    );
    profit.append(profitBody);

    section.append(withdrawal, desired, profit);
    updateWithdrawal();
    updateDesired();
    updateProfit();
    return section;

    async function saveWithdrawal() {
      settings.withdrawalMethod = method.value;
      settings.withdrawalAmount = numberValue(amount);
      await context.store.replaceSection('calculators', settings);
      updateWithdrawal();
    }

    function updateWithdrawal() {
      const calc = Calculations.calculateWithdrawal(
        numberValue(amount),
        method.value
      );
      setResult(feeOutput, money(calc.fee));
      setResult(netOutput, money(calc.net));
    }

    async function saveDesired() {
      settings.desiredNet = numberValue(desiredNet);
      await context.store.replaceSection('calculators', settings);
      updateDesired();
    }

    function updateDesired() {
      const gross = Calculations.calculateGrossForNet(
        numberValue(desiredNet),
        desiredMethod.value
      );
      setResult(grossOutput, money(gross));
    }

    async function saveProfit() {
      settings.profitPrice = numberValue(profitPrice);
      settings.profitCost = numberValue(profitCost);
      settings.profitMethod = profitMethod.value;
      await context.store.replaceSection('calculators', settings);
      updateProfit();
    }

    function updateProfit() {
      const price = numberValue(profitPrice);
      const cost = numberValue(profitCost);
      const net = Calculations.calculateWithdrawal(price, profitMethod.value).net;
      const gain = net - cost;
      setResult(profitOutput, money(gain));
      const markup = cost > 0 ? (gain / cost) * 100 : 0;
      setResult(
        markupOutput,
        `${markup.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`
      );
    }
  };

  function results(...rows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'fpat-calc-results';
    wrapper.append(...rows);
    return wrapper;
  }

  function result(label, value, primary = false) {
    const row = document.createElement('div');
    row.className = `fpat-result${primary ? ' fpat-result--primary' : ''}`;
    const description = document.createElement('span');
    description.textContent = label;
    const resultNode = document.createElement('strong');
    resultNode.textContent = value;
    row.append(description, resultNode);
    return row;
  }

  function setResult(node, value) {
    node.querySelector('strong').textContent = value;
  }

  function numberValue(control) {
    return Math.max(0, Number(control.value) || 0);
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString('ru-RU', {
      maximumFractionDigits: 2
    })} ₽`;
  }
})();

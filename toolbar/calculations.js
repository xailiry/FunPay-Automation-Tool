(() => {
  const namespace = globalThis.FunPayAutomationToolbar;

  namespace.Calculations = Object.freeze({
    calculateGrossForNet,
    calculateWithdrawal,
    convertByRate
  });

  function calculateWithdrawal(amount, method = 'card') {
    const normalized = positiveNumber(amount);
    const fee = method === 'usdt'
      ? normalized * 0.06
      : normalized > 0
        ? Math.max(normalized * 0.03, 30)
        : 0;
    return {
      fee,
      net: Math.max(0, normalized - fee)
    };
  }

  function calculateGrossForNet(netAmount, method = 'card') {
    const net = positiveNumber(netAmount);
    if (method === 'usdt') return net / 0.94;
    return net <= 970 ? net + 30 : net / 0.97;
  }

  function convertByRate(amount, rate) {
    return positiveNumber(amount) / Math.max(positiveNumber(rate), 0.0001);
  }

  function positiveNumber(value) {
    return Math.max(0, Number(value) || 0);
  }
})();

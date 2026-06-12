(() => {
  const namespace = globalThis.FunPayAutomation ||= {};

  namespace.BuyerPriceCore = Object.freeze({
    calculateSellerPrice,
    formatPrice,
    parseAmount,
    readRatios
  });

  function readRatios(rows, sellerPrice) {
    const basePrice = parseAmount(sellerPrice);
    const ratios = { card: 0, sbp: 0 };
    if (!(basePrice > 0) || !Array.isArray(rows)) return ratios;

    for (const row of rows) {
      const label = String(row?.label || '').toLocaleLowerCase('ru');
      const amountText = String(row?.amount || '');
      if (!amountText.includes('₽')) continue;

      const buyerPrice = parseAmount(amountText);
      if (!(buyerPrice > 0)) continue;

      const ratio = Math.round((buyerPrice / basePrice) * 1e8) / 1e8;
      if (!(ratio >= 1 && ratio <= 5)) continue;

      if (/сбп|qr/i.test(label)) ratios.sbp = ratio;
      else if (/карт|card/i.test(label)) ratios.card = ratio;
    }

    return ratios;
  }

  function calculateSellerPrice(buyerPrice, ratio) {
    const target = parseAmount(buyerPrice);
    const multiplier = Number(ratio);
    if (!(target > 0) || !(multiplier > 0)) return '';
    return formatPrice(target / multiplier);
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return '';
    const rounded = Math.round(number * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  function parseAmount(raw) {
    let text = String(raw || '')
      .replace(/[^\d.,\s]/g, '')
      .replace(/\s+/g, '');
    if (text.includes(',') && text.includes('.')) {
      const decimalSeparator =
        text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
      const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
      text = text.replaceAll(thousandsSeparator, '');
      if (decimalSeparator === ',') text = text.replace(',', '.');
    } else {
      text = text.replace(',', '.');
    }
    const value = Number.parseFloat(text);
    return Number.isFinite(value) ? value : 0;
  }
})();

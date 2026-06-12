(() => {
  const namespace = (globalThis.FunPayAutomation ||= {});
  const MAX_STATE_ITEMS = 500;

  namespace.OrderScenariosCore = Object.freeze({
    normalizeSettings,
    normalizeState,
    renderText,
    resolveSameOriginUrl
  });

  function normalizeSettings(value) {
    const source = isRecord(value) ? value : {};
    return {
      afterPaymentEnabled: Boolean(source.afterPaymentEnabled),
      afterPaymentDelayMinutes: clampNumber(
        source.afterPaymentDelayMinutes,
        0,
        1440,
        1
      ),
      afterPaymentMessage: String(source.afterPaymentMessage || ''),
      reviewRequestEnabled: Boolean(source.reviewRequestEnabled),
      reviewDelayHours: clampNumber(source.reviewDelayHours, 0, 168, 2),
      reviewMessage: String(source.reviewMessage || '')
    };
  }

  function normalizeState(value) {
    const source = isRecord(value) ? value : {};
    const entries = isRecord(source.orders)
      ? Object.entries(source.orders)
      : [];
    const orders = Object.fromEntries(
      entries
        .filter(([, entry]) => isRecord(entry))
        .sort(([, left], [, right]) =>
          getEntryTimestamp(right) - getEntryTimestamp(left)
        )
        .slice(0, MAX_STATE_ITEMS)
    );

    return {
      baselineDone: Boolean(source.baselineDone),
      orders
    };
  }

  function renderText(template, { buyerName, offerName, orderId }) {
    return String(template || '')
      .replaceAll('{buyername}', clean(buyerName) || 'покупатель')
      .replaceAll('{offername}', clean(offerName) || 'ваш заказ')
      .replaceAll('{order}', clean(orderId) || '');
  }

  function resolveSameOriginUrl(value, origin) {
    try {
      const url = new URL(String(value || ''), origin);
      return url.origin === origin ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function getEntryTimestamp(entry) {
    return Math.max(
      Number(entry.lastSeenAt) || 0,
      Number(entry.paymentSendAt) || 0,
      Number(entry.reviewSendAt) || 0
    );
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }
})();

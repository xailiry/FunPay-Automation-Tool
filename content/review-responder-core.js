(() => {
  const namespace = (globalThis.FunPayAutomation ||= {});
  const MAX_STATE_ITEMS = 500;
  const STARS = ['1', '2', '3', '4', '5'];

  namespace.ReviewResponderCore = Object.freeze({
    normalizeSettings,
    normalizeState,
    resolveTemplate,
    renderText,
    parseReviews,
    buildReplyBody
  });

  function normalizeSettings(value) {
    const source = isRecord(value) ? value : {};
    const stars = isRecord(source.reviewReplyStars) ? source.reviewReplyStars : {};
    const reviewReplyStars = {};
    for (const star of STARS) reviewReplyStars[star] = String(stars[star] || '');

    return {
      reviewReplyEnabled: Boolean(source.reviewReplyEnabled),
      reviewReplyDelayMinutes: clampNumber(source.reviewReplyDelayMinutes, 0, 1440, 0),
      reviewReplyTemplate: String(source.reviewReplyTemplate || ''),
      reviewReplyStars
    };
  }

  function normalizeState(value) {
    const source = isRecord(value) ? value : {};
    const entries = isRecord(source.reviews) ? Object.entries(source.reviews) : [];
    const reviews = Object.fromEntries(
      entries
        .filter(([, entry]) => isRecord(entry))
        .sort(([, left], [, right]) =>
          (Number(right.lastSeenAt) || 0) - (Number(left.lastSeenAt) || 0)
        )
        .slice(0, MAX_STATE_ITEMS)
    );

    return {
      baselineDone: Boolean(source.baselineDone),
      reviews
    };
  }

  // Per-rating override if set, otherwise the shared template. Empty result
  // means "do not reply to a review with this rating".
  function resolveTemplate(rating, settings) {
    const override = settings.reviewReplyStars?.[String(rating)] || '';
    return clean(override) ? override : settings.reviewReplyTemplate;
  }

  function renderText(template, { buyerName, offerName, orderId } = {}) {
    return String(template || '')
      .replaceAll('{buyername}', clean(buyerName) || 'покупатель')
      .replaceAll('{offername}', clean(offerName) || 'ваш заказ')
      .replaceAll('{order}', clean(orderId) || '');
  }

  function parseReviews(doc) {
    return [...doc.querySelectorAll('.review-container')]
      .map((element) => {
        const orderHref =
          element.querySelector('.review-item-order a')?.getAttribute('href') || '';
        const orderId = orderHref.match(/\/orders\/([^/]+)\/?/)?.[1] || '';
        const ratingClass = [
          ...(element.querySelector('.review-item-rating .rating > div')?.classList || [])
        ].find((name) => /^rating\d$/.test(name));
        return {
          orderId,
          rating: ratingClass ? Number(ratingClass.replace('rating', '')) : 0,
          buyerName: clean(element.querySelector('.media-user-name a')?.textContent),
          detail: clean(element.querySelector('.review-item-detail')?.textContent),
          hasReply: Boolean(element.querySelector('.review-item-answer'))
        };
      })
      .filter((review) => review.orderId);
  }

  function buildReplyBody({ authorId, orderId, text, csrfToken }) {
    const body = new URLSearchParams();
    body.set('authorId', String(authorId || ''));
    body.set('text', String(text || ''));
    body.set('rating', '');
    body.set('csrf_token', String(csrfToken || ''));
    body.set('orderId', String(orderId || ''));
    return body.toString();
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

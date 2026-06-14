(() => {
  const namespace = (globalThis.FunPayAutomation ||= {});
  if (!/(^|\.)funpay\.com$/.test(location.hostname)) return;
  if (namespace.reviewResponderStarted) return;
  namespace.reviewResponderStarted = true;
  const Core = namespace.ReviewResponderCore;

  const SETTINGS_KEY = 'toolbarSettings';
  const STATE_KEY = 'reviewResponderStateV2';
  const POLL_INTERVAL_MS = 120_000;
  const POLL_THROTTLE_MS = 100_000;
  const FIRST_RUN_DELAY_MS = 12_000;
  const MAX_SEND_ATTEMPTS = 3;
  const POLL_LOCK_NAME = 'funpay-automation-review-responder';

  let settings = Core.normalizeSettings(null);

  void init();

  async function init() {
    settings = await loadSettings();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[SETTINGS_KEY]) {
        settings = Core.normalizeSettings(changes[SETTINGS_KEY].newValue?.orders);
      }
    });
    setInterval(() => {
      void tick().catch((error) => reportError('Проверка отзывов', error));
    }, POLL_INTERVAL_MS);
    setTimeout(() => {
      void tick().catch((error) => reportError('Проверка отзывов', error));
    }, FIRST_RUN_DELAY_MS);
  }

  async function tick() {
    if (!settings.reviewReplyEnabled) return;
    await withPollLock(async () => {
      if (!(await claimPoll())) return;
      try {
        const account = readAppData();
        if (!account.userId) return;
        const reviews = await fetchReviews(account.userId);
        if (reviews) await processReviews(reviews, account);
      } catch (error) {
        reportError('Загрузка отзывов', error);
      }
    });
  }

  async function withPollLock(task) {
    if (!navigator.locks?.request) {
      await task();
      return;
    }
    await navigator.locks.request(
      POLL_LOCK_NAME,
      { ifAvailable: true },
      async (lock) => {
        if (lock) await task();
      }
    );
  }

  // Only one tab polls per interval — guards against duplicate work and replies.
  async function claimPoll() {
    const stored = await chrome.storage.local.get('reviewResponderPollAt');
    const last = Number(stored.reviewResponderPollAt) || 0;
    if (Date.now() - last < POLL_THROTTLE_MS) return false;
    await chrome.storage.local.set({ reviewResponderPollAt: Date.now() });
    return true;
  }

  async function fetchReviews(userId) {
    const response = await fetch(new URL(`/users/${userId}/`, location.origin), {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (/onsite-login|class="page-login"/i.test(html)) return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Core.parseReviews(doc);
  }

  async function processReviews(reviews, account) {
    const state = await loadState();
    const now = Date.now();

    // No baseline here: unlike chat scenarios, answering an unanswered review is
    // expected even for older ones. We reply to every review that has no seller
    // answer yet (and never overwrite a reply the user already left).
    for (const review of reviews) {
      const entry = (state.reviews[review.orderId] ||= { repliedDone: false });
      entry.lastSeenAt = now;

      // Already answered (by us, by hand, or from the phone) — never touch.
      if (review.hasReply) {
        entry.repliedDone = true;
        continue;
      }
      if (entry.repliedDone) continue;

      if (entry.sendAt == null && Core.resolveTemplate(review.rating, settings).trim()) {
        entry.sendAt = now + settings.reviewReplyDelayMinutes * 60_000;
      }
    }
    await saveState(state);

    for (const review of reviews) {
      const entry = state.reviews[review.orderId];
      if (!entry || entry.repliedDone || review.hasReply) continue;
      if (entry.sendAt != null && now >= entry.sendAt) {
        await replyToReview(review, account);
      }
    }
  }

  async function replyToReview(review, account) {
    // Re-read state right before sending so a parallel tab cannot double-reply.
    const state = await loadState();
    const entry = state.reviews[review.orderId];
    if (!entry || entry.repliedDone) return;

    const template = Core.resolveTemplate(review.rating, settings);
    const text = Core.renderText(template, {
      buyerName: review.buyerName,
      offerName: review.detail,
      orderId: review.orderId
    });
    if (!text.trim() || !account.csrfToken) {
      if (!account.csrfToken) {
        reportError('Ответ на отзыв', new Error('Нет csrf-токена.'));
      } else {
        entry.repliedDone = true;
        await saveState(state);
      }
      return;
    }

    entry.replyAttempts = (entry.replyAttempts || 0) + 1;
    let ok = false;
    try {
      ok = await sendReviewReply({
        authorId: account.userId,
        orderId: review.orderId,
        text,
        csrfToken: account.csrfToken
      });
    } catch (error) {
      reportError('Ответ на отзыв', error);
    }

    if (ok || entry.replyAttempts >= MAX_SEND_ATTEMPTS) entry.repliedDone = true;
    await saveState(state);
  }

  async function sendReviewReply(params) {
    const response = await fetch('https://funpay.com/orders/review', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
        accept: 'application/json, text/javascript, */*; q=0.01'
      },
      body: Core.buildReplyBody(params)
    });
    if (!response.ok) return false;
    const json = await response.json().catch(() => null);
    if (json && (json.error || json.errorText)) {
      reportError('Ответ на отзыв', new Error(String(json.error || json.errorText)));
      return false;
    }
    return true;
  }

  function readAppData() {
    let data = {};
    try {
      data = JSON.parse(
        document.body?.getAttribute('data-app-data') ||
        document.body?.dataset.appData ||
        '{}'
      );
    } catch {
      data = {};
    }
    return {
      userId: String(data.userId || ''),
      csrfToken: String(data['csrf-token'] || data.csrfToken || '')
    };
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return Core.normalizeSettings(stored[SETTINGS_KEY]?.orders);
  }

  async function loadState() {
    const stored = await chrome.storage.local.get(STATE_KEY);
    return Core.normalizeState(stored[STATE_KEY]);
  }

  async function saveState(state) {
    await chrome.storage.local.set({ [STATE_KEY]: Core.normalizeState(state) });
  }

  function reportError(context, error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[FunPay Automation · авто-ответ на отзывы] ${context}: ${message}`);
  }
})();

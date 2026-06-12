(() => {
  const STORAGE_KEY = 'toolbarSettings';
  const STYLE_ID = 'fpat-theme-bootstrap-style';
  const LEGACY_CACHE_KEY = 'fpatAppearanceCache';
  const root = document.documentElement;

  clearLegacyCache();
  root.dataset.fpatBootstrap = 'loading';
  ensureStyle();
  loadStoredAppearance();
  window.setTimeout(releaseBootstrap, 2500);

  function loadStoredAppearance() {
    if (!globalThis.chrome?.storage?.local) {
      releaseBootstrap();
      return;
    }
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      const appearance = result?.[STORAGE_KEY]?.appearance;
      if (!appearance) {
        releaseBootstrap();
        return;
      }
      applyEarly({
        ...appearance,
        mode: resolveMode(appearance.mode)
      });
    });
  }

  function clearLegacyCache() {
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      // FunPay may block site storage; private extension storage still works.
    }
  }

  function applyEarly(appearance) {
    const mode = resolveMode(appearance.mode);
    const backgroundUrl = isProfilePage()
      ? ''
      : sanitizeBackgroundUrl(appearance.backgroundUrl);
    root.dataset.fpatTheme = mode;
    root.dataset.fpatPreset = appearance.preset || 'custom';
    root.dataset.fpatDensity = appearance.density || 'standard';
    root.dataset.fpatBootstrap = mode;
    root.dataset.fpatBackground = backgroundUrl ? 'true' : 'false';
    root.style.setProperty('--fpat-accent', appearance.accent || '#d99a16');
    if (isHex(appearance.customBg)) {
      root.style.setProperty('--fpat-early-bg', appearance.customBg);
    }
    if (isHex(appearance.customSurface)) {
      root.style.setProperty('--fpat-early-surface', appearance.customSurface);
    }
    root.style.setProperty(
      '--fpat-early-image',
      backgroundUrl ? `url("${backgroundUrl}")` : 'none'
    );
    root.style.setProperty(
      '--fpat-early-overlay',
      String(clamp(appearance.backgroundOverlay, 0, 80) / 100)
    );
    root.style.setProperty(
      '--fpat-early-blur',
      `${clamp(appearance.backgroundBlur, 0, 20)}px`
    );
    root.style.setProperty(
      '--fpat-early-inset',
      `${clamp(appearance.backgroundBlur, 0, 20) * -2}px`
    );
    root.style.setProperty(
      '--fpat-early-fit',
      normalizeBackgroundFit(appearance.backgroundFit)
    );
    root.style.setProperty(
      '--fpat-early-position',
      normalizeBackgroundPosition(appearance.backgroundPosition)
    );
    ensureStyle();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-fpat-bootstrap="loading"] body,
      html[data-fpat-bootstrap="dark"] body,
      html[data-fpat-bootstrap][data-fpat-background="true"] body {
        visibility: hidden !important;
      }
      html[data-fpat-bootstrap="loading"] {
        background: #fff !important;
      }
      html[data-fpat-bootstrap="dark"] {
        color-scheme: dark;
        --fpat-early-bg: #171b1f;
        --fpat-early-surface: #23292e;
        background: var(--fpat-early-bg) !important;
      }
      html[data-fpat-bootstrap="dark"][data-fpat-preset="graphite"] {
        --fpat-early-bg: #181817;
        --fpat-early-surface: #242422;
      }
      html[data-fpat-bootstrap="dark"][data-fpat-preset="night"] {
        --fpat-early-bg: #11161d;
        --fpat-early-surface: #1a212a;
      }
      html[data-fpat-bootstrap="dark"] :where(
        body,
        .wrapper,
        .wrapper-content,
        #content,
        #content-body
      ) {
        background-color: var(--fpat-early-bg) !important;
      }
      html[data-fpat-bootstrap="dark"] :where(
        #header,
        .panel,
        .chat,
        .chat-contacts,
        .chat-detail,
        .showcase
      ) {
        background-color: var(--fpat-early-surface) !important;
      }
      html[data-fpat-bootstrap][data-fpat-background="true"]::before {
        content: "";
        position: fixed;
        z-index: -1;
        inset: 0;
        background-color: var(--fpat-early-bg, #fff);
      }
    `;
    document.documentElement.append(style);
  }

  function resolveMode(mode) {
    if (mode !== 'system') return mode === 'dark' ? 'dark' : 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function isProfilePage() {
    return /^\/users\//.test(location.pathname);
  }

  function sanitizeBackgroundUrl(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text);
      return ['http:', 'https:', 'data:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function normalizeBackgroundFit(value) {
    return ['cover', 'contain', 'auto'].includes(value) ? value : 'cover';
  }

  function normalizeBackgroundPosition(value) {
    return ['center', 'top', 'bottom', 'left', 'right'].includes(value)
      ? value
      : 'center';
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function isHex(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
  }

  function releaseBootstrap() {
    if (root.dataset.fpatBootstrap === 'loading') {
      delete root.dataset.fpatBootstrap;
      return;
    }

    if (
      root.dataset.fpatBootstrap === 'dark' &&
      !document.getElementById('fpat-page-theme')
    ) {
      delete root.dataset.fpatBootstrap;
    }
  }
})();

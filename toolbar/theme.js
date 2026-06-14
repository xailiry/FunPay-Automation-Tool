(() => {
  const namespace = globalThis.FunPayAutomationToolbar;
  const STYLE_ID = 'fpat-page-theme';
  const BACKGROUND_ID = 'fpat-page-background';
  const PALETTES = {
    light: {
      bg: '#ffffff',
      surface: '#ffffff',
      text: '#20262b'
    },
    dark: {
      bg: '#171b1f',
      surface: '#23292e',
      text: '#edf0f2'
    },
    graphite: {
      bg: '#181817',
      surface: '#242422',
      text: '#f1efe9'
    },
    night: {
      bg: '#11161d',
      surface: '#1a212a',
      text: '#edf3fb'
    }
  };
  const PRESETS = {
    standard: {
      mode: 'light',
      accent: '#d99a16',
      density: 'standard'
    },
    graphite: {
      mode: 'dark',
      accent: '#e0a329',
      density: 'standard'
    },
    night: {
      mode: 'dark',
      accent: '#7da8ff',
      density: 'compact'
    }
  };

  namespace.Theme = Object.freeze({
    apply,
    applyPreset,
    getPalette,
    presets: PRESETS
  });

  function apply(settings) {
    ensureThemeStyle();
    const root = document.documentElement;
    const mode = resolveMode(settings.mode);
    const accent = settings.accent || '#d99a16';
    const density = settings.density || 'standard';
    const preset = settings.preset || 'custom';
    const palette = getPalette({ ...settings, mode });
    const hasCustomColors = Boolean(
      sanitizeHex(settings.customBg) ||
      sanitizeHex(settings.customSurface) ||
      sanitizeHex(settings.customText)
    );
    // Re-skin the FunPay page whenever the look departs from native light:
    // dark mode, a dark preset, or any hand-picked colour. This makes custom
    // colours actually take effect — not only in dark mode.
    const themed =
      mode === 'dark' || preset === 'graphite' || preset === 'night' ||
      hasCustomColors;

    root.dataset.fpatTheme = mode;
    root.dataset.fpatPreset = preset;
    root.dataset.fpatDensity = density;
    if (themed) root.dataset.fpatSkin = 'on';
    else delete root.dataset.fpatSkin;
    root.style.colorScheme = isDarkColor(palette.bg) ? 'dark' : 'light';
    root.style.setProperty('--fpat-accent', accent);
    applyPaletteVars(root, palette);

    namespace.currentTheme = { mode, accent, density, preset, themed };
    syncToolbarHost();

    const background = ensureBackground();
    // The profile page already has FunPay's own cover image and the seller
    // dashboard on top — a wallpaper behind that looks messy, so skip it there.
    const url = isProfilePage()
      ? ''
      : sanitizeBackgroundUrl(settings.backgroundUrl);
    const blur = clamp(settings.backgroundBlur, 0, 20);
    root.dataset.fpatBackground = url ? 'true' : 'false';
    background.style.backgroundImage = url ? `url("${url}")` : '';
    background.style.backgroundSize = normalizeBackgroundFit(settings.backgroundFit);
    background.style.backgroundPosition = normalizeBackgroundPosition(
      settings.backgroundPosition
    );
    background.style.backgroundRepeat = 'no-repeat';
    background.style.setProperty(
      '--fpat-background-overlay',
      String(clamp(settings.backgroundOverlay, 0, 90) / 100)
    );
    background.style.inset = blur ? `${blur * -2}px` : '0';
    background.style.filter = blur ? `blur(${blur}px)` : 'none';
    background.hidden = !url;
    revealBootstrappedPage(root);
  }

  function applyPaletteVars(root, palette) {
    const set = (name, value) => root.style.setProperty(name, value);
    set('--fpat-page-bg', palette.bg);
    set('--fpat-page-surface', palette.surface);
    set('--fpat-page-text', palette.text);
    set('--fpat-page-soft', `color-mix(in srgb, ${palette.bg} 55%, ${palette.surface})`);
    set('--fpat-page-raised', `color-mix(in srgb, ${palette.surface} 90%, ${palette.text})`);
    set('--fpat-page-muted', `color-mix(in srgb, ${palette.text} 58%, ${palette.surface})`);
    set('--fpat-page-border', `color-mix(in srgb, ${palette.text} 16%, ${palette.surface})`);
  }

  function isDarkColor(hex) {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!match) return true;
    const value = parseInt(match[1], 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
  }

  function applyPreset(settings, presetId) {
    return {
      ...settings,
      preset: presetId,
      ...(PRESETS[presetId] || PRESETS.standard),
      // Density is a separate, user-controlled setting — picking a colour preset
      // must not reset it.
      density: settings.density,
      customBg: '',
      customSurface: '',
      customText: ''
    };
  }

  function getPalette(settings) {
    const presetId = settings.preset === 'graphite' || settings.preset === 'night'
      ? settings.preset
      : resolveMode(settings.mode);
    const base = PALETTES[presetId] || PALETTES.light;
    return {
      bg: sanitizeHex(settings.customBg) || base.bg,
      surface: sanitizeHex(settings.customSurface) || base.surface,
      text: sanitizeHex(settings.customText) || base.text
    };
  }

  function resolveMode(mode) {
    if (mode !== 'system') return mode === 'dark' ? 'dark' : 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function isProfilePage() {
    return /^\/users\//.test(location.pathname);
  }

  function syncToolbarHost() {
    const host = document.getElementById('fpat-toolbar-host');
    if (!host) return;
    host.dataset.theme = namespace.currentTheme.mode;
    host.dataset.density = namespace.currentTheme.density;
    host.dataset.preset = namespace.currentTheme.preset;
    host.style.setProperty('--accent', namespace.currentTheme.accent);
    host.style.setProperty(
      '--accent-strong',
      namespace.currentTheme.mode === 'dark'
        ? namespace.currentTheme.accent
        : '#a96f00'
    );
  }

  function ensureBackground() {
    let element = document.getElementById(BACKGROUND_ID);
    if (element) return element;

    element = document.createElement('div');
    element.id = BACKGROUND_ID;
    element.setAttribute('aria-hidden', 'true');
    (document.body || document.documentElement).prepend(element);
    return element;
  }

  function ensureThemeStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html[data-fpat-theme="light"] {
        --fpat-page-bg: #fff;
        --fpat-page-surface: #fff;
        --fpat-page-soft: #f6f7f8;
        --fpat-page-raised: #fff;
        --fpat-page-text: #20262b;
        --fpat-page-muted: #69737b;
        --fpat-page-border: #dce1e4;
      }
      html[data-fpat-skin] {
        --fpat-page-bg: #171b1f;
        --fpat-page-surface: #23292e;
        --fpat-page-soft: #1d2226;
        --fpat-page-raised: #2a3137;
        --fpat-page-text: #edf0f2;
        --fpat-page-muted: #a8b0b6;
        --fpat-page-border: #3b444b;
      }
      html[data-fpat-preset="graphite"] {
        --fpat-page-bg: #181817;
        --fpat-page-surface: #242422;
        --fpat-page-soft: #1e1e1c;
        --fpat-page-raised: #2d2c29;
        --fpat-page-text: #f1efe9;
        --fpat-page-muted: #aaa69c;
        --fpat-page-border: #45423a;
      }
      html[data-fpat-preset="night"] {
        --fpat-page-bg: #11161d;
        --fpat-page-surface: #1a212a;
        --fpat-page-soft: #141a22;
        --fpat-page-raised: #222b36;
        --fpat-page-text: #edf3fb;
        --fpat-page-muted: #99a8ba;
        --fpat-page-border: #334152;
      }
      html[data-fpat-theme] {
        background: var(--fpat-page-bg) !important;
      }
      html[data-fpat-skin] {
        scrollbar-width: thin;
        scrollbar-color: var(--fpat-page-border) var(--fpat-page-soft);
      }
      html[data-fpat-skin] *::-webkit-scrollbar { width: 11px; height: 11px; }
      html[data-fpat-skin] *::-webkit-scrollbar-track {
        background: var(--fpat-page-soft);
      }
      html[data-fpat-skin] *::-webkit-scrollbar-thumb {
        border: 2px solid var(--fpat-page-soft);
        border-radius: 8px;
        background: var(--fpat-page-border);
      }
      html[data-fpat-skin] *::-webkit-scrollbar-thumb:hover {
        background: var(--fpat-page-muted);
      }
      html[data-fpat-skin] *::-webkit-scrollbar-corner {
        background: var(--fpat-page-soft);
      }
      #${BACKGROUND_ID} {
        position: fixed;
        z-index: -1;
        inset: 0;
        background-color: var(--fpat-page-bg);
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        pointer-events: none;
      }
      #${BACKGROUND_ID}::after {
        content: "";
        position: absolute;
        inset: 0;
        background: var(--fpat-page-bg, #0c1013);
        opacity: var(--fpat-background-overlay, 0);
      }
      html[data-fpat-background="true"] body {
        isolation: isolate;
        background: transparent !important;
      }
      html[data-fpat-skin] body,
      html[data-fpat-skin] .wrapper,
      html[data-fpat-skin] .wrapper-content,
      html[data-fpat-skin] .wrapper-footer,
      html[data-fpat-skin] #content-body,
      html[data-fpat-skin] #content {
        background-color: var(--fpat-page-bg) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] #header {
        position: relative;
        z-index: 1200;
        overflow: visible !important;
        border-bottom: 1px solid var(--fpat-page-border);
        background: var(--fpat-page-surface) !important;
      }
      html[data-fpat-skin] #header :where(
        .container,
        .navbar,
        .navbar-default,
        .navbar-collapse,
        .navbar-header,
        .container-fluid
      ) {
        overflow: visible !important;
        background: transparent !important;
      }
      html[data-fpat-skin] #header :where(
        .navbar,
        .navbar-default,
        .navbar-collapse,
        .navbar-header,
        .dropdown-menu
      ) {
        border-color: var(--fpat-page-border) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] #header .dropdown-menu {
        z-index: 1250 !important;
        background: var(--fpat-page-surface) !important;
        box-shadow: 0 14px 34px rgba(0, 0, 0, .35);
      }
      html[data-fpat-skin] #header :where(
        a,
        button,
        .navbar-text
      ) {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] #header :where(a, button):hover {
        color: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] #header .promo-games-filter {
        overflow: visible !important;
      }
      html[data-fpat-skin] #header .promo-games-filter .form-control {
        border: 1px solid var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] #header .promo-games-filter > button[type="submit"] {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(
        .panel,
        .well,
        .modal-content,
        .chat,
        .chat-header,
        .chat-form
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-promo :where(
        .promo-games,
        .promo-games-fav,
        .promo-games-all
      ) {
        background: var(--fpat-page-bg) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-promo .cd-container {
        display: none !important;
      }
      html[data-fpat-skin] .content-promo :where(
        .content-with-cd,
        .promo-game-list
      ) {
        width: auto !important;
        max-width: none !important;
        margin-right: 0 !important;
      }
      html[data-fpat-skin] .content-promo .promo-game-list {
        margin-left: 80px !important;
      }
      html[data-fpat-skin] .promo-game-item .game-title a {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .promo-game-item ul a,
      html[data-fpat-skin] .nav-abc a {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .promo-game-item a:hover,
      html[data-fpat-skin] .nav-abc a:hover {
        color: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] .content-lots .cd-container {
        display: none !important;
      }
      html[data-fpat-skin] .content-lots .page-content-full .content-with-cd {
        width: 100% !important;
      }
      html[data-fpat-skin] .content-lots :where(
        .page-content-full,
        .block-info,
        .filter-container,
        .showcase-filters,
        .content-with-cd-wide.showcase,
        .layout-swap,
        .with-tbl-footer,
        .showcase-table,
        .tc-header,
        .tc-item
      ),
      html[data-fpat-skin] .content-orders :where(
        .tc,
        .tc-header,
        .tc-item
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-chat .chat-full {
        overflow: hidden;
        border: 1px solid var(--fpat-page-border);
        border-radius: 7px;
        background: var(--fpat-page-surface) !important;
        box-shadow: 0 18px 48px rgba(0, 0, 0, .22);
      }
      html[data-fpat-skin] .content-orders-order .chat {
        overflow: hidden;
        border: 1px solid var(--fpat-page-border) !important;
        border-radius: 7px;
        box-shadow: 0 14px 36px rgba(0, 0, 0, .2);
      }
      html[data-fpat-skin] :where(
        .chat-contacts,
        .chat,
        .chat-detail,
        .chat-empty,
        .chat-message-container,
        .chat-message-list,
        .chat-detail-list
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-contacts {
        border-right: 1px solid var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] .chat-detail {
        border-left: 1px solid var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] .chat-contacts > h1 {
        margin: 0 !important;
        padding: 20px 18px 16px !important;
        border-bottom: 1px solid var(--fpat-page-border);
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .contact-item {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .contact-item:hover {
        background: var(--fpat-page-raised) !important;
      }
      html[data-fpat-skin] .contact-item.active {
        background: color-mix(
          in srgb,
          var(--fpat-accent) 14%,
          var(--fpat-page-raised)
        ) !important;
        box-shadow: inset 3px 0 0 var(--fpat-accent);
      }
      html[data-fpat-skin] .contact-item :where(
        .media-user-name,
        .contact-item-time
      ) {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .contact-item :where(
        .contact-item-message,
        .media-user-status
      ) {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat-header,
      html[data-fpat-skin] .chat-form {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-soft) !important;
      }
      html[data-fpat-skin] .chat-header :where(
        .media-user-name,
        .media-user-name a
      ) {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-header :where(
        .media-user-status,
        .chat-msg-date
      ) {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat-message-list {
        background: var(--fpat-page-soft) !important;
      }
      html[data-fpat-skin] .chat-msg-item {
        border-color: var(--fpat-page-border) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-message > .media-user-name {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-msg-date {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat-msg-body > .chat-msg-text {
        padding: 1px 0;
        background: transparent !important;
        color: var(--fpat-page-text) !important;
        line-height: 1.5;
      }
      html[data-fpat-skin] .chat-msg-body > .alert {
        margin-bottom: 0;
      }
      html[data-fpat-skin] .chat-msg-body .alert-info {
        border: 1px solid color-mix(
          in srgb,
          var(--fpat-accent) 38%,
          var(--fpat-page-border)
        ) !important;
        background: color-mix(
          in srgb,
          var(--fpat-accent) 10%,
          var(--fpat-page-raised)
        ) !important;
        color: var(--fpat-page-text) !important;
        box-shadow: none !important;
      }
      html[data-fpat-skin] .chat-msg-body .alert-info :where(
        .chat-msg-text,
        .alert-icon
      ) {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-msg-body .alert-info .alert-icon {
        color: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] .chat-message-list-date {
        border-color: var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] .chat-message-list-date::before {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] .chat-message-list-date .inside {
        border: 1px solid var(--fpat-page-border);
        background: var(--fpat-page-soft) !important;
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat-msg-author-label {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat-detail .param-item {
        border-color: var(--fpat-page-border) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-form textarea {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-form textarea::placeholder {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .chat :where(
        .btn-gray,
        .btn-default
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .chat-empty {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .content-lots :where(
        .content-with-cd-wide.showcase,
        .layout-swap,
        .with-tbl-footer
      ) {
        outline: 0 !important;
        box-shadow: none !important;
      }
      html[data-fpat-skin] .content-lots .content-with-cd-wide.showcase {
        overflow: hidden;
        border: 1px solid var(--fpat-page-border) !important;
        border-radius: 5px;
      }
      html[data-fpat-skin] .content-lots :where(
        .filter-container,
        .showcase-filters,
        .form-inline,
        .form-group,
        .input-group,
        .btn-group
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-lots :where(
        .form-control,
        .form-control-box,
        .input-group-addon,
        .btn,
        button,
        select
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
        box-shadow: none !important;
      }
      html[data-fpat-skin] .content-lots .form-control-box.switch {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-lots .checkbox-switch > i {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] .content-lots .checkbox-switch input:checked + i {
        border-color: var(--fpat-accent) !important;
        background: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] .content-lots :where(
        .btn.active,
        .btn[aria-pressed="true"],
        .btn-primary
      ) {
        border-color: var(--fpat-accent) !important;
        background: var(--fpat-accent) !important;
        color: #fff !important;
      }
      html[data-fpat-skin] :where(
        .disabled,
        [disabled]
      ) {
        color: var(--fpat-page-muted) !important;
        opacity: .62;
      }
      html[data-fpat-skin] :where(
        input[type="checkbox"],
        input[type="radio"]
      ) {
        accent-color: var(--fpat-accent);
      }
      html[data-fpat-skin] .content-lots .counter-item {
        border: 1px solid var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, .18);
      }
      html[data-fpat-skin] .content-lots .counter-item.active {
        border-color: var(--fpat-accent) !important;
        background: color-mix(
          in srgb,
          var(--fpat-accent) 16%,
          var(--fpat-page-raised)
        ) !important;
      }
      html[data-fpat-skin] .content-lots .counter-item :where(
        .counter-param,
        .counter-value
      ) {
        color: inherit !important;
      }
      html[data-fpat-skin] .content-lots .tc-item.offer-promo {
        background: color-mix(
          in srgb,
          var(--fpat-accent) 10%,
          var(--fpat-page-surface)
        ) !important;
      }
      html[data-fpat-skin] .content-lots .showcase-table :where(
        .tc-header,
        .tc-item
      ) > div {
        border-color: var(--fpat-page-border) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-lots .showcase-table .tc-item:hover > div {
        background: var(--fpat-page-raised) !important;
      }
      html[data-fpat-skin] .content-users-user > .bg-light-color {
        background-color: var(--fpat-page-bg) !important;
      }
      html[data-fpat-skin] .content-users-user :where(
        .profile-container,
        .profile-data-container
      ) {
        background-color: transparent !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .content-users-user .offer {
        border-color: var(--fpat-page-border) !important;
        background-color: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(
        .form-control,
        input:not([type="checkbox"]):not([type="radio"]),
        textarea,
        select
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(
        h1, h2, h3, h4, h5,
        .offer-list-title,
        .tc-desc-text,
        .tc-price,
        label
      ) {
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(
        .text-muted,
        .help-block,
        small,
        .unit
      ) {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] #content-body a {
        color: color-mix(
          in srgb,
          var(--fpat-page-text) 84%,
          var(--fpat-accent)
        );
      }
      html[data-fpat-skin] #content-body a:hover {
        color: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] .btn:not(.btn-primary):not(.btn-danger) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-theme] .btn-primary {
        border-color: var(--fpat-accent) !important;
        background: var(--fpat-accent) !important;
      }
      html[data-fpat-skin] :where(
        .fp-seller-dashboard,
        .fp-seller-category,
        .fp-seller-modal
      ) {
        --fpd-accent: var(--fpat-accent);
        --fpd-accent-dark: var(--fpat-accent);
        --fpd-border: var(--fpat-page-border);
        --fpd-text: var(--fpat-page-text);
        --fpd-muted: var(--fpat-page-muted);
        --fpd-surface: var(--fpat-page-surface);
        --fpd-soft: var(--fpat-page-soft);
        --fpd-raised: var(--fpat-page-raised);
        --fpd-subtle: color-mix(
          in srgb,
          var(--fpat-page-muted) 14%,
          var(--fpat-page-surface)
        );
        --fpd-control-border: var(--fpat-page-border);
        --fpd-danger: #ee8b8b;
        --fpd-warning: #e6b65a;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) {
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
        border-color: var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] .fp-seller-dashboard {
        box-shadow: 0 12px 36px rgba(0, 0, 0, .28);
      }
      html[data-fpat-skin] .fp-seller-category {
        box-shadow: 0 5px 18px rgba(0, 0, 0, .25);
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-dashboard__header,
        .fp-seller-metrics article,
        .fp-seller-metrics-toolbar,
        .fp-seller-top,
        .fp-seller-filters,
        .fp-seller-results,
        .offer-list-title-container,
        .showcase-table,
        .fp-seller-offer,
        .fp-seller-top-item,
        .fp-seller-segmented
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-refresh:not(.fp-seller-bump),
        .fp-seller-action,
        .fp-seller-category-edit
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-refresh:not(.fp-seller-bump):not([disabled]):hover,
        .fp-seller-action:not([disabled]):hover,
        .fp-seller-category-edit:hover
      ) {
        border-color: color-mix(in srgb, var(--fpat-accent) 40%, var(--fpat-page-border)) !important;
        background: color-mix(in srgb, var(--fpat-accent) 10%, var(--fpat-page-raised)) !important;
      }
      html[data-fpat-skin] .fp-seller-delete {
        color: #ee8b8b !important;
      }
      html[data-fpat-skin] .wrapper-footer {
        border-top-color: var(--fpat-page-border) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-metrics-toolbar,
        .fp-seller-filters,
        .offer-list-title-container
      ) {
        background: var(--fpat-page-soft) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-offer:hover,
        .fp-seller-top-item,
        .fp-seller-segmented button:hover
      ) {
        background: var(--fpat-page-raised) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-refresh.fp-seller-bump,
        .fp-seller-segmented button[aria-pressed="true"]
      ) {
        border-color: var(--fpat-accent) !important;
        background: var(--fpat-accent) !important;
        color: #fff !important;
      }
      html[data-fpat-skin] :where(.fp-seller-dashboard, .fp-seller-category) :where(
        .fp-seller-offer.is-inactive,
        .fp-seller-offer.is-restored
      ) {
        background: color-mix(in srgb, var(--fpat-accent) 8%, var(--fpat-page-surface)) !important;
      }
      html[data-fpat-skin] .fp-seller-modal__dialog {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-surface) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-skin] .fp-seller-category__count {
        background: var(--fpat-page-raised) !important;
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] :where(.fp-seller-offer__sales, .fp-seller-offer__type) {
        color: var(--fpat-page-muted) !important;
      }
      html[data-fpat-skin] :where(.showcase, .profile-lots) {
        border-color: var(--fpat-page-border) !important;
        background: transparent !important;
      }
      html[data-fpat-background="true"] {
        --fpat-page-canvas: color-mix(in srgb, var(--fpat-page-surface) 92%, transparent);
        --fpat-page-canvas-soft: color-mix(in srgb, var(--fpat-page-soft) 92%, transparent);
        --fpat-page-canvas-raised: color-mix(in srgb, var(--fpat-page-raised) 92%, transparent);
      }
      html[data-fpat-background="true"] body,
      html[data-fpat-background="true"] .wrapper,
      html[data-fpat-background="true"] .wrapper-content,
      html[data-fpat-background="true"] .wrapper-footer,
      html[data-fpat-background="true"] #content-body,
      html[data-fpat-background="true"] #content {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-fpat-background="true"] #header {
        position: relative;
        z-index: 1200;
        width: 100% !important;
        background: var(--fpat-page-surface) !important;
        box-shadow: 0 1px 0 var(--fpat-page-border);
      }
      html[data-fpat-background="true"] :where(
        .content-promo .cd-container,
        .content-lots .cd-container
      ) {
        display: none !important;
      }
      html[data-fpat-background="true"] .content-promo :where(
        .content-with-cd,
        .promo-game-list
      ) {
        width: auto !important;
        max-width: none !important;
        margin-right: 0 !important;
        margin-left: 0 !important;
      }
      html[data-fpat-background="true"] .content-promo :where(
        .promo-games,
        .promo-games-fav,
        .promo-games-all
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        color: var(--fpat-page-text) !important;
        backdrop-filter: blur(10px);
      }
      html[data-fpat-background="true"] .content-lots .page-content-full {
        border-bottom: 1px solid var(--fpat-page-border);
        background: var(--fpat-page-canvas) !important;
        backdrop-filter: blur(10px);
      }
      html[data-fpat-background="true"] .content-lots .page-content-full .content-with-cd {
        width: 100% !important;
      }
      html[data-fpat-background="true"] .content-lots :where(
        .content-with-cd-wide.showcase,
        .showcase-table,
        .tc-header,
        .tc-item,
        .filter-container,
        .showcase-filters
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-background="true"] .content-lots .content-with-cd-wide.showcase {
        overflow: hidden;
        border: 1px solid var(--fpat-page-border) !important;
        border-radius: 7px;
        box-shadow: 0 18px 46px rgba(7, 11, 14, .2);
        backdrop-filter: blur(10px);
      }
      html[data-fpat-background="true"] .content-orders :where(
        .tc,
        .tc-header,
        .tc-item
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-background="true"] .content-orders .tc {
        overflow: hidden;
        border: 1px solid var(--fpat-page-border) !important;
        border-radius: 7px;
        box-shadow: 0 16px 42px rgba(7, 11, 14, .18);
        backdrop-filter: blur(10px);
      }
      html[data-fpat-background="true"] .content-orders .tc-item.info {
        background: color-mix(
          in srgb,
          #4b8ac8 14%,
          var(--fpat-page-canvas)
        ) !important;
      }
      html[data-fpat-background="true"] .content-orders .tc-item.warning {
        background: color-mix(
          in srgb,
          var(--fpat-accent) 15%,
          var(--fpat-page-canvas)
        ) !important;
      }
      html[data-fpat-background="true"] .content-chat .chat-full {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        backdrop-filter: blur(12px);
      }
      html[data-fpat-background="true"] .content-chat :where(
        .chat-contacts,
        .chat,
        .chat-detail,
        .chat-empty,
        .chat-message-container,
        .chat-message-list,
        .chat-detail-list
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-background="true"] .content-users-user :where(
        .bg-light-color,
        .offer,
        .fp-seller-dashboard,
        .fp-seller-category
      ) {
        border-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        color: var(--fpat-page-text) !important;
      }
      html[data-fpat-background="true"] .wrapper-footer {
        border-top-color: var(--fpat-page-border) !important;
        background: var(--fpat-page-canvas) !important;
        backdrop-filter: blur(10px);
      }
      html[data-fpat-density="compact"] :where(
        .content-lots .tc-item,
        .content-lots .showcase-table .tc-item > div,
        .content-orders .tc-item,
        .form-offer-editor .form-group,
        .fp-seller-offer,
        .fp-seller-top-item,
        .fp-seller-metrics article,
        .contact-item
      ) {
        padding-top: 7px !important;
        padding-bottom: 7px !important;
      }
      html[data-fpat-density="compact"] :where(.fp-seller-metrics article) {
        min-height: 0 !important;
      }
      html[data-fpat-density="spacious"] :where(
        .content-lots .tc-item,
        .content-lots .showcase-table .tc-item > div,
        .content-orders .tc-item,
        .form-offer-editor .form-group,
        .fp-seller-offer,
        .fp-seller-top-item,
        .fp-seller-metrics article,
        .contact-item
      ) {
        padding-top: 17px !important;
        padding-bottom: 17px !important;
      }
    `;
    document.head.appendChild(style);
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

  function sanitizeHex(value) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : '';
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
  }

  function revealBootstrappedPage(root) {
    if (!root.dataset.fpatBootstrap) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        delete root.dataset.fpatBootstrap;
      });
    });
  }
})();

(() => {
  const namespace = globalThis.FunPayAutomationToolbar;

  namespace.styles = `
    :host {
      --accent: #d99a16;
      --accent-strong: #a96f00;
      --bg: #eef1f3;
      --surface: #fff;
      --surface-soft: #f6f7f8;
      --surface-raised: #fff;
      --sidebar: #f7f8f9;
      --border: #dce1e4;
      --border-soft: #e8ebed;
      --text: #20262b;
      --muted: #69737b;
      --muted-soft: #8a9298;
      --danger: #b74646;
      color: var(--text);
      font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }
    :host([data-theme="dark"]) {
      --bg: #171b1f;
      --surface: #23292e;
      --surface-soft: #1d2226;
      --surface-raised: #2a3137;
      --sidebar: #1b2024;
      --border: #3b444b;
      --border-soft: #31393f;
      --text: #edf0f2;
      --muted: #aab1b6;
      --muted-soft: #858e95;
      --danger: #ee8b8b;
    }
    :host([data-preset="graphite"]) {
      --bg: #181817;
      --surface: #242422;
      --surface-soft: #1e1e1c;
      --surface-raised: #2d2c29;
      --sidebar: #1e1e1c;
      --border: #45423a;
      --border-soft: #37352f;
      --text: #f1efe9;
      --muted: #aaa69c;
      --muted-soft: #858178;
    }
    :host([data-preset="night"]) {
      --bg: #11161d;
      --surface: #1a212a;
      --surface-soft: #141a22;
      --surface-raised: #222b36;
      --sidebar: #141a22;
      --border: #334152;
      --border-soft: #293544;
      --text: #edf3fb;
      --muted: #a7b4c4;
      --muted-soft: #8190a2;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    button, input, textarea, select { font: inherit; }
    button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--accent) 27%, transparent);
      outline-offset: 2px;
    }
    .fpat-overlay {
      position: fixed;
      z-index: 2147483647;
      inset: 0;
      display: grid;
      padding: 24px;
      place-items: center;
      background: rgba(13, 17, 20, .64);
      opacity: 0;
      overscroll-behavior: contain;
      transition: opacity 160ms ease;
    }
    .fpat-overlay.is-open { opacity: 1; }
    .fpat-shell {
      position: relative;
      display: grid;
      width: min(1200px, 100%);
      height: min(820px, calc(100vh - 48px));
      min-height: 0;
      grid-template-columns: 282px minmax(0, 1fr);
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 16px;
      background: var(--surface);
      box-shadow: 0 30px 100px rgba(8, 12, 15, .42);
      transform: translateY(8px);
      transition: transform 160ms ease;
    }
    .fpat-overlay.is-open .fpat-shell { transform: translateY(0); }
    .fpat-sidebar {
      display: flex;
      min-width: 0;
      min-height: 0;
      flex-direction: column;
      border-right: 1px solid var(--border);
      background: var(--sidebar);
    }
    .fpat-brand {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 22px 20px 18px;
    }
    .fpat-brand__mark {
      display: grid;
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      font-size: 19px;
      font-weight: 800;
      box-shadow: 0 6px 15px color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .fpat-brand strong, .fpat-brand span { display: block; }
    .fpat-brand strong { font-size: 15px; letter-spacing: -.01em; }
    .fpat-brand span { margin-top: 2px; color: var(--muted); font-size: 11px; }
    .fpat-nav {
      display: grid;
      min-height: 0;
      gap: 5px;
      padding: 6px 12px 18px;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
    }
    .fpat-nav button {
      position: relative;
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr);
      align-items: center;
      min-height: 58px;
      gap: 12px;
      padding: 9px 12px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: var(--text);
      text-align: left;
      cursor: pointer;
      transition: 120ms ease;
    }
    .fpat-nav button:hover {
      border-color: var(--border-soft);
      background: var(--surface);
    }
    .fpat-nav button[aria-current="page"] {
      border-color: color-mix(in srgb, var(--accent) 38%, var(--border));
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .fpat-nav__icon {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
      color: var(--muted);
    }
    .fpat-nav__icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }
    .fpat-nav button[aria-current="page"] .fpat-nav__icon {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
    .fpat-nav__copy strong, .fpat-nav__copy span { display: block; }
    .fpat-nav__copy strong {
      overflow: hidden;
      font-size: 14px;
      font-weight: 700;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fpat-nav__copy span { margin-top: 2px; color: var(--muted); font-size: 11px; }
    .fpat-sidebar__footer {
      margin-top: auto;
      padding: 15px 20px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 11px;
    }
    .fpat-main {
      display: flex;
      min-width: 0;
      min-height: 0;
      flex-direction: column;
      background: var(--bg);
    }
    .fpat-topbar {
      display: flex;
      min-height: 70px;
      align-items: center;
      gap: 14px;
      padding: 14px 20px 14px 26px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .fpat-topbar__search {
      width: min(360px, 48%);
      height: 40px;
      padding: 0 13px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface-soft);
      color: var(--text);
    }
    .fpat-topbar__search::placeholder { color: var(--muted-soft); }
    .fpat-account {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      margin-left: auto;
      text-align: right;
    }
    .fpat-account__avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      flex: 0 0 auto;
      background: var(--surface-soft);
      border: 1px solid var(--border);
    }
    .fpat-account__info {
      display: grid;
      min-width: 0;
    }
    .fpat-account__info strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .fpat-account__info span { margin-top: 2px; color: var(--muted); font-size: 10px; white-space: nowrap; }
    .fpat-close {
      display: grid;
      width: 38px;
      height: 38px;
      padding: 0;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
      color: var(--muted);
      font-size: 20px;
      cursor: pointer;
    }
    .fpat-content {
      flex: 1 1 auto;
      min-height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 30px;
      background: var(--bg);
      scrollbar-width: thin;
      scrollbar-color: var(--border) transparent;
      /* Own GPU layer: prevents tall scrolled content from blanking out white
         when the toolbar overlays a page that uses backdrop-filter. */
      transform: translateZ(0);
    }
    .fpat-section { max-width: 980px; margin: 0 auto; }
    .fpat-section-header { margin-bottom: 22px; }
    .fpat-section-header h2 { margin: 0; font-size: 28px; letter-spacing: -.035em; }
    .fpat-section-header p { max-width: 700px; margin: 6px 0 0; color: var(--muted); font-size: 14px; }
    .fpat-section-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 22px;
    }
    .fpat-section-heading .fpat-section-header { margin-bottom: 0; }
    .fpat-grid { display: grid; gap: 16px; }
    .fpat-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .fpat-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .fpat-card {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 13px;
      background: var(--surface);
      box-shadow: 0 4px 14px rgba(15, 20, 24, .035);
    }
    .fpat-card + .fpat-card { margin-top: 16px; }
    .fpat-card__header { padding: 18px 20px 15px; border-bottom: 1px solid var(--border-soft); }
    .fpat-card__header h3 { margin: 0; font-size: 16px; }
    .fpat-card__header p { margin: 5px 0 0; color: var(--muted); font-size: 12px; }
    .fpat-card__body { display: grid; gap: 13px; padding: 18px 20px; }
    .fpat-card__footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 13px 20px;
      border-top: 1px solid var(--border-soft);
      background: var(--surface-soft);
    }
    .fpat-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 15px 18px;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
      padding: 4px 11px 4px 9px;
      border-radius: 999px;
      background: var(--surface-soft);
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .fpat-pill::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--muted-soft);
    }
    .fpat-pill.is-on {
      background: color-mix(in srgb, var(--accent) 13%, var(--surface));
      color: var(--accent-strong);
    }
    .fpat-pill.is-on::before { background: var(--accent); }
    :host([data-theme="dark"]) .fpat-pill.is-on { color: var(--accent); }
    .fpat-pill.is-good { background: color-mix(in srgb, #39794b 14%, var(--surface)); color: #39794b; }
    .fpat-pill.is-good::before { background: #39794b; }
    .fpat-pill.is-warning { background: color-mix(in srgb, #a06a00 16%, var(--surface)); color: #a06a00; }
    .fpat-pill.is-warning::before { background: #a06a00; }
    :host([data-theme="dark"]) .fpat-pill.is-good { color: #7fc99a; }
    :host([data-theme="dark"]) .fpat-pill.is-warning { color: #d6a44a; }

    /* Calculators — prominent result readouts. */
    .fpat-calc-results {
      display: grid;
      gap: 10px;
      grid-column: 1 / -1;
      margin-top: 2px;
    }
    .fpat-result {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface-soft);
    }
    .fpat-result > span { color: var(--muted); font-size: 12px; font-weight: 600; }
    .fpat-result > strong {
      font-size: 21px;
      letter-spacing: -.02em;
      font-variant-numeric: tabular-nums;
    }
    .fpat-result--primary {
      border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
      background: color-mix(in srgb, var(--accent) 7%, var(--surface));
    }
    .fpat-result--primary > strong { color: var(--accent-strong); }
    :host([data-theme="dark"]) .fpat-result--primary > strong { color: var(--accent); }

    /* Notifications — event toggle rows with icons. */
    .fpat-event {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr) auto;
      align-items: center;
      gap: 13px;
      min-height: 54px;
      padding: 9px 0;
      border-bottom: 1px solid var(--border-soft);
      cursor: pointer;
    }
    .fpat-event:last-child { border-bottom: 0; }
    .fpat-event__icon {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
      color: var(--muted);
    }
    .fpat-event input:checked ~ .fpat-event__icon,
    .fpat-event.is-on .fpat-event__icon {
      border-color: color-mix(in srgb, var(--accent) 32%, var(--border));
      background: color-mix(in srgb, var(--accent) 10%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-event.is-on .fpat-event__icon { color: var(--accent); }
    .fpat-event__icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    .fpat-event input { position: absolute; opacity: 0; pointer-events: none; }
    .fpat-event input:checked ~ .fpat-switch { background: var(--accent); }
    .fpat-event input:checked ~ .fpat-switch::after { transform: translateX(17px); }
    .fpat-event__copy { min-width: 0; font-size: 13px; }
    .fpat-range {
      width: 100%;
      height: 4px;
      margin: 9px 0;
      border-radius: 999px;
      outline: 0;
      accent-color: var(--accent);
      background: var(--border);
    }

    /* Diagnostics — state readout with status dots. */
    .fpat-stat {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      min-height: 44px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-stat:last-child { border-bottom: 0; }
    .fpat-stat > span { color: var(--muted); font-size: 13px; }
    .fpat-stat__value {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
      font-size: 13px;
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .fpat-stat__value::after {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--border);
    }
    .fpat-stat__value.is-good::after { background: #39794b; }
    .fpat-stat__value.is-warning::after { background: #a06a00; }
    .fpat-stat__value.is-plain::after { display: none; }
    /* Reusable icon-led panel header (replaces the repeated uppercase eyebrow recipe). */
    .fpat-panel-head {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
    }
    .fpat-panel-head__icon {
      display: grid;
      width: 38px;
      height: 38px;
      flex: 0 0 auto;
      place-items: center;
      border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border));
      border-radius: 10px;
      background: color-mix(in srgb, var(--accent) 9%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-panel-head__icon { color: var(--accent); }
    .fpat-panel-head__icon svg {
      width: 19px;
      height: 19px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    .fpat-panel-head__copy { min-width: 0; }
    .fpat-panel-head__copy strong { display: block; font-size: 15px; letter-spacing: -.01em; }
    .fpat-panel-head__copy span { display: block; margin-top: 2px; color: var(--muted); font-size: 12px; }

    .fpat-overview-status {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 24px;
      padding: 18px 22px;
      border: 1px solid var(--border);
      border-radius: 13px;
      background: var(--surface);
      box-shadow: inset 3px 0 0 var(--accent), 0 4px 14px rgba(15, 20, 24, .035);
    }
    .fpat-overview-status__info {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
    }
    .fpat-overview-status__icon {
      display: grid;
      width: 46px;
      height: 46px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 12px;
      background: color-mix(in srgb, var(--accent) 13%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-overview-status__icon { color: var(--accent); }
    .fpat-overview-status__icon svg {
      width: 23px;
      height: 23px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    .fpat-overview-status__text { min-width: 0; }
    .fpat-overview-status__text > span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
    }
    .fpat-overview-status__text > strong {
      display: block;
      margin-top: 3px;
      font-size: 22px;
      letter-spacing: -.02em;
    }
    .fpat-overview-status__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 7px;
      padding: 3px 9px 3px 7px;
      border-radius: 999px;
      background: var(--surface-soft);
      color: var(--muted);
      font-size: 11px;
      font-weight: 650;
    }
    .fpat-overview-status__chip::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--muted-soft);
    }
    .fpat-overview-status__chip.is-on {
      background: color-mix(in srgb, var(--accent) 13%, var(--surface));
      color: var(--accent-strong);
    }
    .fpat-overview-status__chip.is-on::before { background: var(--accent); }
    :host([data-theme="dark"]) .fpat-overview-status__chip.is-on { color: var(--accent); }
    .fpat-overview-status__actions { display: flex; align-items: center; gap: 9px; }
    .fpat-work-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
      gap: 16px;
      margin-top: 16px;
    }
    .fpat-quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .fpat-quick-action {
      display: grid;
      min-height: 112px;
      align-content: space-between;
      gap: 14px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface-soft);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }
    .fpat-quick-action:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      background: color-mix(in srgb, var(--accent) 7%, var(--surface));
    }
    .fpat-quick-action strong { display: block; font-size: 14px; }
    .fpat-quick-action span { display: block; margin-top: 4px; color: var(--muted); font-size: 11px; }
    .fpat-quick-action b { color: var(--accent-strong); font-size: 12px; }
    :host([data-theme="dark"]) .fpat-quick-action b { color: var(--accent); }
    .fpat-operation {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-operation:last-child { border-bottom: 0; }
    .fpat-operation strong, .fpat-operation span { display: block; }
    .fpat-operation strong { font-size: 13px; }
    .fpat-operation span { margin-top: 3px; color: var(--muted); font-size: 11px; }
    .fpat-operation__result { align-self: center; color: var(--text); font-size: 12px; font-weight: 700; text-align: right; }
    .fpat-operation__result.is-good { color: #39794b; }
    .fpat-operation__result.is-warning { color: #a06a00; }
    .fpat-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .fpat-metric {
      min-width: 0;
      padding: 17px;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--surface);
    }
    .fpat-metric span, .fpat-metric strong, .fpat-metric small { display: block; }
    .fpat-metric span { color: var(--muted); font-size: 10px; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; }
    .fpat-metric strong { margin-top: 8px; overflow: hidden; font-size: 21px; text-overflow: ellipsis; white-space: nowrap; }
    .fpat-metric small { margin-top: 4px; color: var(--muted-soft); font-size: 10px; }
    .fpat-field { display: grid; gap: 7px; max-width: 480px; }
    .fpat-field--wide { max-width: none; }
    .fpat-field__label { color: var(--text); font-size: 12px; font-weight: 650; }
    .fpat-field small { color: var(--muted); font-size: 10px; }
    .fpat-input, .fpat-select, .fpat-textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      outline: 0;
      background: var(--surface);
      color: var(--text);
    }
    .fpat-input, .fpat-select { height: 40px; padding: 0 11px; }
    .fpat-textarea { min-height: 90px; padding: 10px 11px; resize: vertical; }
    .fpat-switch-row {
      display: flex;
      min-height: 46px;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .fpat-switch-row__copy { flex: 1; color: var(--text); font-size: 13px; }
    .fpat-switch-row input { position: absolute; opacity: 0; pointer-events: none; }
    .fpat-switch {
      position: relative;
      width: 40px;
      height: 23px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: #bfc6ca;
      transition: background 140ms ease;
    }
    .fpat-switch::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: var(--surface);
      box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
      transition: transform 140ms ease;
    }
    .fpat-switch-row input:checked + .fpat-switch { background: var(--accent); }
    .fpat-switch-row input:checked + .fpat-switch::after { transform: translateX(17px); }
    .fpat-button {
      min-height: 39px;
      padding: 8px 14px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--text);
      font-weight: 680;
      cursor: pointer;
    }
    .fpat-button:hover { background: var(--surface-soft); }
    .fpat-button--primary { border-color: var(--accent); background: var(--accent); color: #fff; }
    .fpat-button--primary:hover { filter: brightness(.94); background: var(--accent); }
    .fpat-button--danger { border-color: color-mix(in srgb, var(--danger) 35%, var(--border)); color: var(--danger); }
    .fpat-button:disabled { cursor: default; opacity: .55; }
    .fpat-action, .fpat-status {
      display: flex;
      min-height: 56px;
      align-items: center;
      gap: 14px;
      padding: 11px 0;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-action:last-child, .fpat-status:last-child { border-bottom: 0; }
    .fpat-action__copy { flex: 1; min-width: 0; }
    .fpat-action__copy strong, .fpat-action__copy span { display: block; }
    .fpat-action__copy strong { font-size: 13px; }
    .fpat-action__copy span { margin-top: 3px; color: var(--muted); font-size: 11px; }
    .fpat-status { justify-content: space-between; }
    .fpat-status span { color: var(--muted); }
    .fpat-status strong { font-size: 12px; }
    .fpat-status .is-good { color: #39794b; }
    .fpat-status .is-warning { color: #a06a00; }
    .fpat-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .fpat-toolbar--spread { justify-content: space-between; }
    .fpat-note {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 11px 14px;
      border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border));
      border-radius: 9px;
      background: color-mix(in srgb, var(--accent) 6%, var(--surface));
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }
    .fpat-note::before {
      content: "i";
      display: grid;
      width: 19px;
      height: 19px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 50%;
      background: color-mix(in srgb, var(--accent) 17%, var(--surface));
      color: var(--accent-strong);
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px;
      font-style: italic;
      font-weight: 700;
    }
    :host([data-theme="dark"]) .fpat-note::before { color: var(--accent); }
    .fpat-section > .fpat-note { margin-top: 16px; }
    .fpat-list { display: grid; gap: 9px; }
    .fpat-list-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      padding: 13px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface-soft);
    }
    .fpat-list-item strong, .fpat-list-item span { display: block; }
    .fpat-list-item span { margin-top: 3px; color: var(--muted); font-size: 11px; white-space: pre-wrap; }
    .fpat-template-editor { display: grid; gap: 10px; padding: 15px; border: 1px solid var(--border); border-radius: 10px; }
    .fpat-preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .fpat-preset {
      min-height: 86px;
      padding: 14px;
      border: 2px solid transparent;
      border-radius: 10px;
      background: var(--surface-soft);
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }
    .fpat-preset.is-selected { border-color: var(--accent); }
    .fpat-preset strong, .fpat-preset span { display: block; }
    .fpat-preset span { margin-top: 5px; color: var(--muted); font-size: 11px; }
    .fpat-color { width: 100%; height: 40px; padding: 3px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); }
    .fpat-appearance .fpat-field { max-width: none; }
    .fpat-theme-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .fpat-theme-option {
      position: relative;
      display: grid;
      gap: 12px;
      min-width: 0;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--surface);
      color: var(--text);
      text-align: left;
      cursor: pointer;
      transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
    }
    .fpat-theme-option:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      transform: translateY(-1px);
    }
    .fpat-theme-option.is-selected {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 17%, transparent);
    }
    .fpat-theme-option__copy { display: block; padding: 0 3px 3px; }
    .fpat-theme-option__copy strong,
    .fpat-theme-option__copy span { display: block; }
    .fpat-theme-option__copy strong { font-size: 14px; }
    .fpat-theme-option__copy span { margin-top: 3px; color: var(--muted); font-size: 11px; }
    .fpat-theme-option__check {
      position: absolute;
      right: 16px;
      bottom: 18px;
      display: grid;
      width: 20px;
      height: 20px;
      place-items: center;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      opacity: 0;
      transform: scale(.8);
      transition: 120ms ease;
    }
    .fpat-theme-option.is-selected .fpat-theme-option__check {
      opacity: 1;
      transform: scale(1);
    }
    .fpat-theme-preview {
      position: relative;
      display: block;
      height: 92px;
      overflow: hidden;
      border: 1px solid #d9dee2;
      border-radius: 8px;
      background: #eef1f3;
    }
    .fpat-theme-preview i { position: absolute; display: block; }
    .fpat-theme-preview__sidebar {
      inset: 0 auto 0 0;
      width: 27%;
      background: #f8f9fa;
      border-right: 1px solid #dfe3e6;
    }
    .fpat-theme-preview__header {
      top: 0;
      right: 0;
      width: 73%;
      height: 22%;
      background: #fff;
      border-bottom: 1px solid #dfe3e6;
    }
    .fpat-theme-preview__card {
      right: 8%;
      height: 22%;
      border-radius: 4px;
      background: #fff;
      box-shadow: 0 0 0 1px #dfe3e6;
    }
    .fpat-theme-preview__card--one { top: 34%; width: 55%; }
    .fpat-theme-preview__card--two { top: 65%; width: 42%; }
    .fpat-theme-preview__accent {
      top: 31%;
      left: 8%;
      width: 11%;
      height: 14%;
      border-radius: 3px;
      background: #d99a16;
    }
    .fpat-theme-preview--graphite {
      border-color: #414950;
      background: #171b1f;
    }
    .fpat-theme-preview--graphite .fpat-theme-preview__sidebar { border-color: #394147; background: #1b2024; }
    .fpat-theme-preview--graphite .fpat-theme-preview__header,
    .fpat-theme-preview--graphite .fpat-theme-preview__card { border-color: #394147; background: #252c31; box-shadow: 0 0 0 1px #394147; }
    .fpat-theme-preview--graphite .fpat-theme-preview__accent { background: #e0a329; }
    .fpat-theme-preview--night {
      border-color: #334152;
      background: #11161d;
    }
    .fpat-theme-preview--night .fpat-theme-preview__sidebar { border-color: #334152; background: #141a22; }
    .fpat-theme-preview--night .fpat-theme-preview__header,
    .fpat-theme-preview--night .fpat-theme-preview__card { border-color: #334152; background: #222b36; box-shadow: 0 0 0 1px #334152; }
    .fpat-theme-preview--night .fpat-theme-preview__accent { background: #7da8ff; }
    .fpat-current-theme {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface-soft);
    }
    .fpat-current-theme > span {
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
      border: 3px solid var(--surface);
      border-radius: 50%;
      box-shadow: 0 0 0 1px var(--border);
    }
    .fpat-current-theme strong,
    .fpat-current-theme div span { display: block; }
    .fpat-current-theme strong { font-size: 13px; }
    .fpat-current-theme div span { margin-top: 2px; color: var(--muted); font-size: 10px; }
    .fpat-color-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .fpat-color-control .fpat-color { width: 58px; flex: 0 0 auto; }
    .fpat-color-control > span {
      color: var(--muted);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    .fpat-color-reset {
      min-height: 34px;
      margin-left: auto;
      padding: 6px 11px;
      font-size: 11px;
    }
    .fpat-palette-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .fpat-mini-color {
      display: flex;
      min-height: 40px;
      align-items: center;
      gap: 9px;
      padding: 4px 9px 4px 4px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
    }
    .fpat-mini-color input {
      width: 42px;
      height: 30px;
      flex: 0 0 auto;
      padding: 2px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
    }
    .fpat-mini-color span {
      overflow: hidden;
      color: var(--muted);
      font-size: 10px;
      font-variant-numeric: tabular-nums;
      text-overflow: ellipsis;
    }
    .fpat-background-preview {
      position: relative;
      min-height: 112px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 10px;
      background-color: var(--surface-soft);
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
    }
    .fpat-background-preview::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 35%, rgba(11, 15, 18, .62));
    }
    .fpat-background-preview.is-empty::after { display: none; }
    .fpat-background-preview > span {
      position: absolute;
      z-index: 1;
      right: 12px;
      bottom: 10px;
      left: 12px;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }
    .fpat-background-preview.is-empty {
      display: grid;
      place-items: center;
      background:
        linear-gradient(135deg, var(--surface-soft), var(--surface));
    }
    .fpat-background-preview.is-empty > span {
      position: static;
      color: var(--muted);
      font-weight: 600;
    }
    .fpat-background-clear {
      width: 100%;
      min-height: 36px;
    }
    .fpat-saved-theme-toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
    }
    .fpat-saved-theme-toolbar .fpat-input { max-width: none; }
    .fpat-saved-theme-list {
      display: grid;
      gap: 9px;
      margin-top: 14px;
    }
    .fpat-saved-theme-empty {
      padding: 20px;
      border: 1px dashed var(--border);
      border-radius: 9px;
      color: var(--muted);
      font-size: 11px;
      text-align: center;
    }
    .fpat-saved-theme {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 13px;
      min-height: 58px;
      padding: 9px 10px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface-soft);
    }
    .fpat-saved-theme__swatches {
      display: flex;
      padding-left: 8px;
    }
    .fpat-saved-theme__swatches i {
      width: 25px;
      height: 25px;
      margin-left: -8px;
      border: 2px solid var(--surface);
      border-radius: 50%;
      box-shadow: 0 0 0 1px var(--border);
    }
    .fpat-saved-theme strong,
    .fpat-saved-theme span { display: block; }
    .fpat-saved-theme strong { font-size: 12px; }
    .fpat-saved-theme div > span {
      margin-top: 2px;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-saved-theme__actions {
      display: flex;
      gap: 7px;
    }
    .fpat-saved-theme__actions .fpat-button {
      min-height: 32px;
      padding: 5px 10px;
      font-size: 10px;
    }
    .fpat-offers-bump {
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--accent) 34%, var(--border));
      border-radius: 15px;
      background: var(--surface);
      box-shadow: 0 7px 24px rgba(15, 20, 24, .055);
    }
    .fpat-offers-bump__main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 28px;
      min-height: 142px;
      padding: 26px 28px 24px;
      background:
        radial-gradient(circle at 86% 20%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 34%),
        linear-gradient(125deg, color-mix(in srgb, var(--accent) 10%, var(--surface)), var(--surface) 58%);
    }
    .fpat-offers-eyebrow {
      color: var(--accent-strong);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .075em;
      text-transform: uppercase;
    }
    :host([data-theme="dark"]) .fpat-offers-eyebrow { color: var(--accent); }
    .fpat-offers-bump__copy h3 {
      margin: 7px 0 0;
      font-size: 27px;
      letter-spacing: -.035em;
      line-height: 1.16;
    }
    .fpat-offers-bump__copy p {
      max-width: 590px;
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .fpat-offers-bump__button {
      min-width: 164px;
      min-height: 44px;
      box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 24%, transparent);
    }
    .fpat-offers-bump.is-running .fpat-offers-bump__button {
      box-shadow: none;
    }
    .fpat-offers-bump__footer {
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .fpat-offers-bump__footer .fpat-switch-row { min-height: 42px; }
    .fpat-offers-bump__hint {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 400;
    }
    .fpat-offers-multipost { margin-top: 16px; }
    .fpat-offers-multipost .fpat-card__body { gap: 18px; }
    .fpat-offers-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface-soft);
    }
    .fpat-offers-summary > div {
      min-width: 0;
      padding: 13px 15px;
      border-right: 1px solid var(--border);
    }
    .fpat-offers-summary > div:last-child { border-right: 0; }
    .fpat-offers-summary span,
    .fpat-offers-summary strong { display: block; }
    .fpat-offers-summary span {
      color: var(--muted);
      font-size: 9px;
      font-weight: 750;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .fpat-offers-summary strong {
      margin-top: 5px;
      overflow: hidden;
      font-size: 13px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fpat-offers-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .fpat-offers-fields .fpat-field { max-width: none; }
    .fpat-input-suffix {
      position: relative;
      display: flex;
      align-items: center;
    }
    .fpat-input-suffix .fpat-input { padding-right: 48px; }
    .fpat-input-suffix > span {
      position: absolute;
      right: 11px;
      color: var(--muted);
      font-size: 10px;
      pointer-events: none;
    }
    .fpat-offers-safety {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 18px;
      padding: 15px 16px;
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
      border-radius: 10px;
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
    }
    .fpat-offers-safety strong,
    .fpat-offers-safety span { display: block; }
    .fpat-offers-safety strong { font-size: 12px; }
    .fpat-offers-safety > div > span {
      max-width: 430px;
      margin-top: 4px;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.45;
    }
    .fpat-offers-safety .fpat-switch-row {
      min-width: 190px;
      min-height: 40px;
    }
    .fpat-offers-safety .fpat-switch-row__copy { font-size: 11px; }
    .fpat-multipost-presets {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
    }
    .fpat-multipost-presets__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding: 16px;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-multipost-presets__header h4 {
      margin: 0;
      font-size: 14px;
    }
    .fpat-multipost-presets__header p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.45;
    }
    .fpat-multipost-presets__tools {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--surface-soft);
    }
    .fpat-multipost-presets__list {
      display: grid;
      gap: 8px;
      padding: 12px 16px 16px;
    }
    .fpat-multipost-presets__empty {
      display: block;
      padding: 12px 4px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.45;
    }
    .fpat-multipost-preset {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      padding: 13px 14px;
      border: 1px solid var(--border-soft);
      border-radius: 9px;
      background: var(--surface);
    }
    .fpat-multipost-preset strong,
    .fpat-multipost-preset span,
    .fpat-multipost-preset small { display: block; }
    .fpat-multipost-preset strong { font-size: 12px; }
    .fpat-multipost-preset span {
      margin-top: 2px;
      color: var(--accent-strong);
      font-size: 10px;
      font-weight: 700;
    }
    :host([data-theme="dark"]) .fpat-multipost-preset span {
      color: var(--accent);
    }
    .fpat-multipost-preset small {
      margin-top: 4px;
      overflow: hidden;
      color: var(--muted);
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fpat-multipost-preset-editor {
      display: grid;
      gap: 14px;
      padding: 16px;
      border-top: 1px solid var(--border);
      background: color-mix(in srgb, var(--accent) 3%, var(--surface-soft));
    }
    .fpat-multipost-preset-editor[hidden] { display: none; }
    .fpat-multipost-preset-editor__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }
    .fpat-multipost-preset-editor__header strong,
    .fpat-multipost-preset-editor__header span { display: block; }
    .fpat-multipost-preset-editor__header strong { font-size: 14px; }
    .fpat-multipost-preset-editor__header span {
      margin-top: 3px;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-multipost-preset-editor__meta {
      margin-top: -8px;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-multipost-preset-editor__picker {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(250px, .8fr);
      min-height: 230px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
    }
    .fpat-multipost-preset-editor__results,
    .fpat-multipost-preset-editor__selection {
      max-height: 280px;
      overflow-y: auto;
      padding: 8px;
    }
    .fpat-multipost-preset-editor__results {
      border-right: 1px solid var(--border);
    }
    .fpat-multipost-preset-option {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 34px;
      padding: 7px 8px;
      border-bottom: 1px solid var(--border-soft);
      border-radius: 6px;
      color: var(--text);
      font-size: 11px;
      cursor: pointer;
    }
    .fpat-multipost-preset-option:hover { background: var(--surface-soft); }
    .fpat-multipost-preset-option input {
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
      accent-color: var(--accent);
    }
    .fpat-multipost-preset-editor__selection-title {
      padding: 5px 6px 10px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 750;
      text-transform: uppercase;
    }
    .fpat-multipost-preset-selected {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
      padding: 8px 9px;
      border: 1px solid var(--border-soft);
      border-radius: 7px;
      background: var(--surface-soft);
      font-size: 10px;
    }
    .fpat-multipost-preset-selected button {
      width: 22px;
      height: 22px;
      flex: 0 0 auto;
      padding: 0;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: var(--muted);
      font-size: 17px;
      cursor: pointer;
    }
    .fpat-multipost-preset-selected button:hover {
      background: var(--surface);
      color: var(--danger);
    }
    .fpat-message-greeting {
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
      border-radius: 15px;
      background: var(--surface);
      box-shadow: 0 7px 24px rgba(15, 20, 24, .05);
    }
    .fpat-message-greeting__hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 24px;
      min-height: 128px;
      padding: 24px 26px;
      background:
        radial-gradient(circle at 86% 14%, color-mix(in srgb, var(--accent) 17%, transparent), transparent 35%),
        linear-gradient(125deg, color-mix(in srgb, var(--accent) 9%, var(--surface)), var(--surface) 58%);
    }
    .fpat-message-eyebrow {
      display: block;
      color: var(--accent-strong);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .075em;
      text-transform: uppercase;
    }
    :host([data-theme="dark"]) .fpat-message-eyebrow { color: var(--accent); }
    .fpat-message-greeting__copy h3 {
      margin: 7px 0 0;
      font-size: 25px;
      letter-spacing: -.03em;
    }
    .fpat-message-greeting__copy p {
      max-width: 620px;
      margin: 7px 0 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }
    .fpat-message-greeting__master {
      min-width: 225px;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
    }
    .fpat-message-greeting.is-enabled .fpat-message-greeting__master {
      border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
      background: color-mix(in srgb, var(--accent) 7%, var(--surface));
    }
    .fpat-message-greeting__workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(270px, .65fr);
      border-top: 1px solid var(--border);
    }
    .fpat-message-composer,
    .fpat-message-rules {
      min-width: 0;
      padding: 20px 22px 22px;
    }
    .fpat-message-composer { border-right: 1px solid var(--border); }
    .fpat-message-rules {
      display: grid;
      align-content: start;
      gap: 14px;
      background: var(--surface-soft);
    }
    .fpat-message-block-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 13px;
    }
    .fpat-message-block-heading strong,
    .fpat-message-block-heading span { display: block; }
    .fpat-message-block-heading strong { font-size: 13px; }
    .fpat-message-block-heading span,
    .fpat-message-block-heading small {
      margin-top: 3px;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-message-composer__input {
      min-height: 118px;
      max-width: none;
      line-height: 1.5;
    }
    .fpat-message-variables {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
    }
    .fpat-message-variables > span {
      margin-right: 2px;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-message-variables button {
      min-height: 25px;
      padding: 4px 8px;
      border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
      border-radius: 6px;
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
      color: var(--accent-strong);
      font: inherit;
      font-size: 9px;
      font-weight: 700;
      cursor: pointer;
    }
    :host([data-theme="dark"]) .fpat-message-variables button {
      color: var(--accent);
    }
    .fpat-message-variables button:hover {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 10%, var(--surface));
    }
    .fpat-message-preview {
      margin-top: 16px;
      padding: 13px;
      border: 1px solid var(--border-soft);
      border-radius: 10px;
      background: var(--surface-soft);
    }
    .fpat-message-preview__label {
      display: block;
      margin-bottom: 9px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 750;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .fpat-message-preview__chat {
      display: grid;
      grid-template-columns: 30px minmax(0, 1fr);
      align-items: end;
      gap: 8px;
    }
    .fpat-message-preview__avatar {
      display: grid;
      width: 30px;
      height: 30px;
      place-items: center;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
    }
    .fpat-message-preview__bubble {
      width: fit-content;
      max-width: 90%;
      padding: 9px 11px;
      border: 1px solid var(--border);
      border-radius: 10px 10px 10px 3px;
      background: var(--surface);
      color: var(--text);
      font-size: 11px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .fpat-message-rule {
      min-height: 64px;
      padding: 9px 11px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
    }
    .fpat-message-rule__hint {
      display: block;
      margin-top: 3px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 400;
      line-height: 1.4;
    }
    .fpat-message-delay { max-width: none; }
    .fpat-message-local-note {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      align-items: start;
      gap: 10px;
      padding: 12px;
      border: 1px solid color-mix(in srgb, var(--accent) 23%, var(--border));
      border-radius: 9px;
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
    }
    .fpat-message-local-note > span {
      display: grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border-radius: 8px;
      background: color-mix(in srgb, var(--accent) 13%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-message-local-note > span {
      color: var(--accent);
    }
    .fpat-message-local-note svg,
    .fpat-message-template__icon svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }
    .fpat-message-local-note strong,
    .fpat-message-local-note p { display: block; }
    .fpat-message-local-note strong { font-size: 10px; }
    .fpat-message-local-note p {
      margin: 3px 0 0;
      color: var(--muted);
      font-size: 9px;
      line-height: 1.45;
    }
    .fpat-message-library {
      overflow: hidden;
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: 15px;
      background: var(--surface);
      box-shadow: 0 4px 14px rgba(15, 20, 24, .035);
    }
    .fpat-message-library__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 22px 17px;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-message-library__header h3 {
      margin: 5px 0 0;
      font-size: 17px;
    }
    .fpat-message-library__header p {
      margin: 5px 0 0;
      color: var(--muted);
      font-size: 11px;
    }
    .fpat-message-library__tools {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 190px) auto;
      align-items: center;
      gap: 12px;
      padding: 12px 22px;
      border-bottom: 1px solid var(--border-soft);
      background: var(--surface-soft);
    }
    .fpat-message-library__tools > span {
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
    }
    .fpat-message-template-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 16px 22px 22px;
    }
    .fpat-message-template {
      display: grid;
      min-width: 0;
      min-height: 178px;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
      padding: 15px;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--surface);
      transition: border-color 140ms ease, transform 140ms ease;
    }
    .fpat-message-template:hover {
      border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
      transform: translateY(-1px);
    }
    .fpat-message-template__top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
    }
    .fpat-message-template.is-pinned {
      border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .fpat-message-template.is-draggable { cursor: grab; }
    .fpat-message-template.is-dragging { opacity: .4; cursor: grabbing; }
    .fpat-message-template.is-drop-target {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent);
    }
    .fpat-message-template__pin {
      display: grid;
      width: 30px;
      height: 30px;
      flex: 0 0 auto;
      place-items: center;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      color: var(--muted-soft);
      cursor: pointer;
      transition: 120ms ease;
    }
    .fpat-message-template__pin:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      color: var(--accent-strong);
    }
    .fpat-message-template__pin svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.6;
    }
    .fpat-message-template__pin.is-pinned {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
      color: var(--accent-strong);
    }
    .fpat-message-template__pin.is-pinned svg { fill: currentColor; }
    :host([data-theme="dark"]) .fpat-message-template__pin.is-pinned,
    :host([data-theme="dark"]) .fpat-message-template__pin:hover { color: var(--accent); }
    .fpat-message-template__icon {
      display: grid;
      width: 36px;
      height: 36px;
      place-items: center;
      border-radius: 9px;
      background: color-mix(in srgb, var(--accent) 10%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-message-template__icon {
      color: var(--accent);
    }
    .fpat-message-template__top strong,
    .fpat-message-template__top span { display: block; }
    .fpat-message-template__top strong {
      overflow: hidden;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .fpat-message-template__top span {
      margin-top: 2px;
      color: var(--muted);
      font-size: 9px;
    }
    .fpat-message-template > p {
      display: -webkit-box;
      margin: 0;
      overflow: hidden;
      color: var(--muted);
      font-size: 10px;
      line-height: 1.55;
      white-space: pre-wrap;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }
    .fpat-message-template__actions {
      display: flex;
      justify-content: flex-end;
      gap: 7px;
      padding-top: 11px;
      border-top: 1px solid var(--border-soft);
    }
    .fpat-message-template__actions .fpat-button {
      min-height: 32px;
      padding: 5px 10px;
      font-size: 10px;
    }
    .fpat-message-template-empty {
      grid-column: 1 / -1;
      padding: 30px 20px;
      border: 1px dashed var(--border);
      border-radius: 10px;
      color: var(--muted);
      text-align: center;
    }
    .fpat-message-template-empty strong,
    .fpat-message-template-empty span { display: block; }
    .fpat-message-template-empty strong {
      color: var(--text);
      font-size: 13px;
    }
    .fpat-message-template-empty span {
      margin-top: 4px;
      font-size: 10px;
    }
    .fpat-message-editor {
      border-top: 1px solid var(--border);
      background: color-mix(in srgb, var(--accent) 3%, var(--surface-soft));
    }
    .fpat-message-editor[hidden] { display: none; }
    .fpat-message-editor__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--border-soft);
    }
    .fpat-message-editor__header h4 {
      margin: 5px 0 0;
      font-size: 16px;
    }
    .fpat-message-editor__header p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 10px;
    }
    .fpat-message-editor__workspace {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr);
      gap: 16px;
      padding: 18px 22px;
    }
    .fpat-message-editor__fields {
      display: grid;
      align-content: start;
      gap: 13px;
    }
    .fpat-message-editor__field { max-width: none; }
    .fpat-message-editor__textarea { min-height: 135px; }
    .fpat-message-editor__preview {
      align-self: stretch;
      margin-top: 0;
    }
    .fpat-message-editor__footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 13px 22px;
      border-top: 1px solid var(--border-soft);
      background: var(--surface);
    }
    .fpat-upload {
      display: flex;
      width: 100%;
      min-height: 70px;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px dashed color-mix(in srgb, var(--accent) 42%, var(--border));
      border-radius: 9px;
      background: color-mix(in srgb, var(--accent) 5%, var(--surface));
      color: var(--text);
      text-align: left;
      cursor: pointer;
    }
    .fpat-upload:hover { background: color-mix(in srgb, var(--accent) 9%, var(--surface)); }
    .fpat-upload__icon {
      display: grid;
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      place-items: center;
      border-radius: 8px;
      background: var(--accent);
      color: #fff;
      font-size: 19px;
      font-weight: 700;
    }
    .fpat-upload strong,
    .fpat-upload small { display: block; }
    .fpat-upload strong { font-size: 13px; }
    .fpat-upload small { margin-top: 3px; color: var(--muted); font-size: 10px; }
    .fpat-output { padding: 14px; border-radius: 9px; background: var(--surface-soft); }
    .fpat-output span, .fpat-output strong { display: block; }
    .fpat-output span { color: var(--muted); font-size: 11px; }
    .fpat-output strong { margin-top: 3px; font-size: 19px; }
    .fpat-toast {
      position: absolute;
      right: 24px;
      bottom: 22px;
      max-width: 380px;
      padding: 12px 15px;
      border-radius: 9px;
      background: #30373c;
      color: #fff;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .25);
      opacity: 0;
      pointer-events: none;
      transform: translateY(6px);
      transition: 150ms ease;
    }
    .fpat-toast.is-visible { opacity: 1; transform: translateY(0); }
    .fpat-confirm {
      position: absolute;
      z-index: 4;
      inset: -1px;
      display: grid;
      padding: 20px;
      place-items: center;
      border-radius: inherit;
      background: rgba(16, 20, 23, .55);
    }
    .fpat-shell.is-confirming {
      border-color: transparent;
      background-clip: padding-box;
      outline: 0;
    }
    .fpat-confirm__dialog {
      width: min(430px, 100%);
      padding: 21px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      box-shadow: 0 22px 60px rgba(0, 0, 0, .28);
    }
    .fpat-confirm__dialog h3 { margin: 0; font-size: 18px; }
    .fpat-confirm__dialog p { margin: 8px 0 18px; color: var(--muted); }
    .fpat-confirm__actions { display: flex; justify-content: flex-end; gap: 8px; }
    .fpat-help details { border-bottom: 1px solid var(--border-soft); }
    .fpat-help details:last-child { border-bottom: 0; }
    .fpat-help summary {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px 2px;
      font-weight: 650;
      list-style: none;
      cursor: pointer;
    }
    .fpat-help summary::-webkit-details-marker { display: none; }
    .fpat-help summary::after {
      content: "";
      width: 9px;
      height: 9px;
      margin-left: auto;
      border-right: 2px solid var(--muted-soft);
      border-bottom: 2px solid var(--muted-soft);
      transform: rotate(45deg);
      transition: transform 160ms ease;
    }
    .fpat-help details[open] summary::after { transform: rotate(-135deg); }
    .fpat-help summary:hover { color: var(--accent-strong); }
    :host([data-theme="dark"]) .fpat-help summary:hover { color: var(--accent); }
    .fpat-help details > div { padding: 0 0 16px; color: var(--muted); font-size: 13px; line-height: 1.55; }
    .fpat-help p, .fpat-help ul, .fpat-help ol { margin: 7px 0; }
    .fpat-help code { padding: 1px 4px; border-radius: 4px; background: var(--surface-soft); }
    .fpat-help-steps {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: fpat-step;
    }
    .fpat-help-steps li {
      display: grid;
      grid-template-columns: 26px minmax(0, 1fr);
      align-items: center;
      gap: 12px;
      counter-increment: fpat-step;
    }
    .fpat-help-steps li::before {
      content: counter(fpat-step);
      display: grid;
      width: 26px;
      height: 26px;
      place-items: center;
      border-radius: 8px;
      background: color-mix(in srgb, var(--accent) 12%, var(--surface));
      color: var(--accent-strong);
      font-size: 12px;
      font-weight: 800;
    }
    :host([data-theme="dark"]) .fpat-help-steps li::before { color: var(--accent); }
    :host([data-density="compact"]) .fpat-content { padding: 22px; }
    :host([data-density="compact"]) .fpat-card__body { padding-block: 13px; }
    :host([data-density="compact"]) .fpat-nav button { min-height: 50px; }
    :host([data-density="spacious"]) .fpat-content { padding: 40px; }
    :host([data-density="spacious"]) .fpat-card__body { padding-block: 24px; gap: 16px; }
    :host([data-density="spacious"]) .fpat-nav button { min-height: 66px; }
    .fpat-appearance .fpat-grid--2 { align-items: start; }
    .fpat-segment {
      display: flex;
      width: 100%;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
    }
    .fpat-segment button {
      flex: 1;
      min-width: 0;
      min-height: 40px;
      padding: 8px 6px;
      border: 0;
      border-right: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 120ms ease, color 120ms ease;
    }
    .fpat-segment button:last-child { border-right: 0; }
    .fpat-segment button:hover:not([aria-pressed="true"]) { background: var(--surface-soft); }
    .fpat-segment button[aria-pressed="true"] {
      background: color-mix(in srgb, var(--accent) 14%, var(--surface));
      color: var(--accent-strong);
    }
    :host([data-theme="dark"]) .fpat-segment button[aria-pressed="true"] { color: var(--accent); }
    @media (max-width: 900px) {
      .fpat-overlay { padding: 10px; }
      .fpat-shell { height: calc(100vh - 20px); grid-template-columns: 82px minmax(0, 1fr); }
      .fpat-brand > div:last-child, .fpat-nav__copy, .fpat-sidebar__footer { display: none; }
      .fpat-brand { justify-content: center; padding-inline: 10px; }
      .fpat-nav button { grid-template-columns: 1fr; justify-items: center; padding-inline: 6px; }
      .fpat-content { padding: 18px; }
      .fpat-grid--2, .fpat-grid--3, .fpat-metrics, .fpat-work-grid, .fpat-appearance-grid { grid-template-columns: 1fr; }
      .fpat-overview-status { grid-template-columns: 1fr; }
      .fpat-overview-status__actions { width: 100%; }
      .fpat-overview-status__actions .fpat-button { flex: 1; }
      .fpat-message-greeting__workspace,
      .fpat-message-editor__workspace { grid-template-columns: 1fr; }
      .fpat-message-composer {
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
    }
    @media (max-width: 600px) {
      .fpat-shell { grid-template-columns: 68px minmax(0, 1fr); }
      .fpat-topbar { padding-inline: 14px; }
      .fpat-topbar__search { width: 100%; }
      .fpat-account { display: none; }
      .fpat-quick-grid, .fpat-preset-grid, .fpat-theme-grid { grid-template-columns: 1fr; }
      .fpat-section-heading { align-items: stretch; flex-direction: column; }
      .fpat-offers-bump__main,
      .fpat-offers-safety { grid-template-columns: 1fr; }
      .fpat-offers-bump__main { padding: 22px 20px; }
      .fpat-offers-bump__actions,
      .fpat-offers-bump__button { width: 100%; }
      .fpat-offers-fields,
      .fpat-offers-summary { grid-template-columns: 1fr; }
      .fpat-offers-summary > div {
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
      .fpat-offers-summary > div:last-child { border-bottom: 0; }
      .fpat-multipost-presets__header,
      .fpat-multipost-preset,
      .fpat-multipost-preset-editor__header {
        align-items: stretch;
        grid-template-columns: 1fr;
        flex-direction: column;
      }
      .fpat-multipost-preset-editor__picker { grid-template-columns: 1fr; }
      .fpat-multipost-preset-editor__results {
        border-right: 0;
        border-bottom: 1px solid var(--border);
      }
      .fpat-message-greeting__hero {
        grid-template-columns: 1fr;
        padding: 22px 20px;
      }
      .fpat-message-greeting__master { min-width: 0; }
      .fpat-message-library__header,
      .fpat-message-editor__header {
        align-items: stretch;
        flex-direction: column;
      }
      .fpat-message-template-grid { grid-template-columns: 1fr; }
      .fpat-message-library__tools { grid-template-columns: 1fr; }
      .fpat-message-library__tools > span { justify-self: start; }
      .fpat-message-template__actions { justify-content: stretch; }
      .fpat-message-template__actions .fpat-button { flex: 1; }
      .fpat-palette-grid,
      .fpat-saved-theme-toolbar { grid-template-columns: 1fr; }
      .fpat-saved-theme {
        align-items: flex-start;
        grid-template-columns: auto minmax(0, 1fr);
      }
      .fpat-saved-theme__actions {
        grid-column: 1 / -1;
        justify-content: stretch;
      }
      .fpat-saved-theme__actions .fpat-button { flex: 1; }
    }
  `;
})();

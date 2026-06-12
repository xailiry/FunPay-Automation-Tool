(() => {
  const namespace = globalThis.FunPayAutomationToolbar;

  namespace.Components = Object.freeze({
    action,
    button,
    card,
    checkbox,
    field,
    metric,
    number,
    sectionHeader,
    select,
    status,
    text,
    textarea
  });

  function element(tag, className, textContent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  }

  function sectionHeader(title, description) {
    const header = element('header', 'fpat-section-header');
    header.append(
      element('h2', '', title),
      element('p', '', description)
    );
    return header;
  }

  function card(title, description) {
    const node = element('section', 'fpat-card');
    if (title) {
      const header = element('div', 'fpat-card__header');
      header.append(element('h3', '', title));
      if (description) header.append(element('p', '', description));
      node.append(header);
    }
    return node;
  }

  function field(label, control, hint = '') {
    const wrapper = element('label', 'fpat-field');
    wrapper.append(element('span', 'fpat-field__label', label), control);
    if (hint) wrapper.append(element('small', '', hint));
    return wrapper;
  }

  function text(value = '', placeholder = '') {
    const input = element('input', 'fpat-input');
    input.type = 'text';
    input.value = value;
    input.placeholder = placeholder;
    return input;
  }

  function number(value = 0, options = {}) {
    const input = element('input', 'fpat-input');
    input.type = 'number';
    input.value = String(value);
    if (options.min !== undefined) input.min = String(options.min);
    if (options.max !== undefined) input.max = String(options.max);
    if (options.step !== undefined) input.step = String(options.step);
    return input;
  }

  function textarea(value = '', placeholder = '') {
    const input = element('textarea', 'fpat-textarea');
    input.value = value;
    input.placeholder = placeholder;
    return input;
  }

  function select(value, options) {
    const input = element('select', 'fpat-select');
    options.forEach(([optionValue, label]) => {
      const option = element('option', '', label);
      option.value = optionValue;
      option.selected = optionValue === value;
      input.append(option);
    });
    return input;
  }

  function checkbox(label, checked = false) {
    const wrapper = element('label', 'fpat-switch-row');
    const copy = element('span', 'fpat-switch-row__copy', label);
    const input = element('input');
    input.type = 'checkbox';
    input.checked = Boolean(checked);
    const track = element('span', 'fpat-switch');
    wrapper.append(copy, input, track);
    return { wrapper, input };
  }

  function button(label, variant = 'secondary') {
    const node = element('button', `fpat-button fpat-button--${variant}`, label);
    node.type = 'button';
    return node;
  }

  function action(title, description, label) {
    const row = element('div', 'fpat-action');
    const copy = element('div', 'fpat-action__copy');
    copy.append(element('strong', '', title), element('span', '', description));
    const control = button(label);
    row.append(copy, control);
    return { row, control };
  }

  function metric(label, value, detail = '') {
    const node = element('article', 'fpat-metric');
    node.append(
      element('span', '', label),
      element('strong', '', value),
      element('small', '', detail)
    );
    return node;
  }

  function status(label, value, tone = '') {
    const row = element('div', 'fpat-status');
    row.append(
      element('span', '', label),
      element('strong', tone ? `is-${tone}` : '', value)
    );
    return row;
  }
})();

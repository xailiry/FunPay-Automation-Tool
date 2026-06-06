(() => {
  const namespace = globalThis.FunPayAutomation ||= {};

  namespace.TargetFormAdapter = class TargetFormAdapter {
    constructor(FormDataClass = FormData) {
      this.FormDataClass = FormDataClass;
    }

    build(sourceForm, targetForm, targetCategory, overrides = {}) {
      const formData = new this.FormDataClass(targetForm);
      const sourceGroups = groupFieldsByName(getUserFields(sourceForm));
      const targetGroups = groupFieldsByName(getUserFields(targetForm));
      const sourceEntries = [...sourceGroups];
      const transferredSourceNames = new Set();
      const transferredTargetNames = [];

      for (const [targetName, targetControls] of targetGroups) {
        const sourceEntry =
          sourceGroups.has(targetName)
            ? [targetName, sourceGroups.get(targetName)]
            : findCompatibleSourceEntry(
              targetControls,
              sourceEntries,
              transferredSourceNames
            );

        if (!sourceEntry) continue;

        const [sourceName, sourceControls] = sourceEntry;
        replaceTargetValues({
          formData,
          targetForm,
          targetName,
          sourceControls
        });
        transferredSourceNames.add(sourceName);
        transferredTargetNames.push(targetName);
      }

      const forcedPersistent = keepServiceOfferActive({
        formData,
        targetForm,
        targetCategory
      });
      applyOverrides(formData, targetForm, overrides);
      removeInactiveDeliveryGoods(formData, targetForm);

      formData.set('node_id', targetCategory.nodeId);

      return {
        formData,
        report: {
          transferredFields: transferredTargetNames,
          droppedFields: [...sourceGroups.keys()].filter(
            (name) => !transferredSourceNames.has(name)
          ),
          forcedPersistent,
          overriddenFields: Object.keys(overrides || {})
        }
      };
    }

    createDraft(sourceForm, targetForm, targetCategory, overrides = {}) {
      const { formData } = this.build(
        sourceForm,
        targetForm,
        targetCategory,
        overrides
      );

      return [...getEditableGroups(targetForm)]
        .map(([name, controls]) =>
          createDraftField(name, controls, formData)
        )
        .filter(Boolean);
    }
  };

  function getUserFields(form) {
    return [...form.elements].filter((control) => {
      if (!control.name || control.disabled) return false;

      const type = (control.type || '').toLowerCase();
      return !['hidden', 'button', 'submit', 'reset'].includes(type);
    });
  }

  function groupFieldsByName(fields) {
    const groups = new Map();

    for (const field of fields) {
      if (!groups.has(field.name)) groups.set(field.name, []);
      groups.get(field.name).push(field);
    }

    return groups;
  }

  function findCompatibleSourceEntry(
    targetControls,
    sourceEntries,
    transferredSourceNames
  ) {
    const semanticKey = getGroupSemanticKey(targetControls);
    if (!semanticKey) return null;

    const languageKey = getGroupLanguageKey(targetControls);
    const semanticMatches = sourceEntries.filter(([, controls]) =>
      getGroupSemanticKey(controls) === semanticKey
    );
    const availableMatches = semanticMatches.filter(
      ([name]) => !transferredSourceNames.has(name)
    );
    const candidates =
      availableMatches.length > 0 ? availableMatches : semanticMatches;

    if (languageKey) {
      const languageMatch = candidates.find(([, controls]) =>
        getGroupLanguageKey(controls) === languageKey
      );
      if (languageMatch) return languageMatch;
    }

    return (
      candidates.find(([, controls]) => !getGroupLanguageKey(controls)) ||
      candidates[0] ||
      null
    );
  }

  function getGroupSemanticKey(controls) {
    for (const control of controls) {
      const key = getSemanticKey(control);
      if (key) return key;
    }

    return null;
  }

  function getGroupLanguageKey(controls) {
    for (const control of controls) {
      const key = getLanguageKey(control);
      if (key) return key;
    }

    return null;
  }

  function getSemanticKey(control) {
    const hint = [
      control.name,
      control.id,
      control.placeholder,
      control.getAttribute?.('aria-label'),
      ...getControlLabels(control)
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('ru');

    const patterns = [
      ['autoDelivery', /автоматическ.{0,15}выдач|auto.{0,15}deliver/],
      ['deliveryGoods', /(^|[^\p{L}])товар(?:ы|ов)?([^\p{L}]|$)|(^|[^a-z])goods?([^a-z]|$)|(^|[^a-z])products?([^a-z]|$)/u],
      ['buyerMessage', /сообщени.{0,20}покупател|buyer.{0,20}message|payment.{0,20}message/],
      ['summary', /кратк.{0,15}описан|short.{0,15}description|summary|offer.{0,10}title/],
      ['description', /подробн.{0,15}описан|detailed.{0,15}description|description|detail/],
      ['price', /(^|[^\p{L}])цен[аы]?([^\p{L}]|$)|price/u],
      ['images', /картин|изображ|image|photo/],
      ['active', /(^|[^\p{L}])активн|(^|[^a-z])active([^a-z]|$)/]
    ];

    return patterns.find(([, pattern]) => pattern.test(hint))?.[0] || null;
  }

  function getLanguageKey(control) {
    const identifierHint = [
      control.name,
      control.id,
      control.getAttribute?.('lang'),
      control.closest?.('.tab-pane')?.id
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('ru');
    const identifierLanguage = detectLanguage(identifierHint);

    if (identifierLanguage) return identifierLanguage;

    const labelLanguage = detectLanguage(
      getControlLabels(control).join(' ').toLocaleLowerCase('ru')
    );
    if (labelLanguage) return labelLanguage;

    const localLanguage = control
      .closest?.('[lang]:not(html)')
      ?.getAttribute('lang');
    return detectLanguage(localLanguage || '');
  }

  function detectLanguage(hint) {
    if (/(?:^|[^a-z])(en|eng|english)(?:[^a-z]|$)|по-английски|английск/i.test(hint)) {
      return 'en';
    }

    return /(?:^|[^a-z])(ru|rus|russian)(?:[^a-z]|$)|по-русски|русск/i.test(hint)
      ? 'ru'
      : null;
  }

  function getControlLabels(control) {
    const labels = control.labels ? [...control.labels] : [];
    return labels.map((label) => label.textContent || '');
  }

  function replaceTargetValues({
    formData,
    targetForm,
    targetName,
    sourceControls
  }) {
    formData.delete(targetName);

    for (const value of getHiddenValues(targetForm, targetName)) {
      formData.append(targetName, value);
    }

    for (const value of getControlValues(sourceControls)) {
      formData.append(targetName, value);
    }
  }

  function applyOverrides(formData, targetForm, overrides) {
    for (const [name, override] of Object.entries(overrides || {})) {
      const controls = [...targetForm.elements].filter(
        (control) => control.name === name && !control.disabled
      );

      if (controls.length === 0 || !override) continue;

      formData.delete(name);

      for (const value of getHiddenValues(targetForm, name)) {
        formData.append(name, value);
      }

      for (const value of override.values || []) {
        formData.append(name, value);
      }
    }
  }

  function getEditableGroups(form) {
    return groupFieldsByName(
      [...form.elements].filter((control) => {
        if (!control.name || control.disabled) return false;

        const type = (control.type || '').toLowerCase();
        return ![
          'hidden',
          'file',
          'button',
          'submit',
          'reset',
          'image'
        ].includes(type);
      })
    );
  }

  function createDraftField(name, controls, formData) {
    const primaryControl = controls[0];
    const type = getDraftFieldType(primaryControl, controls);
    if (!type) return null;

    const values = formData.getAll(name).map((value) => String(value));
    const language = getGroupLanguageKey(controls);
    const label = getDraftLabel(primaryControl, name, language);
    const semanticKey = getGroupSemanticKey(controls);
    const field = {
      name,
      type,
      label,
      language,
      semanticKey,
      values
    };

    if (type === 'checkbox') {
      const checkbox = controls.find(
        (control) => (control.type || '').toLowerCase() === 'checkbox'
      );
      field.checked = values.includes(String(checkbox?.value || 'on'));
      field.checkedValue = String(checkbox?.value || 'on');
    }

    if (type === 'select' || type === 'radio') {
      field.options = getDraftOptions(controls);
      field.multiple = Boolean(
        controls.find((control) => control.tagName === 'SELECT')?.multiple
      );
    }

    return field;
  }

  function getDraftFieldType(control, controls) {
    const type = (control.type || '').toLowerCase();

    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (control.tagName === 'TEXTAREA') return 'textarea';
    if (control.tagName === 'SELECT') return 'select';
    if (['number', 'text', 'search', 'email', 'url', 'tel'].includes(type)) {
      return type === 'number' ? 'number' : 'text';
    }

    if (controls.some((item) => item.tagName === 'TEXTAREA')) return 'textarea';
    return null;
  }

  function getDraftLabel(control, name, language) {
    const directLabel = getControlLabels(control)
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .find(Boolean);
    const groupLabel = control.closest?.('.form-group')
      ?.querySelector?.('label, .control-label')
      ?.textContent
      ?.replace(/\s+/g, ' ')
      .trim();
    const base = directLabel || groupLabel || humanizeFieldName(name);
    const languageLabel =
      language === 'ru' ? 'Русский' : language === 'en' ? 'English' : null;
    const labelAlreadyIncludesLanguage =
      language === 'ru'
        ? /по-русски|русск/i.test(base)
        : language === 'en'
          ? /english|по-английски|английск/i.test(base)
          : false;

    return languageLabel && !labelAlreadyIncludesLanguage
      ? `${base} · ${languageLabel}`
      : base;
  }

  function humanizeFieldName(name) {
    return name
      .replace(/[\[\]_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getDraftOptions(controls) {
    const options = [];

    for (const control of controls) {
      if (control.tagName === 'SELECT') {
        for (const option of control.options || []) {
          options.push({
            value: String(option.value),
            label: option.textContent?.trim() || String(option.value)
          });
        }
        continue;
      }

      options.push({
        value: String(control.value || 'on'),
        label: getControlLabels(control).join(' ').trim() || String(control.value)
      });
    }

    return options;
  }

  function getControlValues(controls) {
    const values = [];

    for (const control of controls) {
      const type = (control.type || '').toLowerCase();

      if (type === 'checkbox' || type === 'radio') {
        if (control.checked) values.push(control.value || 'on');
        continue;
      }

      if (type === 'file') {
        for (const file of control.files || []) {
          if (file?.name || file?.size) values.push(file);
        }
        continue;
      }

      if (control.tagName === 'SELECT' && control.multiple) {
        for (const option of control.selectedOptions || []) {
          values.push(option.value);
        }
        continue;
      }

      values.push(control.value ?? '');
    }

    return values;
  }

  function keepServiceOfferActive({ formData, targetForm, targetCategory }) {
    if (!/услуг|service/i.test(targetCategory.section || '')) return false;

    const checkbox = [...targetForm.elements].find((control) => {
      if ((control.type || '').toLowerCase() !== 'checkbox') return false;
      const label = getControlLabels(control).join(' ');
      return /деактивировать после продажи|deactivate after sale/i.test(label);
    });

    if (!checkbox?.name) return false;

    formData.delete(checkbox.name);
    for (const value of getHiddenValues(targetForm, checkbox.name)) {
      formData.append(checkbox.name, value);
    }
    return true;
  }

  function removeInactiveDeliveryGoods(formData, targetForm) {
    const groups = groupFieldsByName(getUserFields(targetForm));
    const autoDeliveryEntry = [...groups].find(([, controls]) =>
      getGroupSemanticKey(controls) === 'autoDelivery'
    );

    if (!autoDeliveryEntry) return;

    const [autoDeliveryName, autoDeliveryControls] = autoDeliveryEntry;
    const enabledValues = new Set(
      autoDeliveryControls
        .filter((control) =>
          ['checkbox', 'radio'].includes((control.type || '').toLowerCase())
        )
        .map((control) => String(control.value || 'on'))
    );
    const autoDeliveryEnabled = formData
      .getAll(autoDeliveryName)
      .some((value) => enabledValues.has(String(value)));

    if (autoDeliveryEnabled) return;

    for (const [name, controls] of groups) {
      if (getGroupSemanticKey(controls) === 'deliveryGoods') {
        formData.delete(name);
      }
    }
  }

  function getHiddenValues(form, name) {
    return [...form.elements]
      .filter((control) =>
        control.name === name &&
        (control.type || '').toLowerCase() === 'hidden' &&
        !control.disabled
      )
      .map((control) => control.value ?? '');
  }
})();

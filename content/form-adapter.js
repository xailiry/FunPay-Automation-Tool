(() => {
  const namespace = globalThis.FunPayAutomation ||= {};

  namespace.TargetFormAdapter = class TargetFormAdapter {
    constructor(FormDataClass = FormData) {
      this.FormDataClass = FormDataClass;
    }

    build(sourceForm, targetForm, targetCategory) {
      const formData = new this.FormDataClass(targetForm);
      const sourceGroups = groupFieldsByName(getUserFields(sourceForm));
      const targetGroups = groupFieldsByName(getUserFields(targetForm));
      const sourceBySemanticKey = groupFieldsBySemanticKey(sourceGroups);
      const transferredSourceNames = new Set();
      const transferredTargetNames = [];

      for (const [targetName, targetControls] of targetGroups) {
        const sourceEntry =
          sourceGroups.has(targetName)
            ? [targetName, sourceGroups.get(targetName)]
            : sourceBySemanticKey.get(getGroupSemanticKey(targetControls));

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

      formData.set('node_id', targetCategory.nodeId);

      return {
        formData,
        report: {
          transferredFields: transferredTargetNames,
          droppedFields: [...sourceGroups.keys()].filter(
            (name) => !transferredSourceNames.has(name)
          ),
          forcedPersistent
        }
      };
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

  function groupFieldsBySemanticKey(groups) {
    const byKey = new Map();

    for (const [name, controls] of groups) {
      const semanticKey = getGroupSemanticKey(controls);
      if (semanticKey && !byKey.has(semanticKey)) {
        byKey.set(semanticKey, [name, controls]);
      }
    }

    return byKey;
  }

  function getGroupSemanticKey(controls) {
    for (const control of controls) {
      const key = getSemanticKey(control);
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
      ['buyerMessage', /сообщени.{0,20}покупател|buyer.{0,20}message|payment.{0,20}message/],
      ['summary', /кратк.{0,15}описан|short.{0,15}description|summary|offer.{0,10}title/],
      ['description', /подробн.{0,15}описан|detailed.{0,15}description|description|detail/],
      ['price', /(^|[^\p{L}])цен[аы]?([^\p{L}]|$)|price/u],
      ['images', /картин|изображ|image|photo/],
      ['active', /(^|[^\p{L}])активн|(^|[^a-z])active([^a-z]|$)/]
    ];

    return patterns.find(([, pattern]) => pattern.test(hint))?.[0] || null;
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

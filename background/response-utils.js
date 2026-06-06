export function isAuthenticationPage(url, text) {
  const pathname = getPathname(url);
  return (
    pathname.includes('/account/login') ||
    (
      /name=["']login["']/i.test(text) &&
      /name=["']password["']/i.test(text)
    )
  );
}

export function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function normalizeMessage(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return Object.values(value).filter(Boolean).join(', ');
  }
  return '';
}

export function extractResponseMessage(data) {
  const candidates = [
    data.message,
    data.msg,
    data.error_description,
    data.error_message,
    typeof data.error === 'string' || typeof data.error === 'object'
      ? data.error
      : null
  ];

  for (const candidate of candidates) {
    const message = normalizeMessage(candidate);
    if (message) return message;
  }

  return '';
}

export function createResponseDiagnostic(data) {
  const diagnostic = {};

  for (const key of ['success', 'status', 'error', 'code']) {
    const value = data[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      diagnostic[key] = value;
    }
  }

  return diagnostic;
}

function getPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return '';
  }
}

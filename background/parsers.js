export function extractUserId(html) {
  return html.match(
    /(?:https?:\/\/(?:www\.)?funpay\.com)?\/users\/(\d+)\/?/i
  )?.[1] || null;
}

export function extractNodeIds(html) {
  const ids = new Set();
  const pattern =
    /(?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?/gi;
  let match;

  while ((match = pattern.exec(html))) {
    ids.add(match[1]);
  }

  return [...ids];
}

export function extractGameId(html) {
  return html.match(/\bdata-game=["'](\d+)["']/i)?.[1] || null;
}

export function extractCategories(html) {
  const categoriesById = new Map();
  const anchorPattern =
    /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const id = match[1];
    const name = decodeHtml(stripHtml(match[2])).replace(/\s+/g, ' ').trim();

    if (name && !categoriesById.has(id)) {
      categoriesById.set(id, { id, name });
    }
  }

  return [...categoriesById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
  );
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
  const namedEntities = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    if (code[0] === '#') {
      const isHex = code[1].toLowerCase() === 'x';
      const number = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }

    return namedEntities[code.toLowerCase()] || entity;
  });
}

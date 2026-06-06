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
  const groupPattern =
    /<div\b[^>]*class=["'][^"']*\bpromo-game-item\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*class=["'][^"']*\bgame-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>[\s\S]*?<\/div>/gi;
  let groupMatch;

  while ((groupMatch = groupPattern.exec(html))) {
    const game = cleanText(groupMatch[1]);
    const categoryPattern =
      /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi;
    let categoryMatch;

    while ((categoryMatch = categoryPattern.exec(groupMatch[2]))) {
      const id = categoryMatch[1];
      const section = cleanText(categoryMatch[2]);

      if (!game || !section || categoriesById.has(id)) continue;

      categoriesById.set(id, {
        id,
        game,
        section,
        name: `${game} · ${section}`
      });
    }
  }

  return [...categoriesById.values()].sort((a, b) =>
    a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
  );
}

function cleanText(value) {
  return decodeHtml(stripHtml(value)).replace(/\s+/g, ' ').trim();
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

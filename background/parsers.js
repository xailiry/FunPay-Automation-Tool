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
  const gameTitlePattern =
    /<div\b[^>]*class=["'][^"']*\bgame-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>/gi;
  const gameTitles = [...html.matchAll(gameTitlePattern)];

  for (let index = 0; index < gameTitles.length; index += 1) {
    const gameMatch = gameTitles[index];
    const game = cleanText(gameMatch[1]);
    const groupEnd = gameTitles[index + 1]?.index ?? html.length;
    const groupHtml = html.slice(gameMatch.index + gameMatch[0].length, groupEnd);
    const categoryList = groupHtml.match(/<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1];

    if (!game || !categoryList) continue;

    const categoryPattern =
      /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
    let categoryMatch;

    while ((categoryMatch = categoryPattern.exec(categoryList))) {
      const id = categoryMatch[1];
      const section = cleanText(categoryMatch[2]);

      if (!section || categoriesById.has(id)) continue;

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

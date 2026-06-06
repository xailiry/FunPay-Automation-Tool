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

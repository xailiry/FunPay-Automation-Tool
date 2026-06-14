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

// FunPay answers a raise with a confirmation modal when offers exist in several
// categories of one game (which share a single cooldown). Auto-bump raises them
// all at once, so every category checkbox in the modal is collected and re-sent
// as node_ids[].
export function extractRaiseModalNodeIds(modalHtml) {
  if (typeof modalHtml !== 'string') return [];
  return [
    ...new Set(
      [...modalHtml.matchAll(/value=["'](\d+)["']/g)].map((match) => match[1])
    )
  ];
}

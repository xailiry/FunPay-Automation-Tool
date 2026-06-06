import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractCategories,
  extractGameId,
  extractNodeIds,
  extractUserId
} from '../background/parsers.js';

test('extracts account, category and game identifiers', () => {
  const home = '<a href="https://funpay.com/users/11360744/">Profile</a>';
  const profile = `
    <a href="/lots/1356/">One</a>
    <a href="https://funpay.com/lots/242/">Two</a>
    <a href="/lots/1356/">Duplicate</a>
  `;
  const category = '<div data-game="99"></div>';

  assert.equal(extractUserId(home), '11360744');
  assert.deepEqual(extractNodeIds(profile), ['1356', '242']);
  assert.equal(extractGameId(category), '99');
});

test('extracts unique, decoded and sorted category names', () => {
  const html = `
    <a href="/lots/2/"><span>Яндекс&nbsp;Плюс</span></a>
    <a href="https://funpay.com/lots/1/">ChatGPT &amp; Claude</a>
    <a href="/lots/2/">Duplicate</a>
  `;

  assert.deepEqual(extractCategories(html), [
    { id: '2', name: 'Яндекс Плюс' },
    { id: '1', name: 'ChatGPT & Claude' }
  ]);
});

test('returns safe empty values when markup does not match', () => {
  assert.equal(extractUserId('<html></html>'), null);
  assert.equal(extractGameId('<html></html>'), null);
  assert.deepEqual(extractNodeIds('<html></html>'), []);
  assert.deepEqual(extractCategories('<html></html>'), []);
});

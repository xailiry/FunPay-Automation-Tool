import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractGameId,
  extractNodeIds,
  extractRaiseModalNodeIds,
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

test('returns safe empty values when markup does not match', () => {
  assert.equal(extractUserId('<html></html>'), null);
  assert.equal(extractGameId('<html></html>'), null);
  assert.deepEqual(extractNodeIds('<html></html>'), []);
});

test('extracts every category from a raise confirmation modal', () => {
  const modal =
    '<div class="raise-box" data-game="158" data-node="2046">' +
    '<input type="checkbox" value="453"><i></i>Услуги' +
    '<input type="checkbox" value="2046" checked><i></i>Прочее' +
    '<input type="checkbox" value="453"></div>';

  assert.deepEqual(extractRaiseModalNodeIds(modal), ['453', '2046']);
  assert.deepEqual(extractRaiseModalNodeIds(null), []);
  assert.deepEqual(extractRaiseModalNodeIds(undefined), []);
});

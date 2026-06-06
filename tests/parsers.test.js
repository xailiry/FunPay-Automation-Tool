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
    <div class="promo-game-item">
      <div class="game-title"><a href="/lots/10/">ChatGPT</a></div>
      <ul>
        <li><a href="/lots/10/">Аккаунты</a></li>
        <li><a href="/lots/11/">Прочее</a></li>
      </ul>
    </div>
    <div class="promo-game-item">
      <div class="game-title"><a href="/lots/20/">Claude &amp; AI</a></div>
      <ul>
        <li><a href="/lots/20/">Аккаунты</a></li>
        <li><a href="/lots/21/"><span>Услуги&nbsp;Pro</span></a></li>
      </ul>
    </div>
  `;

  assert.deepEqual(extractCategories(html), [
    {
      id: '10',
      game: 'ChatGPT',
      section: 'Аккаунты',
      name: 'ChatGPT · Аккаунты'
    },
    {
      id: '11',
      game: 'ChatGPT',
      section: 'Прочее',
      name: 'ChatGPT · Прочее'
    },
    {
      id: '20',
      game: 'Claude & AI',
      section: 'Аккаунты',
      name: 'Claude & AI · Аккаунты'
    },
    {
      id: '21',
      game: 'Claude & AI',
      section: 'Услуги Pro',
      name: 'Claude & AI · Услуги Pro'
    }
  ]);
});

test('extracts categories from compact FunPay markup without relying on outer divs', () => {
  const html = `
    <div class="promo-game-item"><div class="game-title" data-id="853"><a href="https://funpay.com/lots/3478/">Gemini</a></div><ul class="list-inline" data-id="853"><li><a href="https://funpay.com/lots/3478/">Аккаунты</a></li> <li><a href="https://funpay.com/lots/4093/?from=home">Услуги</a></li></ul></div>
    <div class="promo-game-item"><div class="game-title" data-id="760"><a href="https://funpay.com/lots/3172/">Claude</a></div><ul class="list-inline" data-id="760"><li><a href="https://funpay.com/lots/4234/">Токены</a></li></ul></div>
  `;

  assert.deepEqual(extractCategories(html), [
    {
      id: '4234',
      game: 'Claude',
      section: 'Токены',
      name: 'Claude · Токены'
    },
    {
      id: '3478',
      game: 'Gemini',
      section: 'Аккаунты',
      name: 'Gemini · Аккаунты'
    },
    {
      id: '4093',
      game: 'Gemini',
      section: 'Услуги',
      name: 'Gemini · Услуги'
    }
  ]);
});

test('returns safe empty values when markup does not match', () => {
  assert.equal(extractUserId('<html></html>'), null);
  assert.equal(extractGameId('<html></html>'), null);
  assert.deepEqual(extractNodeIds('<html></html>'), []);
  assert.deepEqual(extractCategories('<html></html>'), []);
});

import assert from 'node:assert/strict';
import test from 'node:test';

await import('../bump-countdown.js');

const { format } = globalThis.FunPayBumpCountdown;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

test('formats bump availability as a live hours and minutes countdown', () => {
  const now = 10 * HOUR;

  assert.equal(format(null, now), 'Можно поднять сейчас');
  assert.equal(format(now - 1, now), 'Можно поднять сейчас');
  assert.equal(format(now + 20 * MINUTE, now), 'Можно снова через 20 мин');
  assert.equal(format(now + 3 * HOUR, now), 'Можно снова через 3 ч');
  assert.equal(
    format(now + 3 * HOUR + 20 * MINUTE, now),
    'Можно снова через 3 ч 20 мин'
  );
});

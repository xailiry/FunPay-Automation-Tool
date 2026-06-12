import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.FunPayAutomationToolbar = {};
await import('../toolbar/calculations.js');

const {
  calculateGrossForNet,
  calculateWithdrawal,
  convertByRate
} = globalThis.FunPayAutomationToolbar.Calculations;

test('calculates card, SBP and USDT withdrawal fees', () => {
  assert.deepEqual(calculateWithdrawal(80, 'card'), { fee: 30, net: 50 });
  assert.deepEqual(calculateWithdrawal(1000, 'card'), { fee: 30, net: 970 });
  assert.deepEqual(calculateWithdrawal(1000, 'usdt'), { fee: 60, net: 940 });
});

test('calculates the gross amount required for a desired net amount', () => {
  assert.equal(calculateGrossForNet(50, 'card'), 80);
  assert.equal(calculateGrossForNet(970, 'card'), 1000);
  assert.ok(Math.abs(calculateGrossForNet(42000, 'card') - 43298.969072) < 0.001);
  assert.ok(Math.abs(calculateGrossForNet(940, 'usdt') - 1000) < 0.001);
});

test('converts an amount using a locally supplied rate', () => {
  assert.equal(convertByRate(9000, 90), 100);
  assert.equal(convertByRate(-10, 90), 0);
});

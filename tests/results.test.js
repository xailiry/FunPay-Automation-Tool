import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyRaiseResponse,
  normalizeStoredBumpResult
} from '../background/results.js';

test('classifies successful raise response', () => {
  assert.deepEqual(
    classifyRaiseResponse('1356', {
      json: { success: true, message: 'Ваши предложения подняты.' }
    }),
    {
      nodeId: '1356',
      status: 'success',
      message: 'Ваши предложения подняты.'
    }
  );
});

test('classifies silent and timed rejections as cooldowns', () => {
  const silent = classifyRaiseResponse('242', {
    json: { error: true }
  });
  const timed = classifyRaiseResponse('4187', {
    json: { error: 'Можно поднять через 2 часа' }
  });

  assert.equal(silent.status, 'skipped');
  assert.equal(timed.status, 'skipped');
});

test('keeps meaningful server errors as failures', () => {
  const result = classifyRaiseResponse('1', {
    json: { error: 'Некорректный node_id' }
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.message, 'Некорректный node_id');
});

test('migrates legacy silent rejections', () => {
  const result = normalizeStoredBumpResult({
    successCount: 1,
    skippedCount: 0,
    failedCount: 1,
    results: [
      { status: 'success', message: 'Raised' },
      { status: 'failed', message: 'Операция отклонена FunPay' }
    ]
  });

  assert.equal(result.successCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.failedCount, 0);
});

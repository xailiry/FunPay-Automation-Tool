import assert from 'node:assert/strict';
import test from 'node:test';

import { AutoBumpScheduler } from '../background/auto-bump-scheduler.js';

const HOUR = 60 * 60 * 1000;

test('enabling after a recent manual run waits only for the remaining time', async () => {
  const now = 10 * HOUR;
  const storage = createStorage({
    lastBumpResult: {
      status: 'completed',
      finishedAt: now - 40 * 60 * 1000,
      successCount: 1
    }
  });
  const alarms = createAlarms();
  const scheduler = createScheduler({ storage, alarms, now });

  await scheduler.setEnabled(true);

  assert.equal(storage.state.nextAutoBumpAt, now + 3 * HOUR + 20 * 60 * 1000);
  assert.equal(alarms.current.scheduledTime, storage.state.nextAutoBumpAt);
});

test('a missed launch runs once on startup and schedules the next attempt', async () => {
  const now = 20 * HOUR;
  const storage = createStorage({
    autoBumpEnabled: true,
    nextAutoBumpAt: now - HOUR
  });
  const alarms = createAlarms();
  let runs = 0;
  const scheduler = createScheduler({
    storage,
    alarms,
    now,
    run: async () => {
      runs += 1;
      return { status: 'completed', successCount: 1 };
    }
  });

  await scheduler.initialize();

  assert.equal(runs, 1);
  assert.equal(storage.state.nextAutoBumpAt, now + 4 * HOUR);
  assert.equal(alarms.current.scheduledTime, now + 4 * HOUR);
});

test('startup preserves an existing future schedule instead of delaying it', async () => {
  const now = 20 * HOUR;
  const nextAt = now + 2 * HOUR;
  const storage = createStorage({
    autoBumpEnabled: true,
    nextAutoBumpAt: nextAt
  });
  const alarms = createAlarms({
    name: 'autoBumpAlarm',
    scheduledTime: nextAt
  });
  const scheduler = createScheduler({ storage, alarms, now });

  await scheduler.initialize();

  assert.equal(alarms.createCalls.length, 0);
  assert.equal(alarms.current.scheduledTime, nextAt);
});

test('manual bump reschedules auto bump four hours after completion', async () => {
  let now = 10 * HOUR;
  const storage = createStorage({ autoBumpEnabled: true });
  const alarms = createAlarms();
  const scheduler = createScheduler({
    storage,
    alarms,
    now: () => now,
    run: async () => {
      now += 2 * 60 * 1000;
      return { status: 'completed', successCount: 1 };
    }
  });

  await scheduler.runManually();

  assert.equal(storage.state.nextAutoBumpAt, now + 4 * HOUR);
  assert.equal(storage.state.nextBumpAvailableAt, now + 4 * HOUR);
});

test('cooldown attempts preserve the availability timer', async () => {
  const now = 10 * HOUR;
  const availableAt = now + 2 * HOUR;
  const storage = createStorage({
    autoBumpEnabled: true,
    nextBumpAvailableAt: availableAt,
    nextAutoBumpAt: availableAt
  });
  const alarms = createAlarms({
    name: 'autoBumpAlarm',
    scheduledTime: availableAt
  });
  const scheduler = createScheduler({
    storage,
    alarms,
    now,
    run: async () => ({
      status: 'completed',
      successCount: 0,
      skippedCount: 2,
      failedCount: 0
    })
  });

  await scheduler.runManually();

  assert.equal(storage.state.nextBumpAvailableAt, availableAt);
  assert.equal(storage.state.nextAutoBumpAt, availableAt);
});

test('critical errors preserve availability and do not cause an immediate retry loop', async () => {
  const now = 10 * HOUR;
  const previousAvailability = now - HOUR;
  const storage = createStorage({
    autoBumpEnabled: true,
    nextBumpAvailableAt: previousAvailability
  });
  const alarms = createAlarms();
  let runs = 0;
  let reportedErrors = 0;
  const scheduler = createScheduler({
    storage,
    alarms,
    now,
    run: async () => {
      runs += 1;
      throw new Error('session expired');
    },
    onError: () => {
      reportedErrors += 1;
    }
  });

  await scheduler.handleAlarm({ name: 'autoBumpAlarm' });

  assert.equal(runs, 1);
  assert.equal(reportedErrors, 1);
  assert.equal(storage.state.nextBumpAvailableAt, previousAvailability);
  assert.equal(storage.state.nextAutoBumpAt, now + 4 * HOUR);
  assert.equal(alarms.current.scheduledTime, now + 4 * HOUR);
});

test('an alarm API failure does not turn a successful bump into a failed bump', async () => {
  const now = 10 * HOUR;
  const storage = createStorage({ autoBumpEnabled: true });
  const alarms = createAlarms();
  alarms.create = async () => {
    throw new Error('alarms unavailable');
  };
  let reportedErrors = 0;
  const scheduler = createScheduler({
    storage,
    alarms,
    now,
    run: async () => ({ status: 'completed', successCount: 1 }),
    onError: () => {
      reportedErrors += 1;
    }
  });

  const result = await scheduler.runManually();

  assert.equal(result.successCount, 1);
  assert.equal(reportedErrors, 1);
  assert.equal(storage.state.nextAutoBumpAt, now + 4 * HOUR);
});

function createScheduler({
  storage,
  alarms,
  now,
  run = async () => ({ status: 'completed' }),
  onError = () => {}
}) {
  return new AutoBumpScheduler({
    storage,
    alarms,
    run,
    now: typeof now === 'function' ? now : () => now,
    intervalMs: 4 * HOUR,
    onError
  });
}

function createStorage(initialState) {
  return {
    state: structuredClone(initialState),
    async get(keys) {
      return Object.fromEntries(
        keys
          .filter((key) => key in this.state)
          .map((key) => [key, structuredClone(this.state[key])])
      );
    },
    async set(values) {
      Object.assign(this.state, structuredClone(values));
    }
  };
}

function createAlarms(initialAlarm = null) {
  return {
    current: initialAlarm,
    createCalls: [],
    async get() {
      return this.current;
    },
    async create(name, options) {
      this.createCalls.push({ name, options });
      this.current = {
        name,
        scheduledTime: options.when
      };
    },
    async clear() {
      const existed = Boolean(this.current);
      this.current = null;
      return existed;
    }
  };
}

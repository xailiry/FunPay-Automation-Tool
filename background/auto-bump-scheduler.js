const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_ALARM_NAME = 'autoBumpAlarm';

export class AutoBumpScheduler {
  constructor({
    alarms,
    storage,
    run,
    now = Date.now,
    intervalMs = DEFAULT_INTERVAL_MS,
    alarmName = DEFAULT_ALARM_NAME,
    onError = () => {}
  }) {
    this.alarms = alarms;
    this.storage = storage;
    this.run = run;
    this.now = now;
    this.intervalMs = intervalMs;
    this.alarmName = alarmName;
    this.onError = onError;
    this.syncPromise = null;
  }

  initialize() {
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = this.sync().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  async setEnabled(enabled) {
    if (!enabled) {
      await this.storage.set({
        autoBumpEnabled: false,
        nextAutoBumpAt: null
      });
      await this.alarms.clear(this.alarmName);
      return {
        enabled: false,
        nextAutoBumpAt: null
      };
    }

    const stored = await this.storage.get(['lastBumpResult']);
    const nextAt = this.getNextTimeFromResult(stored.lastBumpResult);
    await this.storage.set({
      autoBumpEnabled: true,
      nextAutoBumpAt: nextAt
    });

    if (nextAt <= this.now()) {
      await this.runAndReschedule({ propagateError: false });
      const state = await this.storage.get(['nextAutoBumpAt']);
      return {
        enabled: true,
        nextAutoBumpAt: state.nextAutoBumpAt
      };
    }

    await this.ensureAlarm(nextAt);
    return {
      enabled: true,
      nextAutoBumpAt: nextAt
    };
  }

  async handleAlarm(alarm) {
    if (alarm.name !== this.alarmName) return;
    await this.runAndReschedule({ propagateError: false });
  }

  async runManually() {
    return this.runAndReschedule({ propagateError: true });
  }

  async sync() {
    const stored = await this.storage.get([
      'autoBumpEnabled',
      'nextAutoBumpAt',
      'lastBumpResult'
    ]);

    if (!stored.autoBumpEnabled) {
      await this.alarms.clear(this.alarmName);
      return;
    }

    const nextAt = isValidTimestamp(stored.nextAutoBumpAt)
      ? stored.nextAutoBumpAt
      : this.getNextTimeFromResult(stored.lastBumpResult);

    await this.storage.set({ nextAutoBumpAt: nextAt });

    if (nextAt <= this.now()) {
      await this.runAndReschedule({ propagateError: false });
      return;
    }

    await this.ensureAlarm(nextAt);
  }

  async runAndReschedule({ propagateError }) {
    let result;
    let failure;

    try {
      result = await this.run();
    } catch (error) {
      failure = error;
      this.onError(error);
    } finally {
      try {
        await this.scheduleAfterAttempt();
      } catch (error) {
        this.onError(error);
      }
    }

    if (failure && propagateError) throw failure;
    return result;
  }

  async scheduleAfterAttempt() {
    const { autoBumpEnabled } = await this.storage.get(['autoBumpEnabled']);
    if (!autoBumpEnabled) {
      await this.alarms.clear(this.alarmName);
      return;
    }

    const nextAt = this.now() + this.intervalMs;
    await this.storage.set({ nextAutoBumpAt: nextAt });
    await this.ensureAlarm(nextAt);
  }

  getNextTimeFromResult(result) {
    const completedAt = Number(result?.finishedAt || result?.startedAt);
    return Number.isFinite(completedAt)
      ? completedAt + this.intervalMs
      : this.now() + this.intervalMs;
  }

  async ensureAlarm(when) {
    const current = await this.alarms.get(this.alarmName);
    if (current && Math.abs(current.scheduledTime - when) < 1000) return;

    await this.alarms.create(this.alarmName, {
      when
    });
  }
}

function isValidTimestamp(value) {
  return Number.isFinite(value) && value > 0;
}

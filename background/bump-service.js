import {
  extractGameId,
  extractNodeIds,
  extractUserId
} from './parsers.js';
import {
  classifyRaiseResponse,
  createBumpResult
} from './results.js';

const REQUEST_DELAY_MS = 700;

export class BumpService {
  constructor({
    client,
    storage,
    notify,
    wait = delay,
    now = Date.now
  }) {
    this.client = client;
    this.storage = storage;
    this.notify = notify;
    this.wait = wait;
    this.now = now;
    this.activeRun = null;
  }

  get isRunning() {
    return Boolean(this.activeRun);
  }

  run() {
    if (this.activeRun) return this.activeRun;

    this.activeRun = this.perform().finally(() => {
      this.activeRun = null;
    });

    return this.activeRun;
  }

  async perform() {
    const startedAt = this.now();
    const runningState = createRunningState(startedAt);
    await this.storage.set({ lastBumpResult: runningState });

    try {
      const nodeIds = await this.getActiveNodeIds();
      const results = [];

      for (let index = 0; index < nodeIds.length; index += 1) {
        results.push(await this.raiseNode(nodeIds[index]));

        if (index < nodeIds.length - 1) {
          await this.wait(REQUEST_DELAY_MS);
        }
      }

      const result = createBumpResult(startedAt, results);
      await this.storage.set({ lastBumpResult: result });
      await this.notifyResult(result);
      return result;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      const result = {
        ...runningState,
        status: 'failed',
        finishedAt: this.now(),
        failedCount: 1,
        error: errorMessage
      };

      await this.storage.set({ lastBumpResult: result });
      await this.notify('Авто-поднятие не выполнено', errorMessage);
      throw error;
    }
  }

  async getActiveNodeIds() {
    const home = await this.client.getHomePage();
    const userId = extractUserId(home.text);

    if (!userId) {
      throw new Error(
        'Не удалось определить аккаунт. Откройте FunPay и войдите в профиль.'
      );
    }

    const profile = await this.client.getProfilePage(userId);
    const nodeIds = extractNodeIds(profile.text);

    if (nodeIds.length === 0) {
      throw new Error('В профиле не найдены активные категории с объявлениями.');
    }

    return nodeIds;
  }

  async raiseNode(nodeId) {
    try {
      const categoryPage = await this.client.getCategoryPage(nodeId);
      const gameId = extractGameId(categoryPage.text);

      if (!gameId) {
        return {
          nodeId,
          status: 'failed',
          message: 'Не найден game_id категории'
        };
      }

      const response = await this.client.raiseCategory(gameId, nodeId);
      return classifyRaiseResponse(nodeId, response);
    } catch (error) {
      return {
        nodeId,
        status: 'failed',
        message: getErrorMessage(error)
      };
    }
  }

  async notifyResult(result) {
    const parts = [`Поднято: ${result.successCount}`];

    if (result.skippedCount > 0) {
      parts.push(`на кулдауне: ${result.skippedCount}`);
    }
    if (result.failedCount > 0) {
      parts.push(`ошибок: ${result.failedCount}`);
    }

    await this.notify('Авто-поднятие завершено', parts.join(', '));
  }
}

function createRunningState(startedAt) {
  return {
    status: 'running',
    startedAt,
    finishedAt: null,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    results: []
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

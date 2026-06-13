import {
  createResponseDiagnostic,
  extractResponseMessage
} from './response-utils.js';

const LEGACY_SILENT_REJECTION = 'Операция отклонена FunPay';
const COOLDOWN_MESSAGE = 'Уже поднято или действует ограничение по времени';

export function classifyRaiseResponse(nodeId, response) {
  const data = response.json;

  if (!data) {
    return {
      nodeId,
      status: 'failed',
      message: 'Сервер вернул неожиданный ответ'
    };
  }

  // A category-selection modal is not a completed raise — never treat it as one.
  if (typeof data.modal === 'string' && data.modal.trim()) {
    return {
      nodeId,
      status: 'failed',
      message: 'Требуется выбор категорий для поднятия'
    };
  }

  const errorMessage = extractResponseMessage(data);
  const explicitlyFailed =
    data.success === false ||
    data.status === 'error' ||
    Boolean(data.error);

  if (!explicitlyFailed) {
    return {
      nodeId,
      status: 'success',
      message: errorMessage || 'Объявления подняты'
    };
  }

  const isCooldown = !errorMessage || looksLikeCooldown(errorMessage);

  return {
    nodeId,
    status: isCooldown ? 'skipped' : 'failed',
    message: errorMessage || COOLDOWN_MESSAGE,
    response: createResponseDiagnostic(data)
  };
}

export function createBumpResult(startedAt, results) {
  return {
    status: 'completed',
    startedAt,
    finishedAt: Date.now(),
    ...countResultStatuses(results),
    results
  };
}

export function normalizeStoredBumpResult(result) {
  if (!result || !Array.isArray(result.results)) return result || null;

  let changed = false;
  const results = result.results.map((item) => {
    if (
      item.status === 'failed' &&
      item.message === LEGACY_SILENT_REJECTION
    ) {
      changed = true;
      return {
        ...item,
        status: 'skipped',
        message: COOLDOWN_MESSAGE
      };
    }

    return item;
  });

  if (!changed) return result;

  return {
    ...result,
    ...countResultStatuses(results),
    results
  };
}

function countResultStatuses(results) {
  const counts = {
    successCount: 0,
    skippedCount: 0,
    failedCount: 0
  };

  for (const result of results) {
    const counter = `${result.status}Count`;
    if (counter in counts) counts[counter] += 1;
  }

  return counts;
}

function looksLikeCooldown(message) {
  return /уже|ранее|час|минут|секунд|подня|повтор|огранич|cooldown|later|wait|raised/i.test(
    message
  );
}

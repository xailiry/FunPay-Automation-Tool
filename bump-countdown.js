(() => {
  const MINUTE_MS = 60 * 1000;
  const HOUR_MS = 60 * MINUTE_MS;

  globalThis.FunPayBumpCountdown = Object.freeze({
    format
  });

  function format(timestamp, now = Date.now()) {
    const remainingMs = Number(timestamp) - now;
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
      return 'Можно поднять сейчас';
    }

    const totalMinutes = Math.ceil(remainingMs / MINUTE_MS);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `Можно снова через ${minutes} мин`;
    if (minutes === 0) return `Можно снова через ${hours} ч`;
    return `Можно снова через ${hours} ч ${minutes} мин`;
  }
})();

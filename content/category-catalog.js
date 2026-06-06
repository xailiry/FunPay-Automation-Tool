(() => {
  const namespace = globalThis.FunPayAutomation;
  const CACHE_VERSION = 4;
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  const MINIMUM_CATEGORY_COUNT = 20;

  namespace.CategoryCatalog = class CategoryCatalog {
    constructor({
      loadHtmlImplementation = loadCatalogHtml,
      storage = globalThis.chrome?.storage?.local,
      origin = globalThis.location?.origin || 'https://funpay.com',
      now = Date.now,
      minimumCategoryCount = MINIMUM_CATEGORY_COUNT
    } = {}) {
      this.loadHtml = loadHtmlImplementation;
      this.storage = storage;
      this.origin = origin;
      this.now = now;
      this.minimumCategoryCount = minimumCategoryCount;
    }

    async getCategories(forceRefresh = false) {
      const cached = await this.readCache();

      if (!forceRefresh && this.isFresh(cached)) {
        return cached.categories;
      }

      try {
        const categories = await this.fetchCategories();
        await this.writeCache(categories);
        return categories;
      } catch (error) {
        if (this.isValid(cached.categories)) {
          return cached.categories;
        }

        throw error;
      }
    }

    async fetchCategories() {
      let html;

      try {
        html = await this.loadHtml(new URL('/', this.origin));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Не удалось открыть каталог FunPay: ${reason}`);
      }

      const categories = parseCategoryCatalog(html);

      if (!this.isValid(categories)) {
        throw new Error('FunPay вернул неполный список категорий.');
      }

      return categories;
    }

    async readCache() {
      const stored = await this.storage.get([
        'funpayCategories',
        'funpayCategoriesUpdatedAt',
        'funpayCategoriesVersion'
      ]);

      return {
        categories: stored.funpayCategories,
        updatedAt: Number(stored.funpayCategoriesUpdatedAt) || 0,
        version: Number(stored.funpayCategoriesVersion) || 0
      };
    }

    async writeCache(categories) {
      await this.storage.set({
        funpayCategories: categories,
        funpayCategoriesUpdatedAt: this.now(),
        funpayCategoriesVersion: CACHE_VERSION
      });
    }

    isFresh(cache) {
      return (
        cache.version === CACHE_VERSION &&
        this.isValid(cache.categories) &&
        this.now() - cache.updatedAt < CACHE_TTL_MS
      );
    }

    isValid(categories) {
      if (
        !Array.isArray(categories) ||
        categories.length < this.minimumCategoryCount
      ) {
        return false;
      }

      const ids = new Set();

      return categories.every((category) => {
        if (
          !category?.id ||
          !category.game ||
          !category.section ||
          !category.name ||
          ids.has(category.id)
        ) {
          return false;
        }

        ids.add(category.id);
        return true;
      });
    }
  };

  namespace.parseCategoryCatalog = parseCategoryCatalog;

  function loadCatalogHtml(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'loadCategoryCatalog',
          url: url.toString()
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response?.ok || typeof response.html !== 'string') {
            reject(new Error(response?.error || 'Catalog response is invalid'));
            return;
          }

          resolve(response.html);
        }
      );
    });
  }

  function parseCategoryCatalog(html) {
    const categoriesById = new Map();
    const gameTitlePattern =
      /<div\b[^>]*class=["'][^"']*\bgame-title\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>/gi;
    const gameTitles = [...html.matchAll(gameTitlePattern)];

    for (let index = 0; index < gameTitles.length; index += 1) {
      const gameMatch = gameTitles[index];
      const game = cleanText(gameMatch[1]);
      const groupEnd = gameTitles[index + 1]?.index ?? html.length;
      const groupHtml = html.slice(
        gameMatch.index + gameMatch[0].length,
        groupEnd
      );
      const categoryList = groupHtml.match(
        /<ul\b[^>]*>([\s\S]*?)<\/ul>/i
      )?.[1];

      if (!game || !categoryList) continue;

      const categoryPattern =
        /<a\b[^>]*href=["'](?:https?:\/\/(?:www\.)?funpay\.com)?\/lots\/(\d+)\/?(?:[?#][^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;
      let categoryMatch;

      while ((categoryMatch = categoryPattern.exec(categoryList))) {
        const id = categoryMatch[1];
        const section = cleanText(categoryMatch[2]);

        if (!section || categoriesById.has(id)) continue;

        categoriesById.set(id, {
          id,
          game,
          section,
          name: `${game} · ${section}`
        });
      }
    }

    return [...categoriesById.values()].sort((a, b) =>
      a.name.localeCompare(b.name, 'ru', { sensitivity: 'base' })
    );
  }

  function cleanText(value) {
    return decodeHtml(stripHtml(value)).replace(/\s+/g, ' ').trim();
  }

  function stripHtml(value) {
    return value.replace(/<[^>]+>/g, ' ');
  }

  function decodeHtml(value) {
    const namedEntities = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      nbsp: ' ',
      quot: '"'
    };

    return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
      if (code[0] === '#') {
        const isHex = code[1].toLowerCase() === 'x';
        const number = Number.parseInt(
          code.slice(isHex ? 2 : 1),
          isHex ? 16 : 10
        );
        return Number.isFinite(number)
          ? String.fromCodePoint(number)
          : entity;
      }

      return namedEntities[code.toLowerCase()] || entity;
    });
  }
})();

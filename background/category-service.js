import { extractCategories } from './parsers.js';

const CATEGORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CATEGORY_CACHE_VERSION = 3;
const MINIMUM_CATEGORY_COUNT = 20;

export class CategoryService {
  constructor({
    client,
    storage,
    now = Date.now,
    minimumCategoryCount = MINIMUM_CATEGORY_COUNT
  }) {
    this.client = client;
    this.storage = storage;
    this.now = now;
    this.minimumCategoryCount = minimumCategoryCount;
  }

  async getCategories(forceRefresh = false) {
    const cached = await this.storage.get([
      'funpayCategories',
      'funpayCategoriesUpdatedAt',
      'funpayCategoriesVersion'
    ]);
    const updatedAt = Number(cached.funpayCategoriesUpdatedAt) || 0;

    if (
      !forceRefresh &&
      cached.funpayCategoriesVersion === CATEGORY_CACHE_VERSION &&
      this.isCacheFresh(cached.funpayCategories, updatedAt)
    ) {
      return {
        categories: cached.funpayCategories,
        updatedAt,
        fromCache: true
      };
    }

    const home = await this.client.getHomePage();
    const categories = extractCategories(home.text);

    if (!this.isCategorySetValid(categories)) {
      throw new Error(
        'FunPay вернул неполный список категорий. Обновите страницу и повторите попытку.'
      );
    }

    const nextUpdatedAt = this.now();
    await this.storage.set({
      funpayCategories: categories,
      funpayCategoriesUpdatedAt: nextUpdatedAt,
      funpayCategoriesVersion: CATEGORY_CACHE_VERSION
    });

    return {
      categories,
      updatedAt: nextUpdatedAt,
      fromCache: false
    };
  }

  isCacheFresh(categories, updatedAt) {
    return (
      this.isCategorySetValid(categories) &&
      this.now() - updatedAt < CATEGORY_CACHE_TTL_MS
    );
  }

  isCategorySetValid(categories) {
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
}

import { extractCategories } from './parsers.js';

const CATEGORY_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export class CategoryService {
  constructor({ client, storage, now = Date.now }) {
    this.client = client;
    this.storage = storage;
    this.now = now;
  }

  async getCategories(forceRefresh = false) {
    const cached = await this.storage.get([
      'funpayCategories',
      'funpayCategoriesUpdatedAt'
    ]);
    const updatedAt = Number(cached.funpayCategoriesUpdatedAt) || 0;

    if (!forceRefresh && this.isCacheFresh(cached.funpayCategories, updatedAt)) {
      return {
        categories: cached.funpayCategories,
        updatedAt,
        fromCache: true
      };
    }

    const home = await this.client.getHomePage();
    const categories = extractCategories(home.text);

    if (categories.length === 0) {
      throw new Error(
        'FunPay не вернул список категорий. Возможно, изменилась разметка сайта.'
      );
    }

    const nextUpdatedAt = this.now();
    await this.storage.set({
      funpayCategories: categories,
      funpayCategoriesUpdatedAt: nextUpdatedAt
    });

    return {
      categories,
      updatedAt: nextUpdatedAt,
      fromCache: false
    };
  }

  isCacheFresh(categories, updatedAt) {
    return (
      Array.isArray(categories) &&
      categories.length > 0 &&
      this.now() - updatedAt < CATEGORY_CACHE_TTL_MS
    );
  }
}

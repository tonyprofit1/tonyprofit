import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  AppSettings,
  Ingredient,
  IngredientPriceHistory,
  IngredientPurchase,
  MenuItem,
  PackagingItem,
  Recipe,
  WasteRecord,
} from '../types';

export interface TonyCostDB extends DBSchema {
  ingredients: {
    key: string;
    value: Ingredient;
    indexes: {
      'by-category': string;
      'by-name': string;
    };
  };
  purchases: {
    key: string;
    value: IngredientPurchase;
    indexes: {
      'by-ingredient': string;
      'by-date': string;
    };
  };
  priceHistory: {
    key: string;
    value: IngredientPriceHistory;
    indexes: {
      'by-ingredient': string;
      'by-date': string;
    };
  };
  recipes: {
    key: string;
    value: Recipe;
    indexes: {
      'by-name': string;
      'by-category': string;
    };
  };
  packaging: {
    key: string;
    value: PackagingItem;
    indexes: {
      'by-name': string;
    };
  };
  menuItems: {
    key: string;
    value: MenuItem;
    indexes: {
      'by-recipe': string;
      'by-category': string;
      'by-channel': string;
    };
  };
  waste: {
    key: string;
    value: WasteRecord;
    indexes: {
      'by-ingredient': string;
      'by-date': string;
      'by-reason': string;
    };
  };
  settings: {
    key: string;
    value: { key: string; data: AppSettings };
  };
}

const DB_NAME = 'tonys_restaurant_cost_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TonyCostDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<TonyCostDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TonyCostDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Ingredients
        if (!db.objectStoreNames.contains('ingredients')) {
          const ingStore = db.createObjectStore('ingredients', { keyPath: 'id' });
          ingStore.createIndex('by-category', 'category');
          ingStore.createIndex('by-name', 'name');
        }

        // 2. Purchases
        if (!db.objectStoreNames.contains('purchases')) {
          const purStore = db.createObjectStore('purchases', { keyPath: 'id' });
          purStore.createIndex('by-ingredient', 'ingredientId');
          purStore.createIndex('by-date', 'purchaseDate');
        }

        // 3. Price History
        if (!db.objectStoreNames.contains('priceHistory')) {
          const phStore = db.createObjectStore('priceHistory', { keyPath: 'id' });
          phStore.createIndex('by-ingredient', 'ingredientId');
          phStore.createIndex('by-date', 'date');
        }

        // 4. Recipes
        if (!db.objectStoreNames.contains('recipes')) {
          const recStore = db.createObjectStore('recipes', { keyPath: 'id' });
          recStore.createIndex('by-name', 'name');
          recStore.createIndex('by-category', 'category');
        }

        // 5. Packaging
        if (!db.objectStoreNames.contains('packaging')) {
          const pkgStore = db.createObjectStore('packaging', { keyPath: 'id' });
          pkgStore.createIndex('by-name', 'name');
        }

        // 6. Menu Items
        if (!db.objectStoreNames.contains('menuItems')) {
          const menuStore = db.createObjectStore('menuItems', { keyPath: 'id' });
          menuStore.createIndex('by-recipe', 'recipeId');
          menuStore.createIndex('by-category', 'category');
          menuStore.createIndex('by-channel', 'salesChannel');
        }

        // 7. Waste
        if (!db.objectStoreNames.contains('waste')) {
          const wasteStore = db.createObjectStore('waste', { keyPath: 'id' });
          wasteStore.createIndex('by-ingredient', 'ingredientId');
          wasteStore.createIndex('by-date', 'date');
          wasteStore.createIndex('by-reason', 'reason');
        }

        // 8. Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

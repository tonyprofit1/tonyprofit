import { getDatabase } from '../database/db';
import {
  AppBackupData,
  AppSettings,
  BackupData,
  Ingredient,
  IngredientPriceHistory,
  IngredientPurchase,
  MenuItem,
  PackagingItem,
  Recipe,
  WasteRecord,
} from '../types';
import { settingsRepository } from '../repositories/settingsRepository';

/**
 * Exports all IndexedDB data into a JSON file and triggers browser download.
 */
export async function exportBackupToFile(): Promise<{ filename: string }> {
  const db = await getDatabase();
  const ingredients = await db.getAll('ingredients');
  const purchases = await db.getAll('purchases');
  const priceHistory = await db.getAll('priceHistory');
  const recipes = await db.getAll('recipes');
  const packaging = await db.getAll('packaging');
  const menuItems = await db.getAll('menuItems');
  const waste = await db.getAll('waste');
  const settings = await settingsRepository.getSettings();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filename = `tonys-cost-control-backup-${dateStr}.json`;

  const payload: AppBackupData = {
    version: 1,
    appName: "Tony's Restaurant Cost Control",
    metadata: {
      appName: "Tony's Restaurant Cost Control",
      version: 1,
      exportedAt: now.toISOString(),
    },
    exportedAt: now.toISOString(),
    ingredients,
    purchases,
    priceHistory,
    recipes,
    packaging,
    menuItems,
    waste,
    settings,
    data: {
      ingredients,
      purchases,
      priceHistory,
      recipes,
      packaging,
      menuItems,
      waste,
      settings,
    },
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Update last backup date in settings
  await settingsRepository.updateSettings({ lastBackupDate: now.toISOString() });

  return { filename };
}

/**
 * Parses and validates an uploaded JSON backup file.
 */
export async function parseAndValidateBackupFile(file: File): Promise<AppBackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('ไฟล์ว่างเปล่า (Empty file)');
        }
        const parsed = JSON.parse(text);

        // Normalize data format (support both top-level arrays and .data wrapped arrays)
        const ingredients = parsed.ingredients || parsed.data?.ingredients || [];
        const recipes = parsed.recipes || parsed.data?.recipes || [];
        const packaging = parsed.packaging || parsed.data?.packaging || [];
        const menuItems = parsed.menuItems || parsed.data?.menuItems || [];
        const purchases = parsed.purchases || parsed.data?.purchases || [];
        const priceHistory = parsed.priceHistory || parsed.data?.priceHistory || [];
        const waste = parsed.waste || parsed.data?.waste || [];
        const settings = parsed.settings || parsed.data?.settings;

        if (!Array.isArray(ingredients) || !Array.isArray(recipes)) {
          throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง ขาดตารางวัตถุดิบหรือสูตรอาหาร');
        }

        const normalized: AppBackupData = {
          version: parsed.version || 1,
          appName: parsed.appName || parsed.metadata?.appName || "Tony's Restaurant Cost Control",
          metadata: {
            appName: parsed.metadata?.appName || parsed.appName || "Tony's Restaurant Cost Control",
            version: parsed.metadata?.version || parsed.version || 1,
            exportedAt: parsed.metadata?.exportedAt || parsed.exportedAt || new Date().toISOString(),
          },
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          ingredients,
          purchases,
          priceHistory,
          recipes,
          packaging,
          menuItems,
          waste,
          settings,
        };

        resolve(normalized);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ JSON ได้';
        reject(new Error(message));
      }
    };
    reader.onerror = () => {
      reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    };
    reader.readAsText(file);
  });
}

/**
 * Restores backup data into IndexedDB.
 */
export async function restoreBackupToDatabase(backup: AppBackupData): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['ingredients', 'purchases', 'priceHistory', 'recipes', 'packaging', 'menuItems', 'waste', 'settings'],
    'readwrite'
  );

  // Clear existing
  await tx.objectStore('ingredients').clear();
  await tx.objectStore('purchases').clear();
  await tx.objectStore('priceHistory').clear();
  await tx.objectStore('recipes').clear();
  await tx.objectStore('packaging').clear();
  await tx.objectStore('menuItems').clear();
  await tx.objectStore('waste').clear();

  const ingredients = backup.ingredients || backup.data?.ingredients || [];
  const purchases = backup.purchases || backup.data?.purchases || [];
  const priceHistory = backup.priceHistory || backup.data?.priceHistory || [];
  const recipes = backup.recipes || backup.data?.recipes || [];
  const packaging = backup.packaging || backup.data?.packaging || [];
  const menuItems = backup.menuItems || backup.data?.menuItems || [];
  const waste = backup.waste || backup.data?.waste || [];
  const settings = backup.settings || backup.data?.settings;

  for (const item of ingredients) {
    await tx.objectStore('ingredients').put(item as Ingredient);
  }
  for (const item of purchases) {
    await tx.objectStore('purchases').put(item as IngredientPurchase);
  }
  for (const item of priceHistory) {
    await tx.objectStore('priceHistory').put(item as IngredientPriceHistory);
  }
  for (const item of recipes) {
    await tx.objectStore('recipes').put(item as Recipe);
  }
  for (const item of packaging) {
    await tx.objectStore('packaging').put(item as PackagingItem);
  }
  for (const item of menuItems) {
    await tx.objectStore('menuItems').put(item as MenuItem);
  }
  for (const item of waste) {
    await tx.objectStore('waste').put(item as WasteRecord);
  }
  if (settings) {
    await tx.objectStore('settings').put({ key: 'app_config', data: settings as AppSettings });
  }

  await tx.done;
}

/**
 * Resets all IndexedDB data.
 */
export async function resetAllDatabaseData(): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['ingredients', 'purchases', 'priceHistory', 'recipes', 'packaging', 'menuItems', 'waste', 'settings'],
    'readwrite'
  );
  await tx.objectStore('ingredients').clear();
  await tx.objectStore('purchases').clear();
  await tx.objectStore('priceHistory').clear();
  await tx.objectStore('recipes').clear();
  await tx.objectStore('packaging').clear();
  await tx.objectStore('menuItems').clear();
  await tx.objectStore('waste').clear();
  await tx.objectStore('settings').clear();
  await tx.done;
}

export const backupService = {
  exportBackupToFile,
  parseAndValidateBackupFile,
  restoreBackupToDatabase,
  resetAllDatabaseData,
  async exportBackupJSON() {
    return exportBackupToFile();
  },
  validateBackupData(parsed: unknown) {
    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'ไฟล์ไม่ใช่ JSON ที่ถูกต้อง' };
    }
    return { isValid: true };
  },
  importBackupJSON: restoreBackupToDatabase,
  resetAllData: resetAllDatabaseData,
};


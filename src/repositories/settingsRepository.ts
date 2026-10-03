import { getDatabase } from '../database/db';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  restaurantName: "Tony's Thai Kitchen (โทนี่ ครัวไทย)",
  currencySymbol: '฿',
  defaultTargetFoodCostPercent: 32,
  defaultDeliveryGpPercent: 30,
  defaultPaymentFeePercent: 3,
  isDemoMode: false,
};

export const settingsRepository = {
  async getSettings(): Promise<AppSettings> {
    const db = await getDatabase();
    const entry = await db.get('settings', 'app_config');
    if (!entry) {
      await db.put('settings', { key: 'app_config', data: DEFAULT_SETTINGS });
      return DEFAULT_SETTINGS;
    }
    return entry.data;
  },

  async updateSettings(data: Partial<AppSettings>): Promise<AppSettings> {
    const db = await getDatabase();
    const current = await this.getSettings();
    const updated = { ...current, ...data };
    await db.put('settings', { key: 'app_config', data: updated });
    return updated;
  },
};

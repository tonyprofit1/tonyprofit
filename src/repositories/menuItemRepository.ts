import { getDatabase } from '../database/db';
import { MenuItem, MenuItemDeliveryConfig, MenuItemPackagingItem, SalesChannel } from '../types';

export const menuItemRepository = {
  async getAll(): Promise<MenuItem[]> {
    const db = await getDatabase();
    return db.getAll('menuItems');
  },

  async getById(id: string): Promise<MenuItem | undefined> {
    const db = await getDatabase();
    return db.get('menuItems', id);
  },

  async create(data: {
    name: string;
    category: string;
    recipeId: string;
    sellingPrice: number;
    salesChannel: SalesChannel;
    packagingItems: MenuItemPackagingItem[];
    targetFoodCostPercent: number;
    deliveryConfig?: MenuItemDeliveryConfig;
    notes?: string;
  }): Promise<MenuItem> {
    const db = await getDatabase();
    const id = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const item: MenuItem = {
      id,
      name: data.name,
      category: data.category || 'อาหารจานหลัก',
      recipeId: data.recipeId,
      sellingPrice: data.sellingPrice,
      salesChannel: data.salesChannel,
      packagingItems: data.packagingItems || [],
      targetFoodCostPercent: data.targetFoodCostPercent || 35,
      deliveryConfig: data.deliveryConfig,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('menuItems', item);
    return item;
  },

  async update(
    id: string,
    data: Partial<Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<MenuItem> {
    const db = await getDatabase();
    const existing = await db.get('menuItems', id);
    if (!existing) throw new Error(`ไม่พบเมนูอาหาร ID: ${id}`);

    const now = new Date().toISOString();
    const updated: MenuItem = {
      ...existing,
      ...data,
      updatedAt: now,
    };

    await db.put('menuItems', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('menuItems', id);
  },
};

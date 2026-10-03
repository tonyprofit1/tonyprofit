import { getDatabase } from '../database/db';
import { PackagingItem } from '../types';

export const packagingRepository = {
  async getAll(): Promise<PackagingItem[]> {
    const db = await getDatabase();
    return db.getAll('packaging');
  },

  async getById(id: string): Promise<PackagingItem | undefined> {
    const db = await getDatabase();
    return db.get('packaging', id);
  },

  async create(data: {
    name: string;
    unit: string;
    price: number;
    quantityPerUnit: number;
    notes?: string;
  }): Promise<PackagingItem> {
    const db = await getDatabase();
    const id = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const qty = Math.max(1, data.quantityPerUnit || 1);
    const costPerPiece = data.price / qty;

    const item: PackagingItem = {
      id,
      name: data.name,
      unit: data.unit,
      price: data.price,
      quantityPerUnit: qty,
      costPerPiece,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('packaging', item);
    return item;
  },

  async update(
    id: string,
    data: Partial<Omit<PackagingItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<PackagingItem> {
    const db = await getDatabase();
    const existing = await db.get('packaging', id);
    if (!existing) throw new Error(`ไม่พบบรรจุภัณฑ์ ID: ${id}`);

    const price = data.price ?? existing.price;
    const quantityPerUnit = data.quantityPerUnit ?? existing.quantityPerUnit;
    const qty = Math.max(1, quantityPerUnit || 1);
    const costPerPiece = price / qty;
    const now = new Date().toISOString();

    const updated: PackagingItem = {
      ...existing,
      ...data,
      price,
      quantityPerUnit: qty,
      costPerPiece,
      updatedAt: now,
    };

    await db.put('packaging', updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('packaging', id);
  },
};

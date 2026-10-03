import { getDatabase } from '../database/db';
import { UnitType, WasteReason, WasteRecord } from '../types';
import { calculateWasteEntryCost } from '../calculations/wasteCost';
import { ingredientRepository } from './ingredientRepository';

export const wasteRepository = {
  async getAll(): Promise<WasteRecord[]> {
    const db = await getDatabase();
    const all = await db.getAll('waste');
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async recordWaste(data: {
    ingredientId: string;
    quantity: number;
    unit: UnitType;
    reason: WasteReason;
    date?: string;
    notes?: string;
  }): Promise<WasteRecord> {
    const db = await getDatabase();
    const ingredient = await ingredientRepository.getById(data.ingredientId);
    if (!ingredient) throw new Error('ไม่พบวัตถุดิบที่ระบุ');

    const id = `waste_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const calculatedCost = calculateWasteEntryCost(data.quantity, data.unit, ingredient);

    const record: WasteRecord = {
      id,
      ingredientId: data.ingredientId,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      date: data.date || now.split('T')[0],
      calculatedCost,
      notes: data.notes,
      createdAt: now,
    };

    await db.put('waste', record);
    return record;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('waste', id);
  },
};

import { getDatabase } from '../database/db';
import { IngredientPurchase } from '../types';
import { ingredientRepository } from './ingredientRepository';

export const purchaseRepository = {
  async getAll(): Promise<IngredientPurchase[]> {
    const db = await getDatabase();
    const all = await db.getAll('purchases');
    return all.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  },

  async getByIngredient(ingredientId: string): Promise<IngredientPurchase[]> {
    const db = await getDatabase();
    const all = await db.getAllFromIndex('purchases', 'by-ingredient', ingredientId);
    return all.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  },

  async recordPurchase(data: {
    ingredientId: string;
    supplier: string;
    purchaseDate: string;
    quantity: number;
    unit: IngredientPurchase['unit'];
    totalPrice: number;
    notes?: string;
    updateIngredientCurrentPrice?: boolean;
    rawStartingWeight?: number;
    scrapWeight?: number;
    usableWeight?: number;
    yieldPercent?: number;
  }): Promise<IngredientPurchase> {
    const db = await getDatabase();
    const id = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const unitPrice = data.quantity > 0 ? data.totalPrice / data.quantity : 0;

    const purchase: IngredientPurchase = {
      id,
      ingredientId: data.ingredientId,
      supplier: data.supplier,
      purchaseDate: data.purchaseDate || now.split('T')[0],
      quantity: data.quantity,
      unit: data.unit,
      totalPrice: data.totalPrice,
      unitPrice,
      rawStartingWeight: data.rawStartingWeight,
      scrapWeight: data.scrapWeight,
      usableWeight: data.usableWeight,
      yieldPercent: data.yieldPercent,
      notes: data.notes,
      createdAt: now,
    };

    await db.put('purchases', purchase);

    // If requested or default true, update the ingredient's current purchase price & unit & yield if provided
    if (data.updateIngredientCurrentPrice !== false) {
      await ingredientRepository.update(
        data.ingredientId,
        {
          purchasePrice: data.totalPrice,
          purchaseQuantity: data.quantity,
          purchaseUnit: data.unit,
          ...(data.yieldPercent !== undefined ? { usableYieldPercent: data.yieldPercent } : {}),
          ...(data.rawStartingWeight !== undefined ? { rawStartingWeight: data.rawStartingWeight } : {}),
          ...(data.scrapWeight !== undefined ? { scrapWeight: data.scrapWeight } : {}),
          ...(data.usableWeight !== undefined ? { usableWeight: data.usableWeight } : {}),
        },
        `ซื้อเข้าใหม่จาก ${data.supplier || 'ซัพพลายเออร์'} เมื่อ ${data.purchaseDate}`
      );
    }

    return purchase;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('purchases', id);
  },
};

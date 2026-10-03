import { getDatabase } from '../database/db';
import { Ingredient, IngredientPriceHistory, IngredientPurchase, normalizeIngredientCategory } from '../types';
import { calculateIngredientCost } from '../calculations/ingredientCost';

export const ingredientRepository = {
  async getAll(): Promise<Ingredient[]> {
    const db = await getDatabase();
    const items = await db.getAll('ingredients');
    return items.map((item) => ({
      ...item,
      category: normalizeIngredientCategory(item.category),
    }));
  },

  async getById(id: string): Promise<Ingredient | undefined> {
    const db = await getDatabase();
    const item = await db.get('ingredients', id);
    if (!item) return undefined;
    return {
      ...item,
      category: normalizeIngredientCategory(item.category),
    };
  },

  async create(data: Omit<Ingredient, 'id' | 'usableQuantity' | 'effectiveCostPerBaseUnit' | 'createdAt' | 'updatedAt'>): Promise<Ingredient> {
    const db = await getDatabase();
    const id = `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const calc = calculateIngredientCost(
      data.purchaseQuantity,
      data.purchaseUnit,
      data.purchasePrice,
      data.usableYieldPercent
    );

    const ingredient: Ingredient = {
      ...data,
      category: normalizeIngredientCategory(data.category),
      id,
      usableYieldPercent: data.usableYieldPercent,
      yieldPercent: data.usableYieldPercent,
      usableQuantity: calc.usableQuantity,
      effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
      rawStartingWeight: data.rawStartingWeight,
      scrapWeight: data.scrapWeight,
      usableWeight: data.usableWeight ?? calc.usableQuantity,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('ingredients', ingredient);

    // Initial purchase record
    const purchaseRecord: IngredientPurchase = {
      id: `pur_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ingredientId: id,
      supplier: 'บันทึกตอนสร้างวัตถุดิบ (Initial)',
      purchaseDate: now.split('T')[0],
      quantity: data.purchaseQuantity,
      unit: data.purchaseUnit,
      totalPrice: data.purchasePrice,
      unitPrice: data.purchaseQuantity > 0 ? data.purchasePrice / data.purchaseQuantity : 0,
      rawStartingWeight: data.rawStartingWeight,
      scrapWeight: data.scrapWeight,
      usableWeight: data.usableWeight ?? calc.usableQuantity,
      yieldPercent: data.usableYieldPercent,
      effectiveUnitCost: calc.effectiveCostPerBaseUnit,
      notes: data.notes,
      createdAt: now,
    };
    await db.put('purchases', purchaseRecord);

    // Initial price history record
    const priceRecord: IngredientPriceHistory = {
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ingredientId: id,
      date: now.split('T')[0],
      purchasePrice: data.purchasePrice,
      purchaseQuantity: data.purchaseQuantity,
      purchaseUnit: data.purchaseUnit,
      effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
      rawStartingWeight: data.rawStartingWeight,
      scrapWeight: data.scrapWeight,
      usableWeight: data.usableWeight ?? calc.usableQuantity,
      yieldPercent: data.usableYieldPercent,
      reason: 'สร้างรายการวัตถุดิบครั้งแรก (Initial)',
      createdAt: now,
    };
    await db.put('priceHistory', priceRecord);

    return ingredient;
  },

  async update(
    id: string,
    data: Partial<Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>>,
    priceChangeReason?: string
  ): Promise<Ingredient> {
    const db = await getDatabase();
    const existing = await db.get('ingredients', id);
    if (!existing) {
      throw new Error(`ไม่พบวัตถุดิบ ID: ${id}`);
    }

    const purchaseQuantity = data.purchaseQuantity ?? existing.purchaseQuantity;
    const purchaseUnit = data.purchaseUnit ?? existing.purchaseUnit;
    const purchasePrice = data.purchasePrice ?? existing.purchasePrice;
    const usableYieldPercent = data.usableYieldPercent ?? existing.usableYieldPercent;

    const calc = calculateIngredientCost(
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      usableYieldPercent
    );

    const isPriceOrQtyOrYieldChanged =
      purchasePrice !== existing.purchasePrice ||
      purchaseQuantity !== existing.purchaseQuantity ||
      purchaseUnit !== existing.purchaseUnit ||
      usableYieldPercent !== existing.usableYieldPercent;

    const now = new Date().toISOString();

    const updated: Ingredient = {
      ...existing,
      ...data,
      category: normalizeIngredientCategory(data.category ?? existing.category),
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      usableYieldPercent,
      yieldPercent: usableYieldPercent,
      usableQuantity: calc.usableQuantity,
      effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
      rawStartingWeight: data.rawStartingWeight !== undefined ? data.rawStartingWeight : existing.rawStartingWeight,
      scrapWeight: data.scrapWeight !== undefined ? data.scrapWeight : existing.scrapWeight,
      usableWeight: data.usableWeight !== undefined ? data.usableWeight : (existing.usableWeight ?? calc.usableQuantity),
      updatedAt: now,
    };

    await db.put('ingredients', updated);

    if (isPriceOrQtyOrYieldChanged) {
      const priceRecord: IngredientPriceHistory = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ingredientId: id,
        date: now.split('T')[0],
        purchasePrice,
        purchaseQuantity,
        purchaseUnit,
        effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
        rawStartingWeight: updated.rawStartingWeight,
        scrapWeight: updated.scrapWeight,
        usableWeight: updated.usableWeight,
        yieldPercent: updated.usableYieldPercent,
        reason: priceChangeReason || 'อัปเดตราคา/จำนวนซื้อ/ผลผลิต (Updated)',
        createdAt: now,
      };
      await db.put('priceHistory', priceRecord);
    }

    return updated;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('ingredients', id);
  },

  async getAllPriceHistory(): Promise<IngredientPriceHistory[]> {
    const db = await getDatabase();
    return db.getAll('priceHistory');
  },

  async getPriceHistory(ingredientId: string): Promise<IngredientPriceHistory[]> {
    const db = await getDatabase();
    const all = await db.getAllFromIndex('priceHistory', 'by-ingredient', ingredientId);
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
};

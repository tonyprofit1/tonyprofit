import { Ingredient, UnitType, WasteReason, WasteRecord } from '../types';
import { getUsageFactorToBase } from './units';

export interface WasteSummary {
  totalWasteCost: number;
  totalRecordsCount: number;
  byReason: Record<WasteReason, { count: number; totalCost: number; percentOfTotal: number }>;
  byIngredient: { ingredientId: string; ingredientName: string; totalCost: number; quantitySummary: string }[];
}

/**
 * Calculates financial cost of a waste entry based on the ingredient's effective usable cost.
 */
export function calculateWasteCost(
  quantity: number,
  unit: UnitType,
  effectiveCostPerBaseUnit: number,
  purchaseUnit: UnitType
): number {
  if (quantity <= 0) return 0;
  const baseWasteQty = getUsageFactorToBase(quantity, unit, purchaseUnit);
  return baseWasteQty * effectiveCostPerBaseUnit;
}

export function calculateWasteEntryCost(
  wasteQuantity: number,
  wasteUnit: UnitType,
  ingredient: Ingredient
): number {
  return calculateWasteCost(
    wasteQuantity,
    wasteUnit,
    ingredient.effectiveCostPerBaseUnit,
    ingredient.purchaseUnit
  );
}

/**
 * Aggregates waste records into category summaries and top loss areas.
 */
export function summarizeWaste(
  wasteRecords: WasteRecord[],
  ingredientsMap: Map<string, Ingredient>
): WasteSummary {
  let totalWasteCost = 0;

  const reasonAccumulator: Record<WasteReason, { count: number; totalCost: number }> = {
    Spoilage: { count: 0, totalCost: 0 },
    Overproduction: { count: 0, totalCost: 0 },
    'Preparation Loss': { count: 0, totalCost: 0 },
    'Cooking Error': { count: 0, totalCost: 0 },
    'Customer Return': { count: 0, totalCost: 0 },
    Damaged: { count: 0, totalCost: 0 },
    Expired: { count: 0, totalCost: 0 },
    Other: { count: 0, totalCost: 0 },
  };

  const ingredientAccumulator = new Map<string, { totalCost: number; quantities: { qty: number; unit: UnitType }[] }>();

  for (const record of wasteRecords) {
    const cost = record.calculatedCost || 0;
    totalWasteCost += cost;

    if (reasonAccumulator[record.reason]) {
      reasonAccumulator[record.reason].count += 1;
      reasonAccumulator[record.reason].totalCost += cost;
    }

    const currentIng = ingredientAccumulator.get(record.ingredientId) || { totalCost: 0, quantities: [] };
    currentIng.totalCost += cost;
    currentIng.quantities.push({ qty: record.quantity, unit: record.unit });
    ingredientAccumulator.set(record.ingredientId, currentIng);
  }

  const byReason = Object.entries(reasonAccumulator).reduce((acc, [key, val]) => {
    const reasonKey = key as WasteReason;
    acc[reasonKey] = {
      count: val.count,
      totalCost: val.totalCost,
      percentOfTotal: totalWasteCost > 0 ? (val.totalCost / totalWasteCost) * 100 : 0,
    };
    return acc;
  }, {} as WasteSummary['byReason']);

  const byIngredient: WasteSummary['byIngredient'] = Array.from(ingredientAccumulator.entries())
    .map(([ingredientId, data]) => {
      const ing = ingredientsMap.get(ingredientId);
      const name = ing ? ing.name : 'วัตถุดิบที่ถูกลบ';
      const qtyStr = data.quantities.map((q) => `${q.qty} ${q.unit}`).join(', ');
      return {
        ingredientId,
        ingredientName: name,
        totalCost: data.totalCost,
        quantitySummary: qtyStr,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost);

  return {
    totalWasteCost,
    totalRecordsCount: wasteRecords.length,
    byReason,
    byIngredient,
  };
}

import { UnitType } from '../types';

export type DimensionType = 'weight' | 'volume' | 'count';

export const UNIT_DIMENSIONS: Record<UnitType, DimensionType> = {
  g: 'weight',
  kg: 'weight',
  ml: 'volume',
  L: 'volume',
  piece: 'count',
  pack: 'count',
  bottle: 'count',
  box: 'count',
};

export const BASE_UNITS: Record<DimensionType, UnitType> = {
  weight: 'g',
  volume: 'ml',
  count: 'piece',
};

/**
 * Returns whether two units can be mathematically converted directly
 * without needing a custom density / weight-to-volume or piece conversion.
 */
export function areUnitsCompatible(fromUnit: UnitType, toUnit: UnitType): boolean {
  if (fromUnit === toUnit) return true;
  const dimFrom = UNIT_DIMENSIONS[fromUnit];
  const dimTo = UNIT_DIMENSIONS[toUnit];
  if (dimFrom !== dimTo) return false;
  // Weight or volume within same dimension is convertible
  if (dimFrom === 'weight' || dimFrom === 'volume') return true;
  // Count items of different names (e.g. piece vs pack) cannot be converted without ratio
  return false;
}

/**
 * Converts a quantity from one standard unit to another within the same dimension.
 * Throws an error or returns null if conversion is invalid.
 */
export function convertUnit(quantity: number, fromUnit: UnitType, toUnit: UnitType): number {
  if (quantity === 0) return 0;
  if (fromUnit === toUnit) return quantity;

  // Weight: base is gram (g)
  if (fromUnit === 'kg' && toUnit === 'g') {
    return quantity * 1000;
  }
  if (fromUnit === 'g' && toUnit === 'kg') {
    return quantity / 1000;
  }

  // Volume: base is milliliter (ml)
  if (fromUnit === 'L' && toUnit === 'ml') {
    return quantity * 1000;
  }
  if (fromUnit === 'ml' && toUnit === 'L') {
    return quantity / 1000;
  }

  throw new Error(`ไม่สามารถแปลงหน่วยจาก ${fromUnit} ไปเป็น ${toUnit} ได้โดยตรง (Invalid unit conversion)`);
}

/**
 * Converts any quantity to its standard base unit:
 * - kg -> g (x 1000)
 * - g -> g (x 1)
 * - L -> ml (x 1000)
 * - ml -> ml (x 1)
 * - piece/pack/bottle/box -> as is (x 1)
 */
export function toBaseUnitQuantity(quantity: number, unit: UnitType): { baseQuantity: number; baseUnit: UnitType } {
  switch (unit) {
    case 'kg':
      return { baseQuantity: quantity * 1000, baseUnit: 'g' };
    case 'g':
      return { baseQuantity: quantity, baseUnit: 'g' };
    case 'L':
      return { baseQuantity: quantity * 1000, baseUnit: 'ml' };
    case 'ml':
      return { baseQuantity: quantity, baseUnit: 'ml' };
    case 'piece':
    case 'pack':
    case 'bottle':
    case 'box':
    default:
      return { baseQuantity: quantity, baseUnit: unit };
  }
}

/**
 * Given a purchase unit and recipe usage unit, computes the conversion factor.
 * (e.g. Purchase is kg, Usage is g -> Factor is 1/1000)
 */
export function getUsageFactorToBase(usageQty: number, usageUnit: UnitType, purchaseUnit: UnitType): number {
  if (usageUnit === purchaseUnit) return usageQty;

  const dimUsage = UNIT_DIMENSIONS[usageUnit];
  const dimPurchase = UNIT_DIMENSIONS[purchaseUnit];

  if (dimUsage !== dimPurchase) {
    throw new Error(`หน่วย ${usageUnit} ไม่ตรงกับมิติของหน่วยซื้อ ${purchaseUnit}`);
  }

  if (dimUsage === 'weight') {
    // Both are weight -> convert usageQty to grams
    const baseUsage = usageUnit === 'kg' ? usageQty * 1000 : usageQty;
    return baseUsage; // in grams
  }

  if (dimUsage === 'volume') {
    // Both are volume -> convert usageQty to ml
    const baseUsage = usageUnit === 'L' ? usageQty * 1000 : usageQty;
    return baseUsage; // in ml
  }

  if (usageUnit !== purchaseUnit) {
    throw new Error(`ไม่สามารถเทียบหน่วย ${usageUnit} กับ ${purchaseUnit} ได้`);
  }

  return usageQty;
}

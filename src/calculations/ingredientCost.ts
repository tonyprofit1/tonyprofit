import { UnitType } from '../types';
import { toBaseUnitQuantity } from './units';

export interface IngredientCalculationResult {
  purchaseQuantity: number;
  purchaseUnit: UnitType;
  purchasePrice: number;
  usableYieldPercent: number;
  
  basePurchaseQuantity: number; // e.g. 1,000 g
  baseUnit: UnitType;           // 'g' | 'ml' | 'piece' ...
  usableQuantity: number;       // e.g. 900 g
  yieldLossPercent: number;     // e.g. 10%
  scrapQuantity: number;        // e.g. 100 g

  rawCostPerBaseUnit: number;       // e.g. 95 / 1000 = 0.095 THB/g
  effectiveCostPerBaseUnit: number; // e.g. 95 / 900 = 0.105555... THB/g
  yieldCostPremiumPerBaseUnit: number; // difference due to yield waste
}

/**
 * Deterministically calculates all cost, yield, and effective usable values for an ingredient.
 * Maintains full precision floating-point numbers for downstream consumption.
 */
export function calculateIngredientCost(
  purchaseQuantity: number,
  purchaseUnit: UnitType,
  purchasePrice: number,
  usableYieldPercent: number
): IngredientCalculationResult {
  if (purchaseQuantity <= 0) {
    throw new Error('จำนวนที่ซื้อต้องมากกว่า 0 (Purchase quantity must be > 0)');
  }
  if (purchasePrice < 0) {
    throw new Error('ราคาซื้อต้องไม่ติดลบ (Purchase price cannot be negative)');
  }
  if (usableYieldPercent <= 0 || usableYieldPercent > 100) {
    throw new Error('เปอร์เซ็นต์ผลผลิตที่ใช้ได้ (Yield %) ต้องอยู่ระหว่าง 0.01% ถึง 100%');
  }

  const { baseQuantity, baseUnit } = toBaseUnitQuantity(purchaseQuantity, purchaseUnit);
  const yieldRatio = usableYieldPercent / 100;
  const usableQuantity = baseQuantity * yieldRatio;
  const scrapQuantity = baseQuantity - usableQuantity;
  const yieldLossPercent = 100 - usableYieldPercent;

  const rawCostPerBaseUnit = purchasePrice / baseQuantity;
  const effectiveCostPerBaseUnit = purchasePrice / usableQuantity;
  const yieldCostPremiumPerBaseUnit = effectiveCostPerBaseUnit - rawCostPerBaseUnit;

  return {
    purchaseQuantity,
    purchaseUnit,
    purchasePrice,
    usableYieldPercent,
    basePurchaseQuantity: baseQuantity,
    baseUnit,
    usableQuantity,
    yieldLossPercent,
    scrapQuantity,
    rawCostPerBaseUnit,
    effectiveCostPerBaseUnit,
    yieldCostPremiumPerBaseUnit,
  };
}

/**
 * Calculates yield percentage given raw starting weight/volume and trimmed edible usable weight/volume.
 * E.g. Raw 1000g, Usable 900g -> 90%
 */
export function calculateYieldFromWeights(rawQuantity: number, usableQuantity: number): number {
  if (rawQuantity <= 0) return 100;
  if (usableQuantity < 0) return 0;
  const yieldPct = (usableQuantity / rawQuantity) * 100;
  return Math.min(100, Math.max(0, yieldPct));
}

export interface PrepLossCalculationResult {
  preCookWeight: number;
  cookedWeight: number;
  cookingLossWeight: number;
  prepLossPercent: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Calculates cooking / prep loss percentage and lost weight given pre-cook and cooked weights.
 * Formula:
 * cookingLossWeight = preCookWeight - cookedWeight
 * prepLossPercent = ((preCookWeight - cookedWeight) / preCookWeight) * 100
 */
export function calculatePrepLossFromWeights(
  preCookWeight: number,
  cookedWeight: number
): PrepLossCalculationResult {
  if (preCookWeight <= 0) {
    return {
      preCookWeight,
      cookedWeight,
      cookingLossWeight: 0,
      prepLossPercent: 0,
      isValid: false,
      errorMessage: 'น้ำหนักก่อนปรุงต้องมากกว่า 0',
    };
  }

  if (cookedWeight < 0) {
    return {
      preCookWeight,
      cookedWeight,
      cookingLossWeight: 0,
      prepLossPercent: 0,
      isValid: false,
      errorMessage: 'น้ำหนักหลังปรุงต้องไม่ติดลบ',
    };
  }

  if (cookedWeight > preCookWeight) {
    return {
      preCookWeight,
      cookedWeight,
      cookingLossWeight: 0,
      prepLossPercent: 0,
      isValid: false,
      errorMessage: 'น้ำหนักหลังปรุงต้องไม่มากกว่าน้ำหนักก่อนปรุง',
    };
  }

  const cookingLossWeight = preCookWeight - cookedWeight;
  const prepLossPercent = (cookingLossWeight / preCookWeight) * 100;

  return {
    preCookWeight,
    cookedWeight,
    cookingLossWeight,
    prepLossPercent,
    isValid: true,
  };
}


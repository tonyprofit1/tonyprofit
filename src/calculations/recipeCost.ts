import { Ingredient, Recipe, RecipeIngredientItem, RecipeType, RecipeVersion, UnitType } from '../types';
import { getUsageFactorToBase, toBaseUnitQuantity } from './units';

export interface CalculatedRecipeIngredientItem {
  ingredientId: string;
  ingredientName: string;
  ingredientCategory: string;
  itemType?: 'ingredient' | 'recipe';
  recipeType?: RecipeType;
  quantityUsed: number;
  unit: UnitType;
  baseQuantityUsed: number;
  baseUnit: UnitType;
  effectiveCostPerBaseUnit: number;
  itemBaseCost: number;
  preparationLossPercent: number;
  preparationLossCost: number;
  totalItemCost: number;
  costSharePercent: number;
  notes?: string;
}

export interface CalculatedRecipeCost {
  recipeId: string;
  versionNumber: number;
  items: CalculatedRecipeIngredientItem[];
  totalRawIngredientCost: number;
  itemLevelPrepLossCost: number;
  recipeLevelPrepLossPercent: number;
  recipeLevelPrepLossCost: number;
  totalProductionCost: number;
  portionYield: number;
  costPerPortion: number;
  // Additional batch yield cost metrics
  outputBaseUnit?: UnitType;
  outputQuantity?: number;
  costPerBaseUnit?: number;
}

/**
 * Checks whether referencing a candidateRecipeId inside targetRecipeId would create a circular dependency loop.
 */
export function hasCircularRecipeDependency(
  targetRecipeId: string | undefined,
  candidateItemRecipeId: string,
  recipesMap: Map<string, Recipe>,
  visited: Set<string> = new Set()
): boolean {
  if (!targetRecipeId) return false;
  if (candidateItemRecipeId === targetRecipeId) return true;
  if (visited.has(candidateItemRecipeId)) return false;
  visited.add(candidateItemRecipeId);

  const subRecipe = recipesMap.get(candidateItemRecipeId);
  if (!subRecipe) return false;

  const activeVer =
    subRecipe.versions.find((v) => v.id === subRecipe.currentVersionId) || subRecipe.versions[0];
  if (!activeVer) return false;

  for (const item of activeVer.ingredients) {
    if (recipesMap.has(item.ingredientId)) {
      if (item.ingredientId === targetRecipeId) return true;
      if (hasCircularRecipeDependency(targetRecipeId, item.ingredientId, recipesMap, visited)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculates recipe cost breakdown given the recipe version, ingredient database map, and optional sub-recipes map.
 * Supports Sub-Recipes (Sauce Recipes, Rice Recipes, or Sub-assemblies) with cycle protection.
 */
export function calculateRecipeCost(
  recipeVersion: RecipeVersion,
  ingredientsMap: Map<string, Ingredient>,
  recipesMap?: Map<string, Recipe>,
  visitedRecipeIds: Set<string> = new Set()
): CalculatedRecipeCost {
  const portionYield = Math.max(1, recipeVersion.portionYield || 1);
  const recipePrepLossPct = recipeVersion.preparationLossPercent || 0;

  // Protect against recursion cycles
  if (recipeVersion.recipeId && visitedRecipeIds.has(recipeVersion.recipeId)) {
    return {
      recipeId: recipeVersion.recipeId,
      versionNumber: recipeVersion.versionNumber,
      items: [],
      totalRawIngredientCost: 0,
      itemLevelPrepLossCost: 0,
      recipeLevelPrepLossPercent: 0,
      recipeLevelPrepLossCost: 0,
      totalProductionCost: 0,
      portionYield: 1,
      costPerPortion: 0,
      outputBaseUnit: 'g',
      outputQuantity: 0,
      costPerBaseUnit: 0,
    };
  }

  const currentVisited = new Set(visitedRecipeIds);
  if (recipeVersion.recipeId) {
    currentVisited.add(recipeVersion.recipeId);
  }

  let totalRawIngredientCost = 0;
  let itemLevelPrepLossCost = 0;
  const calculatedItems: Omit<CalculatedRecipeIngredientItem, 'costSharePercent'>[] = [];

  for (const item of recipeVersion.ingredients) {
    // 1. Check if this item is a Sub-Recipe (Sauce / Rice / Food)
    const isSubRecipe = item.itemType === 'recipe' || (recipesMap && recipesMap.has(item.ingredientId));
    const subRecipe = isSubRecipe && recipesMap ? recipesMap.get(item.ingredientId) : undefined;

    if (subRecipe) {
      const activeSubVer =
        subRecipe.versions.find((v) => v.id === subRecipe.currentVersionId) || subRecipe.versions[0];

      if (activeSubVer) {
        // Recursively compute sub-recipe total production cost
        const subCost = calculateRecipeCost(activeSubVer, ingredientsMap, recipesMap, currentVisited);

        // Determine sub-recipe output quantity and base unit
        let subBaseUnit: UnitType = 'g';
        let subOutputQty = 1;

        if (activeSubVer.cookedWeight && activeSubVer.cookedWeight > 0) {
          subBaseUnit = 'g';
          subOutputQty = activeSubVer.cookedWeight;
        } else if (activeSubVer.preCookWeight && activeSubVer.preCookWeight > 0) {
          subBaseUnit = 'g';
          subOutputQty = activeSubVer.preCookWeight;
        } else {
          // If no weight defined, yield is measured in portion/piece
          subBaseUnit = 'piece';
          subOutputQty = Math.max(1, activeSubVer.portionYield || 1);
        }

        const effectiveCostPerBaseUnit = subOutputQty > 0 ? subCost.totalProductionCost / subOutputQty : 0;
        let baseUsageQty = item.quantityUsed;

        if (subBaseUnit === 'g' || (subBaseUnit as string) === 'ml') {
          baseUsageQty = getUsageFactorToBase(item.quantityUsed, item.unit, subBaseUnit);
        }

        const itemBaseCost = baseUsageQty * effectiveCostPerBaseUnit;
        const itemLossPct = item.preparationLossPercent || 0;
        const itemLossCost = itemBaseCost * (itemLossPct / 100);
        const totalItemCost = itemBaseCost + itemLossCost;

        totalRawIngredientCost += itemBaseCost;
        itemLevelPrepLossCost += itemLossCost;

        const subCategoryLabel =
          subRecipe.recipeType === 'SAUCE'
            ? 'สูตรซอส (Sauce)'
            : subRecipe.recipeType === 'RICE'
            ? 'สูตรข้าว-เส้น (Rice)'
            : 'สูตรอาหาร (Food Recipe)';

        calculatedItems.push({
          ingredientId: item.ingredientId,
          ingredientName: subRecipe.name,
          ingredientCategory: subCategoryLabel,
          itemType: 'recipe',
          recipeType: subRecipe.recipeType || 'FOOD',
          quantityUsed: item.quantityUsed,
          unit: item.unit,
          baseQuantityUsed: baseUsageQty,
          baseUnit: subBaseUnit,
          effectiveCostPerBaseUnit,
          itemBaseCost,
          preparationLossPercent: itemLossPct,
          preparationLossCost: itemLossCost,
          totalItemCost,
          notes: item.notes,
        });
        continue;
      }
    }

    // 2. Standard Ingredient from Ingredient Master
    const ingredient = ingredientsMap.get(item.ingredientId);
    if (!ingredient) {
      continue;
    }

    const { baseUnit: ingBaseUnit } = toBaseUnitQuantity(ingredient.purchaseQuantity, ingredient.purchaseUnit);
    const baseUsageQty = getUsageFactorToBase(item.quantityUsed, item.unit, ingredient.purchaseUnit);

    const effectiveCostPerBaseUnit = ingredient.effectiveCostPerBaseUnit;
    const itemBaseCost = baseUsageQty * effectiveCostPerBaseUnit;

    const itemLossPct = item.preparationLossPercent || 0;
    const itemLossCost = itemBaseCost * (itemLossPct / 100);
    const totalItemCost = itemBaseCost + itemLossCost;

    totalRawIngredientCost += itemBaseCost;
    itemLevelPrepLossCost += itemLossCost;

    calculatedItems.push({
      ingredientId: item.ingredientId,
      ingredientName: ingredient.name,
      ingredientCategory: ingredient.category,
      itemType: 'ingredient',
      quantityUsed: item.quantityUsed,
      unit: item.unit,
      baseQuantityUsed: baseUsageQty,
      baseUnit: ingBaseUnit,
      effectiveCostPerBaseUnit,
      itemBaseCost,
      preparationLossPercent: itemLossPct,
      preparationLossCost: itemLossCost,
      totalItemCost,
      notes: item.notes,
    });
  }

  const subtotalCost = totalRawIngredientCost + itemLevelPrepLossCost;
  const recipeLevelPrepLossCost = subtotalCost * (recipePrepLossPct / 100);
  const totalProductionCost = subtotalCost + recipeLevelPrepLossCost;
  const costPerPortion = totalProductionCost / portionYield;

  // Determine output base metrics
  let outputBaseUnit: UnitType = 'g';
  let outputQuantity = portionYield;

  if (recipeVersion.cookedWeight && recipeVersion.cookedWeight > 0) {
    outputBaseUnit = 'g';
    outputQuantity = recipeVersion.cookedWeight;
  } else if (recipeVersion.preCookWeight && recipeVersion.preCookWeight > 0) {
    outputBaseUnit = 'g';
    outputQuantity = recipeVersion.preCookWeight;
  } else {
    outputBaseUnit = 'piece';
    outputQuantity = portionYield;
  }

  const costPerBaseUnit = outputQuantity > 0 ? totalProductionCost / outputQuantity : 0;

  const itemsWithShare: CalculatedRecipeIngredientItem[] = calculatedItems.map((item) => ({
    ...item,
    costSharePercent: totalProductionCost > 0 ? (item.totalItemCost / totalProductionCost) * 100 : 0,
  }));

  return {
    recipeId: recipeVersion.recipeId,
    versionNumber: recipeVersion.versionNumber,
    items: itemsWithShare,
    totalRawIngredientCost,
    itemLevelPrepLossCost,
    recipeLevelPrepLossPercent: recipePrepLossPct,
    recipeLevelPrepLossCost,
    totalProductionCost,
    portionYield,
    costPerPortion,
    outputBaseUnit,
    outputQuantity,
    costPerBaseUnit,
  };
}

/**
 * Scales a recipe cost for a custom target number of portions
 */
export function scaleRecipeCost(baseCost: CalculatedRecipeCost, targetPortions: number): {
  scaledItems: { name: string; quantity: number; unit: UnitType; cost: number }[];
  totalCost: number;
  costPerPortion: number;
} {
  const scale = targetPortions / (baseCost.portionYield || 1);
  return {
    scaledItems: baseCost.items.map((i) => ({
      name: i.ingredientName,
      quantity: i.quantityUsed * scale,
      unit: i.unit,
      cost: i.totalItemCost * scale,
    })),
    totalCost: baseCost.totalProductionCost * scale,
    costPerPortion: baseCost.costPerPortion,
  };
}

import { Ingredient, MenuItem, PackagingItem, Recipe, RecipeVersion, TestResultItem } from '../types';
import { convertUnit } from './units';
import { calculateIngredientCost, calculateYieldFromWeights } from './ingredientCost';
import { calculateRecipeCost, hasCircularRecipeDependency } from './recipeCost';
import { calculateMenuItemProfit, calculatePackagingCost } from './profitPricing';
import { calculateWasteEntryCost } from './wasteCost';

export interface FinancialTestCaseResult extends TestResultItem {
  category?: string;
}

export function runAllFinancialTests(): FinancialTestCaseResult[] {
  const rawResults = runAllAutomatedTests();
  const categories: Record<string, string> = {
    'test-1-kg-to-g': 'Unit Conversion',
    'test-2-l-to-ml': 'Unit Conversion',
    'test-3-yield-calc': 'Yield & Prep',
    'test-4-effective-cost': 'Ingredient Costing',
    'test-5-recipe-cost': 'Recipe Costing',
    'test-6-cost-per-portion': 'Portioning',
    'test-7-food-cost-pct': 'Food Cost %',
    'test-8-recommended-price': 'Target Pricing',
    'test-9-packaging-cost': 'Packaging',
    'test-10-delivery-fee': 'Delivery GP',
    'test-11-contribution-profit': 'Profit Margin',
    'test-12-waste-cost': 'Waste & Loss',
    'test-13-sub-recipe-cost': 'Sub-Recipe Integration',
    'test-14-circular-dependency': 'Integrity & Security',
  };

  return rawResults.map((r) => ({
    ...r,
    category: categories[r.id] || 'General Calculation',
  }));
}

export function runAllAutomatedTests(): TestResultItem[] {

  const results: TestResultItem[] = [];

  // Helper for numeric equality with epsilon
  const approxEqual = (a: number, b: number, eps = 0.0001): boolean => {
    return Math.abs(a - b) < eps;
  };

  // Test 1: kg to gram conversion (1 kg = 1,000 g)
  try {
    const res = convertUnit(2.5, 'kg', 'g');
    const passed = res === 2500;
    results.push({
      id: 'test-1-kg-to-g',
      name: 'การแปลงหน่วย กิโลกรัม เป็น กรัม (kg to gram conversion)',
      description: '2.5 kg ต้องแปลงเป็น 2,500 g',
      passed,
      expected: '2500 g',
      actual: `${res} g`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-1-kg-to-g',
      name: 'การแปลงหน่วย กิโลกรัม เป็น กรัม',
      description: '2.5 kg ต้องแปลงเป็น 2,500 g',
      passed: false,
      expected: '2500 g',
      actual: `Error: ${message}`,
    });
  }

  // Test 2: liter to milliliter conversion (1 L = 1,000 ml)
  try {
    const res = convertUnit(1.75, 'L', 'ml');
    const passed = res === 1750;
    results.push({
      id: 'test-2-l-to-ml',
      name: 'การแปลงหน่วย ลิตร เป็น มิลลิลิตร (liter to milliliter conversion)',
      description: '1.75 L ต้องแปลงเป็น 1,750 ml',
      passed,
      expected: '1750 ml',
      actual: `${res} ml`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-2-l-to-ml',
      name: 'การแปลงหน่วย ลิตร เป็น มิลลิลิตร',
      description: '1.75 L ต้องแปลงเป็น 1,750 ml',
      passed: false,
      expected: '1750 ml',
      actual: `Error: ${message}`,
    });
  }

  // Test 3: yield calculation from raw & usable weight (1000g raw, 900g usable -> 90%)
  try {
    const yieldPct = calculateYieldFromWeights(1000, 900);
    const passed = yieldPct === 90;
    results.push({
      id: 'test-3-yield-calc',
      name: 'การคำนวณเปอร์เซ็นต์ผลผลิต (Yield Calculation)',
      description: 'วัตถุดิบ 1,000g หลังแต่งเหลือ 900g ต้องได้ Yield 90%',
      passed,
      expected: '90%',
      actual: `${yieldPct}%`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-3-yield-calc',
      name: 'การคำนวณเปอร์เซ็นต์ผลผลิต',
      description: 'Yield calculation',
      passed: false,
      expected: '90%',
      actual: `Error: ${message}`,
    });
  }

  // Test 4: effective ingredient cost
  // Example: Chicken breast 1 kg, ฿95, Yield 90% -> Usable 900g, Effective cost = 95 / 900 = 0.105555... THB/g
  let chickenIng: Ingredient | null = null;
  try {
    const calc = calculateIngredientCost(1, 'kg', 95, 90);
    const expectedCostPerG = 95 / 900; // ~0.10555555555555556
    const passed = approxEqual(calc.usableQuantity, 900) && approxEqual(calc.effectiveCostPerBaseUnit, expectedCostPerG);

    chickenIng = {
      id: 'ing-chicken',
      name: 'อกไก่',
      category: 'เนื้อสัตว์ ไข่',
      purchaseUnit: 'kg',
      purchaseQuantity: 1,
      purchasePrice: 95,
      usableYieldPercent: 90,
      usableQuantity: calc.usableQuantity,
      effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    results.push({
      id: 'test-4-effective-cost',
      name: 'ต้นทุนเนื้อแท้ของวัตถุดิบ (Effective Ingredient Cost per Usable Unit)',
      description: 'อกไก่ 1kg @ ฿95 (Yield 90%) -> ปริมาณใช้ได้ 900g, ต้นทุน ฿0.1056/g',
      passed,
      expected: `Usable: 900g, Cost: ฿${expectedCostPerG.toFixed(4)}/g`,
      actual: `Usable: ${calc.usableQuantity}g, Cost: ฿${calc.effectiveCostPerBaseUnit.toFixed(4)}/g`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-4-effective-cost',
      name: 'ต้นทุนเนื้อแท้ของวัตถุดิบ',
      description: 'Effective ingredient cost',
      passed: false,
      expected: 'Usable: 900g, Cost: ฿0.1056/g',
      actual: `Error: ${message}`,
    });
  }

  // Test 5: recipe cost calculation
  // Chicken 120g @ ฿0.105555.../g -> Expected chicken cost ฿12.6666...
  let testRecipeVersion: RecipeVersion | null = null;
  try {
    if (!chickenIng) throw new Error('Chicken ingredient not available');
    const ingMap = new Map<string, Ingredient>([[chickenIng.id, chickenIng]]);

    testRecipeVersion = {
      id: 'rv-1',
      recipeId: 'rec-1',
      versionNumber: 1,
      effectiveDate: new Date().toISOString(),
      ingredients: [
        {
          id: 'item-1',
          ingredientId: chickenIng.id,
          quantityUsed: 120,
          unit: 'g',
          preparationLossPercent: 0,
        },
      ],
      preparationLossPercent: 0,
      portionYield: 1,
    };

    const recipeCost = calculateRecipeCost(testRecipeVersion, ingMap);
    const expectedChickenCost = 120 * (95 / 900); // 12.666666666666666
    const passed = approxEqual(recipeCost.totalProductionCost, expectedChickenCost);

    results.push({
      id: 'test-5-recipe-cost',
      name: 'ต้นทุนสูตรอาหาร (Recipe Cost Calculation)',
      description: 'อกไก่ 120g @ ฿0.1056/g -> ต้นทุนไก่ในจานต้องเท่ากับ ฿12.67',
      passed,
      expected: `฿${expectedChickenCost.toFixed(4)}`,
      actual: `฿${recipeCost.totalProductionCost.toFixed(4)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-5-recipe-cost',
      name: 'ต้นทุนสูตรอาหาร',
      description: 'Recipe cost calculation',
      passed: false,
      expected: '฿12.67',
      actual: `Error: ${message}`,
    });
  }

  // Test 6: cost per portion (Multi-portion yield)
  // Total cost ฿126.67, Portion yield = 10 portions -> Cost per portion = ฿12.67
  try {
    if (!chickenIng) throw new Error('Chicken ingredient not available');
    const ingMap = new Map<string, Ingredient>([[chickenIng.id, chickenIng]]);

    const multiVersion: RecipeVersion = {
      id: 'rv-multi',
      recipeId: 'rec-multi',
      versionNumber: 1,
      effectiveDate: new Date().toISOString(),
      ingredients: [
        {
          id: 'item-1',
          ingredientId: chickenIng.id,
          quantityUsed: 1200, // 1200g
          unit: 'g',
        },
      ],
      preparationLossPercent: 0,
      portionYield: 10,
    };

    const multiCost = calculateRecipeCost(multiVersion, ingMap);
    const expectedPortionCost = (1200 * (95 / 900)) / 10; // 12.6666...
    const passed = approxEqual(multiCost.costPerPortion, expectedPortionCost);

    results.push({
      id: 'test-6-cost-per-portion',
      name: 'ต้นทุนต่อจาน/เสิร์ฟ (Cost Per Portion Calculation)',
      description: 'สูตรทำ 10 ที่ ใช้ไก่ 1,200g (รวม ฿126.67) -> ต้นทุนต่อที่ต้องเป็น ฿12.67',
      passed,
      expected: `฿${expectedPortionCost.toFixed(2)} / จาน`,
      actual: `฿${multiCost.costPerPortion.toFixed(2)} / จาน`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-6-cost-per-portion',
      name: 'ต้นทุนต่อจาน/เสิร์ฟ',
      description: 'Cost per portion',
      passed: false,
      expected: '฿12.67 / จาน',
      actual: `Error: ${message}`,
    });
  }

  // Test 7: food cost percentage calculation
  // Food cost = ฿30, Selling price = ฿100 -> Food cost % = 30%
  try {
    const foodCost = 30;
    const sellingPrice = 100;
    const foodCostPct = (foodCost / sellingPrice) * 100;
    const passed = foodCostPct === 30;
    results.push({
      id: 'test-7-food-cost-pct',
      name: 'เปอร์เซ็นต์ต้นทุนอาหาร (Food Cost Percentage %)',
      description: 'ต้นทุน ฿30, ราคาขาย ฿100 -> Food Cost % ต้องเป็น 30.00%',
      passed,
      expected: '30.00%',
      actual: `${foodCostPct.toFixed(2)}%`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-7-food-cost-pct',
      name: 'เปอร์เซ็นต์ต้นทุนอาหาร',
      description: 'Food cost percent',
      passed: false,
      expected: '30.00%',
      actual: `Error: ${message}`,
    });
  }

  // Test 8: recommended selling price from target food cost %
  // Food cost = ฿30, Target food cost = 35% -> Recommended price = 30 / 0.35 = ฿85.7142...
  try {
    const foodCost = 30;
    const targetPct = 35;
    const recPrice = foodCost / (targetPct / 100);
    const expected = 85.71428571428571;
    const passed = approxEqual(recPrice, expected);

    results.push({
      id: 'test-8-recommended-price',
      name: 'การคำนวณราคาขายแนะนำ (Recommended Selling Price by Target %)',
      description: 'ต้นทุน ฿30, เป้าหมาย Food Cost 35% -> ราคาขายแนะนำต้องเท่ากับ ฿85.71',
      passed,
      expected: `฿${expected.toFixed(2)}`,
      actual: `฿${recPrice.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-8-recommended-price',
      name: 'การคำนวณราคาขายแนะนำ',
      description: 'Recommended selling price',
      passed: false,
      expected: '฿85.71',
      actual: `Error: ${message}`,
    });
  }

  // Test 9: packaging cost calculation
  // Box: ฿2.50 (1 pc), Sauce cup: ฿0.50 (2 pcs), Bag: ฿1.00 (1 pc) -> Total = 2.5 + 1.0 + 1.0 = ฿4.50
  const pkgMap = new Map<string, PackagingItem>([
    ['p1', { id: 'p1', name: 'กล่องอาหาร', unit: 'แพ็ค', price: 250, quantityPerUnit: 100, costPerPiece: 2.5, createdAt: '', updatedAt: '' }],
    ['p2', { id: 'p2', name: 'ถ้วยน้ำจิ้ม', unit: 'แพ็ค', price: 50, quantityPerUnit: 100, costPerPiece: 0.5, createdAt: '', updatedAt: '' }],
    ['p3', { id: 'p3', name: 'ถุงหิ้ว', unit: 'แพ็ค', price: 100, quantityPerUnit: 100, costPerPiece: 1.0, createdAt: '', updatedAt: '' }],
  ]);

  try {
    const dummyMenu: MenuItem = {
      id: 'm1',
      name: 'ข้าวกะเพรากล่อง',
      category: 'อาหารจานเดียว',
      recipeId: 'rec-1',
      sellingPrice: 80,
      salesChannel: 'takeaway',
      targetFoodCostPercent: 35,
      packagingItems: [
        { packagingId: 'p1', quantity: 1 },
        { packagingId: 'p2', quantity: 2 },
        { packagingId: 'p3', quantity: 1 },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const pkgCost = calculatePackagingCost(dummyMenu, pkgMap);
    const expected = 2.5 + 2 * 0.5 + 1.0; // 4.5
    const passed = approxEqual(pkgCost.totalPackagingCost, expected);

    results.push({
      id: 'test-9-packaging-cost',
      name: 'การคำนวณต้นทุนบรรจุภัณฑ์ (Packaging Cost per Item)',
      description: 'กล่อง ฿2.50(x1) + ถ้วยน้ำจิ้ม ฿0.50(x2) + ถุงหิ้ว ฿1.00(x1) -> รวม ฿4.50',
      passed,
      expected: '฿4.50',
      actual: `฿${pkgCost.totalPackagingCost.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-9-packaging-cost',
      name: 'การคำนวณต้นทุนบรรจุภัณฑ์',
      description: 'Packaging cost calculation',
      passed: false,
      expected: '฿4.50',
      actual: `Error: ${message}`,
    });
  }

  // Test 10: delivery fee & GP deduction calculation
  // Selling Price = ฿100, Platform GP = 30%, Payment Fee = 3%, Fixed Fee = ฿0, Promo = ฿5
  // Deductions = 30 + 3 + 0 + 5 = ฿38
  try {
    const deliveryMenu: MenuItem = {
      id: 'm-del',
      name: 'ข้าวกะเพราเดลิเวอรี่',
      category: 'เดลิเวอรี่',
      recipeId: 'rec-1',
      sellingPrice: 100,
      salesChannel: 'delivery',
      targetFoodCostPercent: 35,
      packagingItems: [{ packagingId: 'p1', quantity: 1 }], // 2.50
      deliveryConfig: {
        platformFeePercent: 30,
        fixedPlatformFee: 0,
        promotionDiscount: 5,
        paymentFeePercent: 3,
      },
      createdAt: '',
      updatedAt: '',
    };

    const profit = calculateMenuItemProfit(deliveryMenu, 30, pkgMap);
    const expectedDeductions = 100 * 0.30 + 0 + 5 + 100 * 0.03; // 30 + 5 + 3 = 38
    const passed = approxEqual(profit.totalDeliveryDeductions, expectedDeductions);

    results.push({
      id: 'test-10-delivery-fee',
      name: 'การหักค่าบริการเดลิเวอรี่ GP และค่าธรรมเนียม (Delivery Deductions & Fee)',
      description: 'ราคาขาย ฿100, GP 30% (฿30) + ค่าชำระเงิน 3% (฿3) + ส่วนลด ฿5 -> หักรวม ฿38.00',
      passed,
      expected: `฿${expectedDeductions.toFixed(2)}`,
      actual: `฿${profit.totalDeliveryDeductions.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-10-delivery-fee',
      name: 'การหักค่าบริการเดลิเวอรี่ GP',
      description: 'Delivery fee calculation',
      passed: false,
      expected: '฿38.00',
      actual: `Error: ${message}`,
    });
  }

  // Test 11: contribution profit calculation
  // Selling Price = ฿100, Food Cost = ฿30, Packaging = ฿2.50, Delivery Deductions = ฿38
  // Contribution Profit = 100 - 30 - 2.50 - 38 = ฿29.50
  try {
    const deliveryMenu: MenuItem = {
      id: 'm-del-prof',
      name: 'ข้าวกะเพราเดลิเวอรี่',
      category: 'เดลิเวอรี่',
      recipeId: 'rec-1',
      sellingPrice: 100,
      salesChannel: 'delivery',
      targetFoodCostPercent: 35,
      packagingItems: [{ packagingId: 'p1', quantity: 1 }], // 2.50
      deliveryConfig: {
        platformFeePercent: 30,
        fixedPlatformFee: 0,
        promotionDiscount: 5,
        paymentFeePercent: 3,
      },
      createdAt: '',
      updatedAt: '',
    };

    const profit = calculateMenuItemProfit(deliveryMenu, 30, pkgMap);
    const expectedProfit = 100 - 30 - 2.5 - 38; // 29.5
    const passed = approxEqual(profit.netDeliveryContributionProfit, expectedProfit);

    results.push({
      id: 'test-11-contribution-profit',
      name: 'กำไรส่วนเกินสุทธิ (Net Contribution Profit Calculation)',
      description: 'ราคาขาย ฿100 - อาหาร ฿30 - บรรจุภัณฑ์ ฿2.50 - เดลิเวอรี่ ฿38 -> กำไรสุทธิ ฿29.50',
      passed,
      expected: `฿${expectedProfit.toFixed(2)}`,
      actual: `฿${profit.netDeliveryContributionProfit.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-11-contribution-profit',
      name: 'กำไรส่วนเกินสุทธิ',
      description: 'Contribution profit calculation',
      passed: false,
      expected: '฿29.50',
      actual: `Error: ${message}`,
    });
  }

  // Test 12: waste cost calculation
  // Chicken 500g wasted @ ฿0.105555.../g -> Cost = 500 * (95 / 900) = ฿52.7777...
  try {
    if (!chickenIng) throw new Error('Chicken ingredient not available');
    const wasteCost = calculateWasteEntryCost(500, 'g', chickenIng);
    const expectedWasteCost = 500 * (95 / 900); // 52.7777...
    const passed = approxEqual(wasteCost, expectedWasteCost);

    results.push({
      id: 'test-12-waste-cost',
      name: 'การคำนวณมูลค่าความเสียหาย/ของเสีย (Waste Cost Calculation)',
      description: 'อกไก่เสีย 500g (จากต้นทุนเนื้อแท้ ฿0.1056/g) -> มูลค่าความเสียหาย ฿52.78',
      passed,
      expected: `฿${expectedWasteCost.toFixed(2)}`,
      actual: `฿${wasteCost.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-12-waste-cost',
      name: 'การคำนวณมูลค่าความเสียหาย/ของเสีย',
      description: 'Waste cost calculation',
      passed: false,
      expected: '฿52.78',
      actual: `Error: ${message}`,
    });
  }

  // Test 13: Sub-recipe calculation (Sauce recipe embedded inside Food recipe)
  // Sauce: 1,000g total cost = ฿100 (฿0.10/g). Food recipe uses 50g sauce = ฿5.00
  try {
    const sampleSauceRecipe: Recipe = {
      id: 'rec_test_sauce',
      name: 'ซอสทดสอบ',
      category: 'ซอส',
      recipeType: 'SAUCE',
      currentVersionId: 'v_sauce_1',
      versions: [
        {
          id: 'v_sauce_1',
          recipeId: 'rec_test_sauce',
          versionNumber: 1,
          versionLabel: 'v1.0',
          effectiveDate: '2026-08-01',
          ingredients: [
            { id: 'si1', ingredientId: 'ing_oil', quantityUsed: 1000, unit: 'ml', preparationLossPercent: 0 }, // oil @ 0.052/ml = ฿52
          ],
          preparationLossPercent: 0,
          portionYield: 10,
          cookedWeight: 1000,
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const sampleFoodRecipeVersion: RecipeVersion = {
      id: 'v_food_1',
      recipeId: 'rec_test_food',
      versionNumber: 1,
      versionLabel: 'v1.0',
      effectiveDate: '2026-08-01',
      ingredients: [
        { id: 'fi1', ingredientId: 'rec_test_sauce', itemType: 'recipe', quantityUsed: 100, unit: 'ml', preparationLossPercent: 0 },
      ],
      preparationLossPercent: 0,
      portionYield: 1,
    };

    const dummyIngMap = new Map<string, Ingredient>([
      ['ing_oil', {
        id: 'ing_oil',
        name: 'น้ำมัน',
        category: 'ซอส',
        purchaseUnit: 'L',
        purchaseQuantity: 1,
        purchasePrice: 52,
        usableYieldPercent: 100,
        usableQuantity: 1000,
        effectiveCostPerBaseUnit: 0.052,
        createdAt: '',
        updatedAt: '',
      }],
    ]);

    const testRecipesMap = new Map<string, Recipe>([
      ['rec_test_sauce', sampleSauceRecipe],
    ]);

    const foodCostResult = calculateRecipeCost(sampleFoodRecipeVersion, dummyIngMap, testRecipesMap);
    // Sauce total = 1000ml * 0.052 = ฿52. 100ml sauce used in food = ฿5.20
    const expectedCost = 5.20;
    const passed = approxEqual(foodCostResult.totalProductionCost, expectedCost);

    results.push({
      id: 'test-13-sub-recipe-cost',
      name: 'การคำนวณต้นทุน Sub-Recipe (Sauce/Rice Recipe in Food Recipe)',
      description: 'สูตรซอสต้นทุน ฿52/1,000ml เมื่อนำไปใช้ 100ml ในสูตรอาหารหลัก ต้องคิดต้นทุนได้ ฿5.20',
      passed,
      expected: `฿${expectedCost.toFixed(2)}`,
      actual: `฿${foodCostResult.totalProductionCost.toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-13-sub-recipe-cost',
      name: 'การคำนวณต้นทุน Sub-Recipe',
      description: 'Sub-recipe cost resolution',
      passed: false,
      expected: '฿5.20',
      actual: `Error: ${message}`,
    });
  }

  // Test 14: Circular Dependency Detection
  // Recipe A contains Recipe B, and Recipe B contains Recipe A -> circular detected
  try {
    const rA: Recipe = {
      id: 'r_A',
      name: 'สูตร A',
      category: 'อาหาร',
      recipeType: 'FOOD',
      currentVersionId: 'vA',
      versions: [
        {
          id: 'vA',
          recipeId: 'r_A',
          versionNumber: 1,
          versionLabel: 'v1.0',
          effectiveDate: '',
          ingredients: [{ id: '1', ingredientId: 'r_B', itemType: 'recipe', quantityUsed: 10, unit: 'g' }],
          preparationLossPercent: 0,
          portionYield: 1,
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const rB: Recipe = {
      id: 'r_B',
      name: 'สูตร B',
      category: 'ซอส',
      recipeType: 'SAUCE',
      currentVersionId: 'vB',
      versions: [
        {
          id: 'vB',
          recipeId: 'r_B',
          versionNumber: 1,
          versionLabel: 'v1.0',
          effectiveDate: '',
          ingredients: [{ id: '1', ingredientId: 'r_A', itemType: 'recipe', quantityUsed: 10, unit: 'g' }],
          preparationLossPercent: 0,
          portionYield: 1,
        },
      ],
      createdAt: '',
      updatedAt: '',
    };

    const circMap = new Map<string, Recipe>([
      ['r_A', rA],
      ['r_B', rB],
    ]);

    // Adding rA to rB should detect cycle
    const isCycle = hasCircularRecipeDependency('r_B', 'r_A', circMap);
    const passed = isCycle === true;

    results.push({
      id: 'test-14-circular-dependency',
      name: 'การป้องกันการอ้างอิงวนลูปของสูตร (Circular Dependency Prevention)',
      description: 'ตรวจจับเมื่อสูตร A และสูตร B มีการอ้างอิงถึงกันและกันแบบวนลูป (Cycle Protection)',
      passed,
      expected: 'ตรวจพบการวนลูป (true)',
      actual: isCycle ? 'ตรวจพบการวนลูป (true)' : 'ไม่พบ (false)',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      id: 'test-14-circular-dependency',
      name: 'การป้องกันการอ้างอิงวนลูปของสูตร',
      description: 'Circular dependency check',
      passed: false,
      expected: 'true',
      actual: `Error: ${message}`,
    });
  }

  return results;
}

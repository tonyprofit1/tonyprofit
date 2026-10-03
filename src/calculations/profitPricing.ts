import { MenuItem, MenuItemDeliveryConfig, PackagingItem, SalesChannel } from '../types';

export interface CalculatedPackagingCostItem {
  packagingId: string;
  name: string;
  quantity: number;
  costPerPiece: number;
  totalCost: number;
}

export interface CalculatedMenuItemProfit {
  id: string;
  menuItemId: string;
  name: string;
  category: string;
  salesChannel: SalesChannel;
  sellingPrice: number;
  foodCost: number;
  packagingCost: number;
  packagingItemsBreakdown: CalculatedPackagingCostItem[];
  totalDirectCost: number; // Food Cost + Packaging Cost

  // Gross / Dine-in margins
  grossContributionProfit: number; // Selling Price - Total Direct Cost
  foodCostPercent: number;        // (Food Cost / Selling Price) * 100
  totalCostPercent: number;       // (Total Direct Cost / Selling Price) * 100
  grossMarginPercent: number;     // (Gross Contribution Profit / Selling Price) * 100

  // Target pricing recommendations
  targetFoodCostPercent: number;
  recommendedSellingPrice: number; // (Total Direct Cost / (Target % / 100))
  priceDifference: number;         // Current Selling Price - Recommended Price
  targetProfitAtRecommendedPrice: number;

  // Delivery specific metrics (if applicable)
  isDelivery: boolean;
  deliveryConfig?: MenuItemDeliveryConfig;
  deliveryPlatformFeeAmount: number;
  deliveryFixedFeeAmount: number;
  deliveryPromotionAmount: number;
  deliveryPaymentFeeAmount: number;
  totalDeliveryDeductions: number;
  netDeliveryContributionProfit: number;
  netDeliveryMarginPercent: number;
  breakevenDeliveryPrice: number;
  recommendedDeliverySellingPrice: number;
}

/**
 * Calculates packaging cost for a menu item.
 */
export function calculatePackagingCost(
  menuItem: MenuItem,
  packagingMap: Map<string, PackagingItem>
): { totalPackagingCost: number; breakdown: CalculatedPackagingCostItem[] } {
  let totalPackagingCost = 0;
  const breakdown: CalculatedPackagingCostItem[] = [];

  for (const item of menuItem.packagingItems || []) {
    const pkg = packagingMap.get(item.packagingId);
    if (!pkg) continue;
    const cost = item.quantity * pkg.costPerPiece;
    totalPackagingCost += cost;
    breakdown.push({
      packagingId: pkg.id,
      name: pkg.name,
      quantity: item.quantity,
      costPerPiece: pkg.costPerPiece,
      totalCost: cost,
    });
  }

  return { totalPackagingCost, breakdown };
}

/**
 * Deterministically calculates complete pricing, profit, and delivery GP metrics for a menu item.
 */
export function calculateMenuItemProfit(
  menuItem: MenuItem,
  foodCost: number,
  packagingMap: Map<string, PackagingItem>
): CalculatedMenuItemProfit {
  const sellingPrice = Math.max(0, menuItem.sellingPrice || 0);
  const { totalPackagingCost, breakdown } = calculatePackagingCost(menuItem, packagingMap);
  const totalDirectCost = foodCost + totalPackagingCost;

  const targetPct = menuItem.targetFoodCostPercent > 0 ? menuItem.targetFoodCostPercent : 35;
  const targetRatio = targetPct / 100;

  // Recommended price based on target cost %
  const recommendedSellingPrice = targetRatio > 0 ? totalDirectCost / targetRatio : totalDirectCost;
  const priceDifference = sellingPrice - recommendedSellingPrice;
  const targetProfitAtRecommendedPrice = recommendedSellingPrice - totalDirectCost;

  const grossContributionProfit = sellingPrice - totalDirectCost;
  const foodCostPercent = sellingPrice > 0 ? (foodCost / sellingPrice) * 100 : 0;
  const totalCostPercent = sellingPrice > 0 ? (totalDirectCost / sellingPrice) * 100 : 0;
  const grossMarginPercent = sellingPrice > 0 ? (grossContributionProfit / sellingPrice) * 100 : 0;

  // Delivery breakdown
  const isDelivery = menuItem.salesChannel === 'delivery';
  const deliveryConfig = menuItem.deliveryConfig || {
    platformFeePercent: 0,
    fixedPlatformFee: 0,
    promotionDiscount: 0,
    paymentFeePercent: 0,
  };

  const deliveryPlatformFeeAmount = isDelivery ? (sellingPrice * (deliveryConfig.platformFeePercent || 0)) / 100 : 0;
  const deliveryFixedFeeAmount = isDelivery ? (deliveryConfig.fixedPlatformFee || 0) : 0;
  const deliveryPromotionAmount = isDelivery ? (deliveryConfig.promotionDiscount || 0) : 0;
  const deliveryPaymentFeeAmount = isDelivery ? (sellingPrice * (deliveryConfig.paymentFeePercent || 0)) / 100 : 0;

  const totalDeliveryDeductions =
    deliveryPlatformFeeAmount + deliveryFixedFeeAmount + deliveryPromotionAmount + deliveryPaymentFeeAmount;

  const netDeliveryContributionProfit = sellingPrice - totalDirectCost - totalDeliveryDeductions;
  const netDeliveryMarginPercent = sellingPrice > 0 ? (netDeliveryContributionProfit / sellingPrice) * 100 : 0;

  // Breakeven Delivery Price formula:
  // Price - (Price * (GP% + Pay%)/100) - FixedFee - Promo = TotalDirectCost
  // Price * (1 - (GP% + Pay%)/100) = TotalDirectCost + FixedFee + Promo
  // Price = (TotalDirectCost + FixedFee + Promo) / (1 - (GP% + Pay%)/100)
  const combinedFeePercent = ((deliveryConfig.platformFeePercent || 0) + (deliveryConfig.paymentFeePercent || 0)) / 100;
  const denominator = Math.max(0.05, 1 - combinedFeePercent);
  const breakevenDeliveryPrice = (totalDirectCost + deliveryFixedFeeAmount + deliveryPromotionAmount) / denominator;

  // Recommended delivery selling price that achieves target profit
  // (TotalDirectCost + deliveryFixedFeeAmount + deliveryPromotionAmount) / (1 - combinedFeePercent - (1 - targetRatio))
  // simpler: we want NetProfit / SellingPrice = targetMargin (1 - targetRatio)
  const netTargetMargin = Math.max(0, 1 - targetRatio);
  const deliveryPricingDenominator = Math.max(0.05, 1 - combinedFeePercent - netTargetMargin);
  const recommendedDeliverySellingPrice = (totalDirectCost + deliveryFixedFeeAmount + deliveryPromotionAmount) / deliveryPricingDenominator;

  return {
    id: menuItem.id,
    menuItemId: menuItem.id,
    name: menuItem.name,
    category: menuItem.category,
    salesChannel: menuItem.salesChannel || 'restaurant',
    sellingPrice,
    foodCost,
    packagingCost: totalPackagingCost,
    packagingItemsBreakdown: breakdown,
    totalDirectCost,
    grossContributionProfit,
    foodCostPercent,
    totalCostPercent,
    grossMarginPercent,
    targetFoodCostPercent: targetPct,
    recommendedSellingPrice,
    priceDifference,
    targetProfitAtRecommendedPrice,
    isDelivery,
    deliveryConfig,
    deliveryPlatformFeeAmount,
    deliveryFixedFeeAmount,
    deliveryPromotionAmount,
    deliveryPaymentFeeAmount,
    totalDeliveryDeductions,
    netDeliveryContributionProfit,
    netDeliveryMarginPercent,
    breakevenDeliveryPrice,
    recommendedDeliverySellingPrice,
  };
}

/**
 * Calculates target selling price given food cost, target food cost %, packaging, and labor.
 */
export function calculateTargetSellingPrice(
  foodCost: number,
  targetFoodCostPercent: number,
  packagingCost: number = 0,
  laborCost: number = 0
): {
  totalDirectCost: number;
  recommendedSellingPrice: number;
  expectedGrossProfit: number;
  expectedMarginPercent: number;
} {
  const totalDirectCost = Math.max(0, foodCost) + Math.max(0, packagingCost) + Math.max(0, laborCost);
  const targetRatio = Math.max(0.01, (targetFoodCostPercent || 35) / 100);
  const recommendedSellingPrice = totalDirectCost / targetRatio;
  const expectedGrossProfit = recommendedSellingPrice - totalDirectCost;
  const expectedMarginPercent = recommendedSellingPrice > 0 ? (expectedGrossProfit / recommendedSellingPrice) * 100 : 0;

  return {
    totalDirectCost,
    recommendedSellingPrice,
    expectedGrossProfit,
    expectedMarginPercent,
  };
}

/**
 * Calculates delivery platform net profit after GP commission, VAT on GP, packaging, and promo.
 */
export function calculateDeliveryProfit(
  sellingPrice: number,
  foodCost: number,
  packagingCost: number,
  gpPercent: number,
  options?: {
    vatOnGp?: boolean;
    merchantPromoDiscount?: number;
    fixedFeePerOrder?: number;
  }
): {
  sellingPrice: number;
  foodCost: number;
  packagingCost: number;
  baseGpAmount: number;
  vatAmountOnGp: number;
  totalGpFeeWithVat: number;
  promoDiscount: number;
  fixedFee: number;
  totalDeductions: number;
  netPayoutFromPlatform: number;
  netProfitPerPortion: number;
  netProfitMarginPercent: number;
} {
  const price = Math.max(0, sellingPrice);
  const food = Math.max(0, foodCost);
  const pkg = Math.max(0, packagingCost);
  const gpPct = Math.max(0, gpPercent);
  const vatOnGp = options?.vatOnGp ?? true;
  const promo = Math.max(0, options?.merchantPromoDiscount || 0);
  const fixed = Math.max(0, options?.fixedFeePerOrder || 0);

  const baseGpAmount = (price * gpPct) / 100;
  const vatAmountOnGp = vatOnGp ? baseGpAmount * 0.07 : 0;
  const totalGpFeeWithVat = baseGpAmount + vatAmountOnGp;

  const netPayoutFromPlatform = Math.max(0, price - totalGpFeeWithVat - promo - fixed);
  const totalDeductions = totalGpFeeWithVat + promo + fixed;
  const netProfitPerPortion = price - totalDeductions - food - pkg;
  const netProfitMarginPercent = price > 0 ? (netProfitPerPortion / price) * 100 : 0;

  return {
    sellingPrice: price,
    foodCost: food,
    packagingCost: pkg,
    baseGpAmount,
    vatAmountOnGp,
    totalGpFeeWithVat,
    promoDiscount: promo,
    fixedFee: fixed,
    totalDeductions,
    netPayoutFromPlatform,
    netProfitPerPortion,
    netProfitMarginPercent,
  };
}


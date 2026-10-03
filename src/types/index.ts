// Core TypeScript Domain Types for Tony's Restaurant Cost Control

export type UnitType = 'g' | 'kg' | 'ml' | 'L' | 'piece' | 'pack' | 'bottle' | 'box';

export type IngredientCategory =
  | 'ผักสด'
  | 'เนื้อสัตว์ ไข่'
  | 'ของแห้ง'
  | 'ข้าว เส้น'
  | 'ซอส'
  | 'แพ็คเกจ'
  | 'อื่น';

export const INGREDIENT_CATEGORIES: { key: IngredientCategory; labelTh: string; labelEn: string }[] = [
  { key: 'ผักสด', labelTh: 'ผักสด', labelEn: 'Vegetables' },
  { key: 'เนื้อสัตว์ ไข่', labelTh: 'เนื้อสัตว์ ไข่', labelEn: 'Meat & Egg' },
  { key: 'ของแห้ง', labelTh: 'ของแห้ง', labelEn: 'Dry Goods' },
  { key: 'ข้าว เส้น', labelTh: 'ข้าว เส้น', labelEn: 'Rice & Noodle' },
  { key: 'ซอส', labelTh: 'ซอส', labelEn: 'Sauce' },
  { key: 'แพ็คเกจ', labelTh: 'แพ็คเกจ', labelEn: 'Packaging' },
  { key: 'อื่น', labelTh: 'อื่น', labelEn: 'Other' },
];

export const DEFAULT_INGREDIENT_CATEGORY: IngredientCategory = 'ผักสด';

/**
 * Normalizes legacy or raw category strings into one of the 7 official categories.
 */
export function normalizeIngredientCategory(cat?: string | null): IngredientCategory {
  if (!cat) return 'ผักสด';
  const c = cat.trim();
  if (c === 'ผักสด' || c === 'Vegetable' || c === 'Fruit' || c === 'ผลไม้') return 'ผักสด';
  if (
    c === 'เนื้อสัตว์ ไข่' ||
    c === 'Meat' ||
    c === 'Seafood' ||
    c === 'Egg' ||
    c === 'เนื้อสัตว์' ||
    c === 'อาหารทะเล' ||
    c === 'ไข่ไก่/เป็ด'
  )
    return 'เนื้อสัตว์ ไข่';
  if (c === 'ของแห้ง' || c === 'Dry Goods' || c === 'Seasoning' || c === 'เครื่องปรุงรส' || c === 'Dairy' || c === 'นมและเนย')
    return 'ของแห้ง';
  if (c === 'ข้าว เส้น' || c === 'Rice' || c === 'Noodle' || c === 'ข้าว' || c === 'เส้นและแป้ง')
    return 'ข้าว เส้น';
  if (c === 'ซอส' || c === 'Sauce' || c === 'Oil' || c === 'ซอสและเครื่องแกง' || c === 'น้ำมันปรุงอาหาร')
    return 'ซอส';
  if (c === 'แพ็คเกจ' || c === 'Packaging' || c === 'กล่อง' || c === 'บรรจุภัณฑ์')
    return 'แพ็คเกจ';
  if (c === 'อื่น' || c === 'Other' || c === 'อื่นๆ') return 'อื่น';

  return 'อื่น';
}

export const UNIT_LABELS: Record<UnitType, { th: string; en: string; baseUnit: 'g' | 'ml' | 'piece' | 'pack' | 'bottle' | 'box' }> = {
  g: { th: 'กรัม (g)', en: 'Gram (g)', baseUnit: 'g' },
  kg: { th: 'กิโลกรัม (kg)', en: 'Kilogram (kg)', baseUnit: 'g' },
  ml: { th: 'มิลลิลิตร (ml)', en: 'Milliliter (ml)', baseUnit: 'ml' },
  L: { th: 'ลิตร (L)', en: 'Liter (L)', baseUnit: 'ml' },
  piece: { th: 'ฟอง / ชิ้น (piece)', en: 'Piece (piece)', baseUnit: 'piece' },
  pack: { th: 'แพ็ค / ถุง (pack)', en: 'Pack (pack)', baseUnit: 'pack' },
  bottle: { th: 'ขวด (bottle)', en: 'Bottle (bottle)', baseUnit: 'bottle' },
  box: { th: 'กล่อง (box)', en: 'Box (box)', baseUnit: 'box' },
};

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  imageId?: string;
  imageData?: string;
  imageMimeType?: string;
  imageUpdatedAt?: string;
  purchaseUnit: UnitType;
  purchaseQuantity: number; // e.g. 1 (kg)
  purchasePrice: number;    // e.g. 95 (THB)
  usableYieldPercent: number; // e.g. 90 (%)
  usableQuantity: number;    // e.g. 900 (g) in base unit
  effectiveCostPerBaseUnit: number; // e.g. 0.105555... THB per gram
  rawStartingWeight?: number; // Raw sample / batch weight before trimming
  scrapWeight?: number;       // Scrap / trim waste weight
  usableWeight?: number;      // Net edible usable weight (Pre-cook weight)
  cookedWeight?: number;      // Weight after cooking
  cookingLossWeight?: number; // Weight lost during cooking (usableWeight - cookedWeight)
  prepLossPercent?: number;   // Cooking loss percent
  effectiveCookedCostPerBaseUnit?: number; // Cost per base unit after cooking (purchasePrice / cookedWeight)
  yieldPercent?: number;      // Alias for usableYieldPercent
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientPurchase {
  id: string;
  ingredientId: string;
  supplier: string;
  purchaseDate: string;
  quantity: number;
  unit: UnitType;
  totalPrice: number;
  unitPrice: number;
  rawStartingWeight?: number;
  scrapWeight?: number;
  usableWeight?: number;
  cookedWeight?: number;
  cookingLossWeight?: number;
  prepLossPercent?: number;
  yieldPercent?: number;
  effectiveUnitCost?: number;
  notes?: string;
  createdAt: string;
}

export interface IngredientPriceHistory {
  id: string;
  ingredientId: string;
  date: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: UnitType;
  effectiveCostPerBaseUnit: number;
  rawStartingWeight?: number;
  scrapWeight?: number;
  usableWeight?: number;
  cookedWeight?: number;
  cookingLossWeight?: number;
  prepLossPercent?: number;
  yieldPercent?: number;
  reason?: string;
  createdAt: string;
}

export type RecipeType = 'FOOD' | 'SAUCE' | 'RICE';

export interface RecipeIngredientItem {
  id: string;
  itemType?: 'ingredient' | 'recipe';
  ingredientId: string;
  recipeId?: string;
  quantityUsed: number;
  unit: UnitType;
  preparationLossPercent?: number; // extra loss for this specific recipe ingredient
  preCookWeight?: number;
  cookedWeight?: number;
  cookingLossWeight?: number;
  notes?: string;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  versionLabel?: string;
  effectiveDate: string;
  ingredients: RecipeIngredientItem[];
  preparationLossPercent: number; // overall preparation loss %
  portionYield: number; // e.g. 1 portion or 10 portions
  preCookWeight?: number; // น้ำหนักก่อนปรุง / หลังตัดแต่ง (g)
  cookedWeight?: number; // น้ำหนักหลังปรุง (g)
  cookingLossWeight?: number; // น้ำหนักที่สูญเสียขณะปรุง (g)
  instructions?: string; // รายละเอียดขั้นตอน / วิธีการทำ
  notes?: string;
  calculatedTotalCost?: number;
  calculatedPortionCost?: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  recipeType?: RecipeType; // 'FOOD' | 'SAUCE' | 'RICE' (defaults to 'FOOD' if undefined)
  imageId?: string;
  imageUrl?: string;
  imageData?: string;
  imageMimeType?: string;
  instructions?: string;
  currentVersionId: string;
  versions: RecipeVersion[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackagingItem {
  id: string;
  name: string;
  unit: string; // e.g. 'แพ็ค (100 ชิ้น)'
  price: number; // e.g. 120 THB
  quantityPerUnit: number; // e.g. 100
  costPerPiece: number; // e.g. 1.20 THB
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalesChannel = 'restaurant' | 'takeaway' | 'delivery' | 'other';

export const SALES_CHANNEL_LABELS: Record<SalesChannel, { th: string; en: string }> = {
  restaurant: { th: 'ทานที่ร้าน (Dine-in)', en: 'Dine-in' },
  takeaway: { th: 'สั่งกลับบ้าน (Takeaway)', en: 'Takeaway' },
  delivery: { th: 'เดลิเวอรี่ (Delivery)', en: 'Delivery' },
  other: { th: 'ช่องทางอื่นๆ (Other)', en: 'Other' },
};

export interface MenuItemPackagingItem {
  packagingId: string;
  quantity: number;
}

export interface MenuItemDeliveryConfig {
  platformFeePercent: number; // e.g. 30% for Grab / Lineman / Shopee
  fixedPlatformFee: number;   // e.g. 0 or 5 THB
  promotionDiscount: number;  // e.g. 0 or 10 THB
  paymentFeePercent: number;  // e.g. 3% credit card / e-wallet
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  recipeId: string;
  sellingPrice: number;
  salesChannel: SalesChannel;
  packagingItems: MenuItemPackagingItem[];
  targetFoodCostPercent: number; // e.g. 32%
  deliveryConfig?: MenuItemDeliveryConfig;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WasteReason =
  | 'Spoilage'
  | 'Overproduction'
  | 'Preparation Loss'
  | 'Cooking Error'
  | 'Customer Return'
  | 'Damaged'
  | 'Expired'
  | 'Other';

export const WASTE_REASONS: { key: WasteReason; labelTh: string; labelEn: string }[] = [
  { key: 'Spoilage', labelTh: 'เน่าเสีย / ชำรุด', labelEn: 'Spoilage' },
  { key: 'Overproduction', labelTh: 'เตรียมเกินความต้องการ', labelEn: 'Overproduction' },
  { key: 'Preparation Loss', labelTh: 'สูญเสียตอนเตรียมล้นปกติ', labelEn: 'Excess Prep Loss' },
  { key: 'Cooking Error', labelTh: 'ปรุงผิดพลาด / ทำไหม้', labelEn: 'Cooking Error' },
  { key: 'Customer Return', labelTh: 'ลูกค้าส่งคืน', labelEn: 'Customer Return' },
  { key: 'Damaged', labelTh: 'ตกหล่น / บรรจุภัณฑ์แตก', labelEn: 'Damaged' },
  { key: 'Expired', labelTh: 'หมดอายุ', labelEn: 'Expired' },
  { key: 'Other', labelTh: 'สาเหตุอื่นๆ', labelEn: 'Other' },
];

export interface WasteRecord {
  id: string;
  date: string;
  ingredientId: string;
  quantity: number;
  unit: UnitType;
  reason: WasteReason;
  calculatedCost: number;
  notes?: string;
  createdAt: string;
}

export interface AppSettings {
  restaurantName: string;
  currencySymbol: string;
  defaultTargetFoodCostPercent: number;
  defaultDeliveryGpPercent: number;
  defaultPaymentFeePercent: number;
  isDemoMode: boolean;
  lastBackupDate?: string;
}

export interface BackupData {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    ingredients: Ingredient[];
    purchases: IngredientPurchase[];
    priceHistory: IngredientPriceHistory[];
    recipes: Recipe[];
    packaging: PackagingItem[];
    menuItems: MenuItem[];
    waste: WasteRecord[];
    settings: AppSettings;
  };
}

export interface AppBackupData {
  version: number;
  appName?: string;
  metadata?: {
    appName: string;
    version: number;
    exportedAt: string;
  };
  exportedAt?: string;
  ingredients: Ingredient[];
  purchases?: IngredientPurchase[];
  priceHistory?: IngredientPriceHistory[];
  recipes: Recipe[];
  packaging: PackagingItem[];
  menuItems: MenuItem[];
  waste?: WasteRecord[];
  settings?: AppSettings;
  data?: {
    ingredients: Ingredient[];
    purchases: IngredientPurchase[];
    priceHistory: IngredientPriceHistory[];
    recipes: Recipe[];
    packaging: PackagingItem[];
    menuItems: MenuItem[];
    waste: WasteRecord[];
    settings: AppSettings;
  };
}


export interface TestResultItem {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

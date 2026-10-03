import React from 'react';
import {
  Carrot,
  BookOpen,
  UtensilsCrossed,
  Percent,
  TrendingUp,
  AlertTriangle,
  Trash2,
  ArrowUpRight,
  Calculator,
  Truck,
  Box,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react';
import {
  AppSettings,
  Ingredient,
  IngredientPriceHistory,
  MenuItem,
  PackagingItem,
  Recipe,
  WasteRecord,
} from '../types';
import { calculateRecipeCost } from '../calculations/recipeCost';
import { calculateMenuItemProfit } from '../calculations/profitPricing';
import { formatCurrency, formatPercent, formatDateThai } from '../utils/formatters';
import { MainTab } from '../components/BottomNav';

interface DashboardViewProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  menuItems: MenuItem[];
  packaging: PackagingItem[];
  wasteRecords: WasteRecord[];
  priceHistory?: IngredientPriceHistory[];
  settings: AppSettings;
  onNavigate: (tab: MainTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ingredients = [],
  recipes = [],
  menuItems = [],
  packaging = [],
  wasteRecords = [],
  priceHistory = [],
  settings,
  onNavigate,
}) => {
  const safeIngredients = ingredients || [];
  const safePackaging = packaging || [];
  const safeRecipes = recipes || [];
  const safeMenuItems = menuItems || [];
  const safeWaste = wasteRecords || [];
  const safePriceHistory = priceHistory || [];

  const ingredientsMap = new Map<string, Ingredient>(safeIngredients.map((i) => [i.id, i]));
  const packagingMap = new Map<string, PackagingItem>(safePackaging.map((p) => [p.id, p]));
  const recipesMap = new Map<string, Recipe>(safeRecipes.map((r) => [r.id, r]));

  // Calculate recipe portion costs
  const recipeCostsMap = new Map<string, number>();
  for (const r of safeRecipes) {
    const activeVersion = r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
    if (activeVersion) {
      const cost = calculateRecipeCost(activeVersion, ingredientsMap, recipesMap);
      recipeCostsMap.set(r.id, cost.costPerPortion);
    }
  }

  // Calculate menu item profits
  const calculatedMenus = safeMenuItems.map((m) => {
    const foodCost = recipeCostsMap.get(m.recipeId) || 0;
    return calculateMenuItemProfit(m, foodCost, packagingMap);
  });

  // Calculate overall metrics
  const totalMenuItems = calculatedMenus.length;
  const avgFoodCostPercent =
    totalMenuItems > 0
      ? calculatedMenus.reduce((sum, m) => sum + m.foodCostPercent, 0) / totalMenuItems
      : 0;

  const avgGrossMarginPercent =
    totalMenuItems > 0
      ? calculatedMenus.reduce((sum, m) => sum + m.grossMarginPercent, 0) / totalMenuItems
      : 0;

  // Highest food cost % menu
  const highestCostMenu = [...calculatedMenus].sort((a, b) => b.foodCostPercent - a.foodCostPercent)[0];

  // Lowest gross margin % menu
  const lowestMarginMenu = [...calculatedMenus].sort((a, b) => a.grossMarginPercent - b.grossMarginPercent)[0];

  // Total waste cost
  const totalWasteCost = safeWaste.reduce((sum, w) => sum + (w.calculatedCost || 0), 0);

  // High food cost warning count
  const highCostWarnings = calculatedMenus.filter(
    (m) => m.foodCostPercent > (m.targetFoodCostPercent || settings.defaultTargetFoodCostPercent)
  );

  // Recent price changes (latest 4)
  const recentPriceChanges = [...safePriceHistory]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-3.5 pb-14 max-w-7xl mx-auto">
      {/* 1. Compact Header (No large orange banner) */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-orange-100 text-orange-600">
              <LayoutDashboard className="w-4 h-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
              Dashboard ภาพรวมต้นทุน
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">
            {settings.restaurantName || "Tony's Thai Kitchen"} • สรุปต้นทุน กำไร และของเสีย
          </p>
        </div>

        {/* Target food cost badge */}
        <div className="text-right shrink-0">
          <span className="text-[10px] text-gray-400 block font-medium">เป้าหมาย Food Cost</span>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
            {formatPercent(settings.defaultTargetFoodCostPercent)}
          </span>
        </div>
      </div>

      {/* 2. Compact 2x2 KPI Grid (Mobile Optimized) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1: Food Cost % */}
        <div
          onClick={() => onNavigate('pricing')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs hover:border-orange-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">Food Cost เฉลี่ย</span>
            <Percent className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-1.5">
            <div
              className={`text-xl sm:text-2xl font-black tracking-tight ${
                avgFoodCostPercent > settings.defaultTargetFoodCostPercent
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {formatPercent(avgFoodCostPercent)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-between">
              <span>เป้า {formatPercent(settings.defaultTargetFoodCostPercent)}</span>
              {avgFoodCostPercent > settings.defaultTargetFoodCostPercent ? (
                <span className="text-rose-600 font-bold">เกินเป้า</span>
              ) : (
                <span className="text-emerald-600 font-bold">ตามเกณฑ์</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Gross Margin % */}
        <div
          onClick={() => onNavigate('pricing')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs hover:border-orange-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">กำไรขั้นต้นเฉลี่ย</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {formatPercent(avgGrossMarginPercent)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              <span>จาก {totalMenuItems} เมนูที่ตั้งขาย</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Waste Cost */}
        <div
          onClick={() => onNavigate('waste')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs hover:border-orange-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">มูลค่าของเสียสะสม</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
              {formatCurrency(totalWasteCost)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              <span>บันทึกแล้ว {safeWaste.length} ครั้ง</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Menu Items & Status */}
        <div
          onClick={() => onNavigate('menu')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs hover:border-orange-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-500">รายการเมนูขาย</span>
            <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {totalMenuItems} <span className="text-xs font-normal text-gray-500">เมนู</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-between">
              <span>หน้าร้าน + เดลิเวอรี่</span>
              <span className="text-orange-600 font-bold">ดูเมนู →</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Compact Resource Counts Bar (Ingredients, Recipes, Packaging) */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div
          onClick={() => onNavigate('ingredients')}
          className="bg-gray-50 hover:bg-orange-50/60 p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Carrot className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="font-semibold text-gray-700 truncate">วัตถุดิบ</span>
          </div>
          <span className="font-black text-gray-900 ml-1">{safeIngredients.length}</span>
        </div>

        <div
          onClick={() => onNavigate('recipes')}
          className="bg-gray-50 hover:bg-orange-50/60 p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-gray-700 truncate">สูตรอาหาร</span>
          </div>
          <span className="font-black text-gray-900 ml-1">{safeRecipes.length}</span>
        </div>

        <div
          onClick={() => onNavigate('packaging')}
          className="bg-gray-50 hover:bg-orange-50/60 p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Box className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="font-semibold text-gray-700 truncate">แพ็คเกจ</span>
          </div>
          <span className="font-black text-gray-900 ml-1">{safePackaging.length}</span>
        </div>
      </div>

      {/* 4. Compact Alerts & Highlights (Dense 2-col or stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card: High Cost Alert or OK status */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              {highCostWarnings.length > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>การแจ้งเตือนต้นทุนอาหาร (Food Cost)</span>
            </span>
            {highCostWarnings.length > 0 && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                เกินเป้า {highCostWarnings.length} เมนู
              </span>
            )}
          </div>

          {highestCostMenu ? (
            <div className="p-2.5 bg-gray-50 rounded-lg space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-900">
                <span className="truncate pr-2">{highestCostMenu.name}</span>
                <span
                  className={
                    highestCostMenu.foodCostPercent > settings.defaultTargetFoodCostPercent
                      ? 'text-rose-600 font-black shrink-0'
                      : 'text-emerald-600 font-black shrink-0'
                  }
                >
                  FC: {formatPercent(highestCostMenu.foodCostPercent)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>ราคาขาย {formatCurrency(highestCostMenu.sellingPrice)}</span>
                <span>ต้นทุน {formatCurrency(highestCostMenu.foodCost)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-1">ยังไม่มีข้อมูลเมนู</p>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={() => onNavigate('pricing')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-0.5"
            >
              <span>วิเคราะห์การตั้งราคา</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card: Lowest Gross Margin */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              <span>เมนูกำไรส่วนเกิน (Contribution Profit)</span>
            </span>
          </div>

          {lowestMarginMenu ? (
            <div className="p-2.5 bg-gray-50 rounded-lg space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-gray-900">
                <span className="truncate pr-2">{lowestMarginMenu.name}</span>
                <span className="text-gray-900 shrink-0">
                  กำไร {formatCurrency(lowestMarginMenu.grossContributionProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Margin: {formatPercent(lowestMarginMenu.grossMarginPercent)}</span>
                <span>
                  ราคาแนะนำ:{' '}
                  <strong className="text-emerald-600">
                    {formatCurrency(lowestMarginMenu.recommendedSellingPrice)}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-1">ยังไม่มีข้อมูลเมนู</p>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={() => onNavigate('menu')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-0.5"
            >
              <span>ดูเมนูทั้งหมด</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Recent Ingredient Price Changes (Compact List) */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-gray-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-800">ประวัติราคาซื้อวัตถุดิบล่าสุด</span>
          <button
            onClick={() => onNavigate('ingredients')}
            className="text-orange-600 hover:text-orange-700 font-bold inline-flex items-center gap-0.5"
          >
            <span>คลังวัตถุดิบ</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {recentPriceChanges.length > 0 ? (
          <div className="divide-y divide-gray-100 text-xs">
            {recentPriceChanges.map((ph) => {
              const ing = ingredientsMap.get(ph.ingredientId);
              return (
                <div key={ph.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">
                      {ing ? ing.name : 'วัตถุดิบ'}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {formatDateThai(ph.date)} • {ph.reason || 'บันทึกราคา'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-gray-900">
                      {formatCurrency(ph.purchasePrice)} / {ph.purchaseQuantity} {ph.purchaseUnit}
                    </div>
                    <div className="text-[10px] text-orange-600 font-medium">
                      ต้นทุนแท้: {formatCurrency(ph.effectiveCostPerBaseUnit, '฿', 4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-gray-400">
            ยังไม่มีประวัติการปรับราคาวัตถุดิบ
          </div>
        )}
      </div>

      {/* 6. Compact Quick Navigation Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <button
          onClick={() => onNavigate('yield')}
          className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/40 text-left transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">คิด Yield ผลผลิต</div>
            <div className="text-[10px] text-gray-400 truncate">คำนวณตัดแต่ง</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('delivery')}
          className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/40 text-left transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">หัก GP เดลิเวอรี่</div>
            <div className="text-[10px] text-gray-400 truncate">Grab / Lineman 30%</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('backup')}
          className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/40 text-left transition-colors col-span-2 sm:col-span-1"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Box className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-900 truncate">สำรองไฟล์ข้อมูล</div>
            <div className="text-[10px] text-gray-400 truncate">Export / Import JSON</div>
          </div>
        </button>
      </div>
    </div>
  );
};

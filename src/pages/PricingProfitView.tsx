import React, { useState } from 'react';
import {
  TrendingUp,
  Calculator,
  Percent,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { AppSettings, Ingredient, MenuItem, PackagingItem, Recipe } from '../types';
import { calculateRecipeCost } from '../calculations/recipeCost';
import {
  calculateMenuItemProfit,
  calculateTargetSellingPrice,
} from '../calculations/profitPricing';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { CostBadge } from '../components/CostBadge';

interface PricingProfitViewProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  packaging: PackagingItem[];
  settings: AppSettings;
}

export const PricingProfitView: React.FC<PricingProfitViewProps> = ({
  menuItems = [],
  recipes = [],
  packaging = [],
  settings,
}) => {
  const safeMenuItems = menuItems || [];
  const safeRecipes = recipes || [];
  const safePackaging = packaging || [];

  // Standalone target price simulator state
  const [simFoodCost, setSimFoodCost] = useState<number>(30);
  const [simPackagingCost, setSimPackagingCost] = useState<number>(3.5);
  const [simLaborCost, setSimLaborCost] = useState<number>(0);
  const [simTargetFoodCostPct, setSimTargetFoodCostPct] = useState<number>(
    settings.defaultTargetFoodCostPercent || 35
  );

  // Quick menu simulator
  const [selectedMenuId, setSelectedMenuId] = useState<string>(safeMenuItems[0]?.id || '');
  const [simulatedPrice, setSimulatedPrice] = useState<number>(65);

  const packagingMap = new Map<string, PackagingItem>(safePackaging.map((p) => [p.id, p]));
  const recipesMap = new Map<string, Recipe>(safeRecipes.map((r) => [r.id, r]));
  const recipeCostsMap = new Map<string, number>();
  for (const r of safeRecipes) {
    const activeVersion = r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
    if (activeVersion) {
      const cost = calculateRecipeCost(activeVersion, new Map<string, Ingredient>(), recipesMap);
      recipeCostsMap.set(r.id, cost.costPerPortion);
    }
  }

  // Calculate all menu items profit
  const analyzedMenus = safeMenuItems.map((m) => {
    const foodCost = recipeCostsMap.get(m.recipeId) || 0;
    return calculateMenuItemProfit(m, foodCost, packagingMap);
  });

  // Standalone simulator results
  const standaloneResult = calculateTargetSellingPrice(
    simFoodCost,
    simTargetFoodCostPct,
    simPackagingCost,
    simLaborCost
  );

  // Selected menu simulator
  const selectedMenuItem = menuItems.find((m) => m.id === selectedMenuId);
  const selectedRecipeCost = selectedMenuItem ? recipeCostsMap.get(selectedMenuItem.recipeId) || 0 : 0;
  const simulatedSelectedResult = selectedMenuItem
    ? calculateMenuItemProfit(
        { ...selectedMenuItem, sellingPrice: simulatedPrice },
        selectedRecipeCost,
        packagingMap
      )
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-orange-600" />
          <span>วิเคราะห์ราคาขาย & กำไร (Pricing & Profit Optimization)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          จำลองราคาขายที่เหมาะสม ควบคุม % Food Cost ให้อยู่ในเกณฑ์ และตรวจเช็คจุดขาดทุน
        </p>
      </div>

      {/* Simulator Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Target Price Calculator (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-600" />
              <span>เครื่องคำนวณราคาขายเป้าหมาย (Target Price Simulator)</span>
            </h3>
            <span className="text-xs text-gray-500 font-medium">สูตร: ต้นทุนรวม ÷ เป้าหมาย %</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">1. ต้นทุนอาหาร/วัตถุดิบ (฿) *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={simFoodCost}
                onChange={(e) => setSimFoodCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">2. ต้นทุนกล่อง/บรรจุภัณฑ์ (฿)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={simPackagingCost}
                onChange={(e) => setSimPackagingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">3. ค่าแรงโดยตรงต่อจาน (฿ ถ้ามี)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={simLaborCost}
                onChange={(e) => setSimLaborCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-700">4. เป้าหมาย Food Cost % *</label>
                <span className="text-xs font-bold text-orange-600">{simTargetFoodCostPct}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="1"
                value={simTargetFoodCostPct}
                onChange={(e) => setSimTargetFoodCostPct(parseInt(e.target.value) || 35)}
                className="w-full accent-orange-600 mt-2"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>25% (กำไรสูง)</span>
                <span>35% (มาตรฐาน)</span>
                <span>50% (กำไรบาง)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
            ต้นทุนรวม (Direct Cost): <span className="font-bold text-gray-900">{formatCurrency(simFoodCost + simPackagingCost + simLaborCost)}</span>
          </div>
        </div>

        {/* Right Output Card (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                ผลการคำนวณราคาขายแนะนำ
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                Target {simTargetFoodCostPct}%
              </span>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-gray-800/80 border border-gray-700 space-y-1">
              <span className="text-xs text-gray-400">ราคาขายแนะนำขั้นต่ำ:</span>
              <div className="text-3xl font-black text-orange-400">
                {formatCurrency(standaloneResult.recommendedSellingPrice)}
              </div>
              <div className="text-xs text-gray-400 pt-1">
                กำไรส่วนเกินที่คาดหวัง: <span className="text-emerald-400 font-bold">{formatCurrency(standaloneResult.expectedGrossProfit)}</span> ({formatPercent(standaloneResult.expectedMarginPercent)})
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>ต้นทุนอาหาร:</span>
                <span>{formatCurrency(simFoodCost)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>ต้นทุนกล่องบรรจุภัณฑ์:</span>
                <span>{formatCurrency(simPackagingCost)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>ต้นทุนรวมทั้งหมด:</span>
                <span className="font-bold text-white">{formatCurrency(standaloneResult.totalDirectCost)}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-gray-400 border-t border-gray-700/60 pt-2">
            💡 หากตั้งราคาต่ำกว่า {formatCurrency(standaloneResult.recommendedSellingPrice)} จะทำให้ % Food Cost เกินเป้าหมาย {simTargetFoodCostPct}%
          </div>
        </div>
      </div>

      {/* Menu Profit & Food Cost Analysis Table */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              ตารางเปรียบเทียบต้นทุนและกำไรทุกเมนู ({analyzedMenus.length} เมนู)
            </h3>
            <p className="text-xs text-gray-500">
              ตรวจสอบว่าราคาขายปัจจุบันแต่ละเมนูทำให้ Food Cost % เกินเป้าหมายหรือไม่
            </p>
          </div>
        </div>

        {analyzedMenus.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold bg-gray-50/50">
                  <th className="py-2.5 px-3">ชื่อเมนูอาหาร</th>
                  <th className="py-2.5 px-3">ช่องทาง</th>
                  <th className="py-2.5 px-3 text-right">ราคาขายจริง</th>
                  <th className="py-2.5 px-3 text-right">ต้นทุนรวม</th>
                  <th className="py-2.5 px-3 text-center">Food Cost %</th>
                  <th className="py-2.5 px-3 text-right">กำไรส่วนเกิน</th>
                  <th className="py-2.5 px-3 text-right">ราคาขายแนะนำ</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analyzedMenus.map((m) => {
                  const isOverBudget = m.foodCostPercent > m.targetFoodCostPercent;
                  const priceGap = m.sellingPrice - m.recommendedSellingPrice;

                  return (
                    <tr key={m.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="py-3 px-3 font-bold text-gray-900">{m.name}</td>
                      <td className="py-3 px-3 text-gray-500">{m.salesChannel}</td>
                      <td className="py-3 px-3 text-right font-black text-gray-900">
                        {formatCurrency(m.sellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600 font-semibold">
                        {formatCurrency(m.totalDirectCost)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <CostBadge
                          percent={m.foodCostPercent}
                          targetPercent={m.targetFoodCostPercent}
                          size="sm"
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(m.grossContributionProfit)} ({formatPercent(m.grossMarginPercent)})
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-orange-600">
                        {formatCurrency(m.recommendedSellingPrice)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isOverBudget ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" /> ตั้งต่ำไป ({formatCurrency(priceGap)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ผ่านเกณฑ์
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-gray-400">
            ยังไม่มีรายการเมนูอาหาร กรุณาเพิ่มเมนูอาหารในแท็บ "รายการเมนู"
          </div>
        )}
      </div>
    </div>
  );
};

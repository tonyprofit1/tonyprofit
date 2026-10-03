import React, { useState } from 'react';
import { Calculator, Layers, Sparkles, Scale, BookOpen, Printer, ArrowRight } from 'lucide-react';
import { Ingredient, Recipe } from '../types';
import { calculateRecipeCost, scaleRecipeCost } from '../calculations/recipeCost';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface RecipeCalculatorViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
}

export const RecipeCalculatorView: React.FC<RecipeCalculatorViewProps> = ({
  recipes = [],
  ingredients = [],
}) => {
  const safeRecipes = recipes || [];
  const safeIngredients = ingredients || [];

  const ingredientsMap = new Map<string, Ingredient>(safeIngredients.map((i) => [i.id, i]));
  const recipesMap = new Map<string, Recipe>(safeRecipes.map((r) => [r.id, r]));
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(safeRecipes[0]?.id || '');
  const [targetPortions, setTargetPortions] = useState<number>(10);

  const currentRecipe = safeRecipes.find((r) => r.id === selectedRecipeId) || safeRecipes[0];
  const activeVersion = currentRecipe
    ? currentRecipe.versions.find((v) => v.id === currentRecipe.currentVersionId) || currentRecipe.versions[0]
    : null;

  const baseCost = activeVersion ? calculateRecipeCost(activeVersion, ingredientsMap, recipesMap) : null;
  const scaled = baseCost ? scaleRecipeCost(baseCost, targetPortions) : null;

  const portionButtons = [1, 5, 10, 20, 50, 100, 200];

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Layers className="w-6 h-6 text-orange-600" />
          <span>คำนวณสเกลสูตร & วัตถุดิบ (Recipe Batch & Scaling Calculator)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          คำนวณปริมาณวัตถุดิบและต้นทุนที่ต้องใช้สำหรับเตรียมอาหารจำนวนมาก (Catering / Batch Prep)
        </p>
      </div>

      {recipes.length > 0 ? (
        <div className="space-y-5">
          {/* Select Recipe and Portions Bar */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">เลือกสูตรอาหารที่ต้องการสเกล:</label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-gray-900"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">จำนวนที่ต้องการเตรียม (Target Portions):</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={targetPortions}
                    onChange={(e) => setTargetPortions(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                  <div className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center shrink-0">
                    ที่ / จาน
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Portions Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-gray-400 font-medium whitespace-nowrap">ทางลัดจำนวน:</span>
              {portionButtons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => setTargetPortions(btn)}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    targetPortions === btn
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {btn} ที่
                </button>
              ))}
            </div>
          </div>

          {/* Scaled Output Cards */}
          {baseCost && scaled && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Scaled Ingredients List (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      รายการวัตถุดิบสำหรับเตรียม {targetPortions} ที่
                    </h3>
                    <p className="text-xs text-gray-500">
                      สูตรมาตรฐาน: {currentRecipe?.name} ({baseCost.portionYield} ที่/รอบ)
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {scaled.scaledItems.map((item, idx) => {
                    const baseItem = baseCost.items[idx];
                    return (
                      <div key={idx} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-[11px] text-gray-500">
                            (สูตรเดิมใช้ {formatNumber(baseItem?.quantityUsed)} {baseItem?.unit} ต่อ {baseCost.portionYield} ที่)
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-orange-600 text-sm sm:text-base">
                            {formatNumber(item.quantity)} {item.unit}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            ต้นทุน: {formatCurrency(item.cost)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Financial Summary (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-gradient-to-br from-orange-600 to-amber-600 text-white rounded-2xl p-5 shadow-md space-y-4">
                  <span className="text-xs font-bold text-orange-200 uppercase tracking-wider">
                    สรุปต้นทุนแบทช์นี้ (Batch Cost Summary)
                  </span>

                  <div className="p-4 rounded-xl bg-orange-700/60 border border-orange-400/40 space-y-1">
                    <span className="text-xs text-orange-100">ต้นทุนรวมสำหรับ {targetPortions} ที่:</span>
                    <div className="text-2xl sm:text-3xl font-black text-white">
                      {formatCurrency(scaled.totalCost)}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs pt-1 border-t border-orange-500/60">
                    <div className="flex justify-between">
                      <span className="text-orange-100">ต้นทุนเฉลี่ยต่อที่:</span>
                      <span className="font-bold text-white">{formatCurrency(scaled.costPerPortion)} / ที่</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100">จำนวนวัตถุดิบทั้งหมด:</span>
                      <span className="font-bold text-white">{scaled.scaledItems.length} รายการ</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 text-xs text-gray-600 leading-relaxed shadow-xs">
                  <span className="font-bold text-gray-900 block mb-1">💡 การสั่งซื้อและการเตรียม:</span>
                  ตรวจสอบสต็อกวัตถุดิบในครัวก่อนสั่งซื้อเพิ่ม โดยคำนวณตามปริมาณที่แสดงในตารางด้านซ้าย
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-xs text-gray-500">
          ยังไม่มีสูตรอาหารในระบบ กรุณาสร้างสูตรอาหารในแท็บ "สูตรอาหาร" ก่อน
        </div>
      )}
    </div>
  );
};

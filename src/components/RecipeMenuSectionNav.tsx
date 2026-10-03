import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { MainTab } from './BottomNav';
import {
  ALL_RECIPE_MENU_ITEMS,
  saveRecipeMenuOrder,
} from '../utils/recipeMenuOrder';

interface RecipeMenuSectionNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  order: MainTab[];
  onOrderChange: (newOrder: MainTab[]) => void;
  onOpenAddRecipe?: () => void;
}

export const RecipeMenuSectionNav: React.FC<RecipeMenuSectionNavProps> = ({
  activeTab,
  onChangeTab,
  order,
  onOrderChange,
  onOpenAddRecipe,
}) => {
  const [isReorderOpen, setIsReorderOpen] = useState(false);

  const moveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0) return;
    const next = [...order];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    onOrderChange(next);
    saveRecipeMenuOrder(next);
  };

  const moveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= order.length - 1) return;
    const next = [...order];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    onOrderChange(next);
    saveRecipeMenuOrder(next);
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Top Banner / Section Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                ระบบจัดการ
              </span>
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                สูตร & เมนูอาหาร
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              จัดการสูตรอาหาร ซอส ข้าว-เส้น เมนูขาย และจัดลำดับการแสดงผลตามต้องการ
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Add Recipe Button */}
            {onOpenAddRecipe && (
              <button
                type="button"
                id="btn-add-recipe-section-nav"
                onClick={onOpenAddRecipe}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ เพิ่มสูตรอาหาร</span>
              </button>
            )}

            {/* Toggle Reorder Panel */}
            <button
              type="button"
              onClick={() => setIsReorderOpen(!isReorderOpen)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors border ${
                isReorderOpen
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700'
              }`}
              title="ปรับตำแหน่งเมนู (Reorder)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
              <span>ปรับตำแหน่งเมนู (↑ ↓)</span>
              {isReorderOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Ordered Tabs Row */}
        <div className="pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {order.map((key, idx) => {
            const item = ALL_RECIPE_MENU_ITEMS[key];
            if (!item) return null;
            const Icon = item.icon;
            const isActive = activeTab === key;

            return (
              <button
                key={key}
                onClick={() => onChangeTab(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                  isActive
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200/80'
                }`}
              >
                <span className="text-[10px] font-bold opacity-60">#{idx + 1}</span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Reorder Panel (Mobile Friendly 1-Column Layout) */}
      {isReorderOpen && (
        <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/90 shadow-xs space-y-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-orange-600" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                จัดลำดับเมนูในกลุ่ม "สูตร & เมนูอาหาร" (Sort Order)
              </h3>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">
              บันทึกลำดับอัตโนมัติ
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
            กดปุ่ม <span className="font-bold text-gray-800">↑ (เลื่อนขึ้น)</span> หรือ{' '}
            <span className="font-bold text-gray-800">↓ (เลื่อนลง)</span>{' '}
            เพื่อเปลี่ยนลำดับของเมนู ระบบจะจดจำลำดับนี้ไว้ทุกครั้งที่เปิดใช้งาน
          </p>

          {/* 1 Column Layout for Mobile & Tablet */}
          <div className="grid grid-cols-1 gap-2 pt-1">
            {order.map((key, index) => {
              const item = ALL_RECIPE_MENU_ITEMS[key];
              if (!item) return null;
              const Icon = item.icon;
              const isFirst = index === 0;
              const isLast = index === order.length - 1;
              const isActive = activeTab === key;

              return (
                <div
                  key={key}
                  onClick={() => onChangeTab(key)}
                  className={`cursor-pointer flex items-center justify-between gap-3 p-3 rounded-xl bg-white border transition-all ${
                    isActive
                      ? 'border-orange-400 ring-1 ring-orange-300 shadow-xs'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  {/* Left: Icon, Number, Title & Type */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 text-gray-700 text-xs font-black shrink-0">
                      {index + 1}
                    </div>

                    <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {item.label}
                        </span>
                        {item.recipeType && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border ${item.tagColor}`}>
                            type: {item.recipeType}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate hidden sm:block">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Up / Down Reorder Buttons */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={(e) => moveUp(index, e)}
                      className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl font-bold transition-all ${
                        isFirst
                          ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'bg-gray-100 hover:bg-orange-100 hover:text-orange-600 active:scale-95 text-gray-700'
                      }`}
                      title="เลื่อนขึ้น (Move Up)"
                      aria-label={`เลื่อน ${item.shortLabel} ขึ้น`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={(e) => moveDown(index, e)}
                      className={`w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl font-bold transition-all ${
                        isLast
                          ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'bg-gray-100 hover:bg-orange-100 hover:text-orange-600 active:scale-95 text-gray-700'
                      }`}
                      title="เลื่อนลง (Move Down)"
                      aria-label={`เลื่อน ${item.shortLabel} ลง`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

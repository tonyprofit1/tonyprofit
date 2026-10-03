import React from 'react';
import {
  LayoutDashboard,
  Carrot,
  BookOpen,
  UtensilsCrossed,
  Layers,
  Percent,
  Trash2,
  Database,
  Calculator,
  Truck,
  MoreHorizontal,
  Soup,
  Wheat,
  ArrowUp,
  ArrowDown,
  Package,
} from 'lucide-react';
import {
  ALL_RECIPE_MENU_ITEMS,
  DEFAULT_RECIPE_MENU_ORDER,
} from '../utils/recipeMenuOrder';

export type MainTab =
  | 'dashboard'
  | 'ingredients'
  | 'yield'
  | 'recipes'
  | 'recipe_calc'
  | 'packaging'
  | 'menu'
  | 'sauce_recipes'
  | 'rice_recipes'
  | 'pricing'
  | 'delivery'
  | 'waste'
  | 'backup'
  | 'tests'
  | 'settings';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  onOpenMoreMenu: () => void;
  recipeMenuOrder?: MainTab[];
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenMoreMenu,
  recipeMenuOrder = DEFAULT_RECIPE_MENU_ORDER,
}) => {
  // Build dynamic primary items based on the active recipe menu order
  const recipeNavItems = recipeMenuOrder.map((key) => {
    const item = ALL_RECIPE_MENU_ITEMS[key];
    return {
      key,
      label: item?.shortLabel || key,
      icon: item?.icon || BookOpen,
    };
  });

  const primaryNavItems: { key: MainTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { key: 'ingredients', label: 'วัตถุดิบ', icon: Carrot },
    ...recipeNavItems.slice(0, 4),
    { key: 'delivery', label: 'เดลิเวอรี่', icon: Truck },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg md:hidden">
      <div className="flex items-center gap-1 h-16 px-2 overflow-x-auto no-scrollbar scroll-smooth">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChangeTab(item.key)}
              className={`flex flex-col items-center justify-center min-w-[64px] shrink-0 h-full py-1 transition-all ${
                isActive ? 'text-orange-600 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-orange-100/90 text-orange-600 scale-105' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More Menu Toggle Button */}
        <button
          onClick={onOpenMoreMenu}
          className="flex flex-col items-center justify-center min-w-[64px] shrink-0 h-full py-1 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <div className="p-1.5 rounded-xl">
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 whitespace-nowrap tracking-tight">เมนูอื่นๆ</span>
        </button>
      </div>
    </nav>
  );
};

export const DesktopSidebarNav: React.FC<{
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  recipeMenuOrder?: MainTab[];
  onReorderRecipeMenu?: (newOrder: MainTab[]) => void;
}> = ({
  activeTab,
  onChangeTab,
  recipeMenuOrder = DEFAULT_RECIPE_MENU_ORDER,
  onReorderRecipeMenu,
}) => {
  const handleMoveUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0 || !onReorderRecipeMenu) return;
    const next = [...recipeMenuOrder];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    onReorderRecipeMenu(next);
  };

  const handleMoveDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= recipeMenuOrder.length - 1 || !onReorderRecipeMenu) return;
    const next = [...recipeMenuOrder];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    onReorderRecipeMenu(next);
  };

  const recipeSectionItems = recipeMenuOrder.map((key) => {
    const info = ALL_RECIPE_MENU_ITEMS[key];
    return {
      key,
      label: info?.label || key,
      icon: info?.icon || BookOpen,
    };
  });

  const sections: {
    sectionTitle: string;
    isRecipeSection?: boolean;
    items: { key: MainTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[];
  }[] = [
    {
      sectionTitle: 'ศูนย์ควบคุมหลัก',
      items: [
        { key: 'dashboard', label: 'แดชบอร์ดสรุปต้นทุน', icon: LayoutDashboard },
        { key: 'ingredients', label: 'จัดการวัตถุดิบ & การซื้อ', icon: Carrot },
        { key: 'yield', label: 'คำนวณผลผลิต (Yield Calculator)', icon: Calculator },
      ],
    },
    {
      sectionTitle: 'สูตร & เมนูอาหาร',
      isRecipeSection: true,
      items: recipeSectionItems,
    },
    {
      sectionTitle: 'กำไร & ต้นทุนแฝง',
      items: [
        { key: 'pricing', label: 'ตั้งราคา & กำไรเป้าหมาย', icon: Percent },
        { key: 'delivery', label: 'หัก GP เดลิเวอรี่ (Grab/Lineman)', icon: Truck },
        { key: 'waste', label: 'บันทึกของเสีย & ความเสียหาย', icon: Trash2 },
      ],
    },
    {
      sectionTitle: 'ระบบ & ความปลอดภัย',
      items: [
        { key: 'backup', label: 'สำรอง & กู้คืนข้อมูล (JSON Backup)', icon: Database },
        { key: 'tests', label: 'ผลการทดสอบสูตรคณิตศาสตร์', icon: Calculator },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-61px)] flex-col p-4 hidden md:flex shrink-0">
      <div className="space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2 px-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                {sec.sectionTitle}
              </h4>
              {sec.isRecipeSection && (
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  ปรับตำแหน่งได้
                </span>
              )}
            </div>
            <div className="space-y-1">
              {sec.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                const isRecipeItem = sec.isRecipeSection;

                return (
                  <div
                    key={item.key}
                    className={`group/nav relative flex items-center justify-between rounded-xl transition-all ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs font-semibold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onChangeTab(item.key)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs sm:text-sm font-medium transition-all text-left min-w-0 pr-12"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>

                    {/* Compact Move Up / Down Buttons for Recipe Menu Items */}
                    {isRecipeItem && onReorderRecipeMenu && (
                      <div className="absolute right-1 flex items-center gap-0.5 opacity-0 group-hover/nav:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={itemIdx === 0}
                          onClick={(e) => handleMoveUp(itemIdx, e)}
                          className={`p-1 rounded hover:bg-black/10 active:scale-95 transition-all ${
                            itemIdx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                          } ${isActive ? 'text-white' : 'text-gray-500 hover:text-orange-600'}`}
                          title="เลื่อนขึ้น (Move Up)"
                          aria-label="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={itemIdx === sec.items.length - 1}
                          onClick={(e) => handleMoveDown(itemIdx, e)}
                          className={`p-1 rounded hover:bg-black/10 active:scale-95 transition-all ${
                            itemIdx === sec.items.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                          } ${isActive ? 'text-white' : 'text-gray-500 hover:text-orange-600'}`}
                          title="เลื่อนลง (Move Down)"
                          aria-label="เลื่อนลง"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

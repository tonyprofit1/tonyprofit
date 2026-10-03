import React from 'react';
import {
  BookOpen,
  Soup,
  Wheat,
  UtensilsCrossed,
  Layers,
  Package,
} from 'lucide-react';
import { MainTab } from '../components/BottomNav';
import { RecipeType } from '../types';

export interface RecipeMenuItemInfo {
  key: MainTab;
  label: string;
  shortLabel: string;
  subLabel: string;
  icon: React.FC<{ className?: string }>;
  recipeType?: RecipeType;
  description: string;
  tagColor: string;
}

export const ALL_RECIPE_MENU_ITEMS: Record<string, RecipeMenuItemInfo> = {
  recipes: {
    key: 'recipes',
    label: 'สูตรอาหาร (Food Recipes)',
    shortLabel: 'สูตรอาหาร',
    subLabel: 'type: FOOD',
    icon: BookOpen,
    recipeType: 'FOOD',
    description: 'คำนวณต้นทุนอาหารต่อจาน ดึงวัตถุดิบ ซอส และข้าว-เส้นมารวมกัน',
    tagColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  sauce_recipes: {
    key: 'sauce_recipes',
    label: 'สูตรซอส (Sauce Recipe)',
    shortLabel: 'สูตรซอส',
    subLabel: 'type: SAUCE',
    icon: Soup,
    recipeType: 'SAUCE',
    description: 'จัดการสูตรซอสปรุงรส คำนวณต้นทุนต่อกรัม/มล. นำไปใช้ในสูตรหลัก',
    tagColor: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  rice_recipes: {
    key: 'rice_recipes',
    label: 'สูตรข้าว-เส้น (Rice Recipe)',
    shortLabel: 'สูตรข้าว-เส้น',
    subLabel: 'type: RICE',
    icon: Wheat,
    recipeType: 'RICE',
    description: 'จัดการสูตรหุงข้าว/ต้มเส้น คำนวณ Yield ขยายตัวและสูญเสียขณะปรุง',
    tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  menu: {
    key: 'menu',
    label: 'รายการอาหาร & ราคาขาย (Menu Items)',
    shortLabel: 'รายการอาหาร',
    subLabel: 'Menu & Packaging',
    icon: UtensilsCrossed,
    description: 'ผูกสูตรอาหารกับบรรจุภัณฑ์ ตั้งราคาขายและกำไรเป้าหมายตามช่องทาง',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  recipe_calc: {
    key: 'recipe_calc',
    label: 'คำนวณสัดส่วนสูตร (Scale Cost)',
    shortLabel: 'คำนวณสัดส่วน',
    subLabel: 'Batch Scaling',
    icon: Layers,
    description: 'ปรับสเกลสูตรอาหารตามจำนวนจาน คำนวณวัตถุดิบและต้นทุนรวมทันที',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  packaging: {
    key: 'packaging',
    label: 'บรรจุภัณฑ์ (Packaging)',
    shortLabel: 'บรรจุภัณฑ์',
    subLabel: 'Packaging Cost',
    icon: Package,
    description: 'จัดการกล่อง ถุง ช้อนส้อม และต้นทุนแพ็กเกจจิ้งต่อหน่วย',
    tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
};

export const DEFAULT_RECIPE_MENU_ORDER: MainTab[] = [
  'recipes',
  'sauce_recipes',
  'rice_recipes',
  'menu',
  'recipe_calc',
  'packaging',
];

const STORAGE_KEY = 'food_cost_recipe_menu_order_v2';

export function loadSavedRecipeMenuOrder(): MainTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate all items exist
        const validKeys = parsed.filter((k): k is MainTab => Boolean(ALL_RECIPE_MENU_ITEMS[k]));
        // Add any missing default keys
        for (const defaultKey of DEFAULT_RECIPE_MENU_ORDER) {
          if (!validKeys.includes(defaultKey)) {
            validKeys.push(defaultKey);
          }
        }
        return validKeys;
      }
    }
  } catch (err) {
    console.warn('Failed to load saved menu order from localStorage:', err);
  }
  return [...DEFAULT_RECIPE_MENU_ORDER];
}

export function saveRecipeMenuOrder(order: MainTab[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch (err) {
    console.warn('Failed to save menu order to localStorage:', err);
  }
}

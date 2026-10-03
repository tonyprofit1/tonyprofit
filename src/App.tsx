/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Carrot,
  BookOpen,
  UtensilsCrossed,
  Layers,
  Percent,
  Truck,
  Trash2,
  Database,
  Calculator,
  ShieldCheck,
  Settings as SettingsIcon,
  X,
  Sparkles,
  Package,
  Soup,
  Wheat,
} from 'lucide-react';
import {
  AppSettings,
  Ingredient,
  IngredientPriceHistory,
  IngredientPurchase,
  MenuItem,
  PackagingItem,
  Recipe,
  WasteRecord,
} from './types';
import { ingredientRepository } from './repositories/ingredientRepository';
import { recipeRepository } from './repositories/recipeRepository';
import { menuItemRepository } from './repositories/menuItemRepository';
import { packagingRepository } from './repositories/packagingRepository';
import { wasteRepository } from './repositories/wasteRepository';
import { purchaseRepository } from './repositories/purchaseRepository';
import { settingsRepository } from './repositories/settingsRepository';
import { demoDataService } from './services/demoDataService';

import { Header } from './components/Header';
import { BottomNav, DesktopSidebarNav, MainTab } from './components/BottomNav';
import { Modal } from './components/Modal';
import { loadSavedRecipeMenuOrder, saveRecipeMenuOrder } from './utils/recipeMenuOrder';

import { DashboardView } from './pages/DashboardView';
import { IngredientsView } from './pages/IngredientsView';
import { YieldCalculatorView } from './pages/YieldCalculatorView';
import { RecipesView } from './pages/RecipesView';
import { RecipeCalculatorView } from './pages/RecipeCalculatorView';
import { PackagingView } from './pages/PackagingView';
import { MenuItemsView } from './pages/MenuItemsView';
import { PricingProfitView } from './pages/PricingProfitView';
import { DeliveryProfitView } from './pages/DeliveryProfitView';
import { WasteView } from './pages/WasteView';
import { BackupRestoreView } from './pages/BackupRestoreView';
import { TestRunnerView } from './pages/TestRunnerView';
import { SettingsView } from './pages/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Recipe Menu Ordering State (persisted to localStorage)
  const [recipeMenuOrder, setRecipeMenuOrder] = useState<MainTab[]>(() => loadSavedRecipeMenuOrder());

  const handleReorderRecipeMenu = (newOrder: MainTab[]) => {
    setRecipeMenuOrder(newOrder);
    saveRecipeMenuOrder(newOrder);
  };

  // Core database state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [packaging, setPackaging] = useState<PackagingItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [purchases, setPurchases] = useState<IngredientPurchase[]>([]);
  const [priceHistory, setPriceHistory] = useState<IngredientPriceHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    restaurantName: "Tony's Thai Kitchen (โทนี่ ครัวไทย)",
    currencySymbol: '฿',
    defaultTargetFoodCostPercent: 32,
    defaultDeliveryGpPercent: 30,
    defaultPaymentFeePercent: 3,
    isDemoMode: false,
  });

  // Load all local data from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const [
        loadedSettings,
        loadedIngredients,
        loadedRecipes,
        loadedPackaging,
        loadedMenuItems,
        loadedWaste,
        loadedPurchases,
        loadedPriceHistory,
      ] = await Promise.all([
        settingsRepository.getSettings(),
        ingredientRepository.getAll(),
        recipeRepository.getAll(),
        packagingRepository.getAll(),
        menuItemRepository.getAll(),
        wasteRepository.getAll(),
        purchaseRepository.getAll(),
        ingredientRepository.getAllPriceHistory(),
      ]);

      // If DB is totally empty on the very first run, auto-populate sample data
      if (
        loadedIngredients.length === 0 &&
        loadedRecipes.length === 0 &&
        loadedPackaging.length === 0 &&
        loadedMenuItems.length === 0
      ) {
        await demoDataService.loadDemoData();
        // re-fetch after demo population
        const [
          sDemo,
          iDemo,
          rDemo,
          pDemo,
          mDemo,
          wDemo,
          purDemo,
          phDemo,
        ] = await Promise.all([
          settingsRepository.getSettings(),
          ingredientRepository.getAll(),
          recipeRepository.getAll(),
          packagingRepository.getAll(),
          menuItemRepository.getAll(),
          wasteRepository.getAll(),
          purchaseRepository.getAll(),
          ingredientRepository.getAllPriceHistory(),
        ]);

        setSettings(sDemo);
        setIngredients(iDemo);
        setRecipes(rDemo);
        setPackaging(pDemo);
        setMenuItems(mDemo);
        setWasteRecords(wDemo);
        setPurchases(purDemo);
        setPriceHistory(phDemo || []);
      } else {
        setSettings(loadedSettings);
        setIngredients(loadedIngredients);
        setRecipes(loadedRecipes);
        setPackaging(loadedPackaging);
        setMenuItems(loadedMenuItems);
        setWasteRecords(loadedWaste);
        setPurchases(loadedPurchases);
        setPriceHistory(loadedPriceHistory || []);
      }
    } catch (err) {
      console.error('Failed to load local IndexedDB data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Tab navigation helper
  const handleNavigate = (tab: MainTab) => {
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Handlers for Ingredients ---
  const handleSaveIngredient = async (
    data: Parameters<typeof ingredientRepository.create>[0] & { id?: string },
    priceReason?: string
  ) => {
    if (data.id) {
      await ingredientRepository.update(data.id, data, priceReason);
    } else {
      await ingredientRepository.create(data);
    }
    await refreshAllData();
  };

  const handleDeleteIngredient = async (id: string) => {
    await ingredientRepository.delete(id);
    await refreshAllData();
  };

  const handleUpdateIngredientYield = async (ingredientId: string, newYieldPercent: number) => {
    await ingredientRepository.update(
      ingredientId,
      { usableYieldPercent: newYieldPercent },
      `อัปเดตผลผลิต (Yield) เป็น ${newYieldPercent}% จากเครื่องคำนวณ Yield`
    );
    await refreshAllData();
  };

  const handleRecordPurchase = async (data: Parameters<typeof purchaseRepository.recordPurchase>[0]) => {
    await purchaseRepository.recordPurchase(data);
    await refreshAllData();
  };

  // --- Handlers for Recipes ---
  const handleSaveRecipe = async (data: Parameters<typeof recipeRepository.create>[0]) => {
    await recipeRepository.create(data);
    await refreshAllData();
  };

  const handleUpdateRecipeVersion = async (
    recipeId: string,
    data: Parameters<typeof recipeRepository.updateCurrentVersion>[1]
  ) => {
    await recipeRepository.updateCurrentVersion(recipeId, data);
    await refreshAllData();
  };

  const handleCreateRecipeVersion = async (
    recipeId: string,
    data: Parameters<typeof recipeRepository.createNewVersion>[1]
  ) => {
    await recipeRepository.createNewVersion(recipeId, data);
    await refreshAllData();
  };

  const handleSwitchRecipeVersion = async (recipeId: string, versionId: string) => {
    await recipeRepository.switchActiveVersion(recipeId, versionId);
    await refreshAllData();
  };

  const handleDuplicateRecipe = async (recipeId: string) => {
    await recipeRepository.duplicate(recipeId);
    await refreshAllData();
  };

  const handleDeleteRecipe = async (id: string) => {
    await recipeRepository.delete(id);
    await refreshAllData();
  };

  // --- Handlers for Packaging ---
  const handleSavePackaging = async (
    data: Parameters<typeof packagingRepository.create>[0] & { id?: string }
  ) => {
    if (data.id) {
      await packagingRepository.update(data.id, data);
    } else {
      await packagingRepository.create(data);
    }
    await refreshAllData();
  };

  const handleDeletePackaging = async (id: string) => {
    await packagingRepository.delete(id);
    await refreshAllData();
  };

  // --- Handlers for Menu Items ---
  const handleSaveMenuItem = async (
    data: {
      id?: string;
      name: string;
      recipeId: string;
      salesChannel: any;
      sellingPrice: number;
      targetFoodCostPercent: number;
      packagingItems: any[];
      notes?: string;
    }
  ) => {
    if (data.id) {
      await menuItemRepository.update(data.id, data);
    } else {
      await menuItemRepository.create({
        ...data,
        category: 'อาหารจานหลัก',
      });
    }
    await refreshAllData();
  };

  const handleDeleteMenuItem = async (id: string) => {
    await menuItemRepository.delete(id);
    await refreshAllData();
  };

  // --- Handlers for Waste ---
  const handleSaveWasteRecord = async (data: {
    id?: string;
    date: string;
    ingredientId: string;
    quantity: number;
    unit: any;
    reason: any;
    notes?: string;
  }) => {
    await wasteRepository.recordWaste({
      date: data.date,
      ingredientId: data.ingredientId,
      quantity: data.quantity,
      unit: data.unit,
      reason: data.reason,
      notes: data.notes,
    });
    await refreshAllData();
  };

  const handleDeleteWasteRecord = async (id: string) => {
    await wasteRepository.delete(id);
    await refreshAllData();
  };

  // --- Handlers for Settings ---
  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = await settingsRepository.updateSettings(newSettings);
    setSettings(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E64A19] text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">กำลังเตรียมระบบต้นทุนร้านอาหาร...</h2>
        <p className="text-xs text-gray-500 mt-1">โหลดข้อมูลจากฐานข้อมูล IndexedDB ในเครื่องของคุณ 100% ออฟไลน์</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col selection:bg-orange-100 selection:text-orange-900">
      {/* Top Application Header */}
      <Header
        settings={settings}
        onRefreshData={refreshAllData}
        onOpenSettings={() => handleNavigate('settings')}
        onOpenTests={() => handleNavigate('tests')}
      />

      {/* Main Content Layout (Sidebar on Desktop + Scrollable Canvas) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <DesktopSidebarNav
          activeTab={activeTab}
          onChangeTab={handleNavigate}
          recipeMenuOrder={recipeMenuOrder}
          onReorderRecipeMenu={handleReorderRecipeMenu}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              ingredients={ingredients}
              recipes={recipes}
              menuItems={menuItems}
              packaging={packaging}
              wasteRecords={wasteRecords}
              priceHistory={priceHistory}
              settings={settings}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'ingredients' && (
            <IngredientsView
              ingredients={ingredients}
              purchases={purchases}
              priceHistory={priceHistory}
              onSaveIngredient={handleSaveIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onRecordPurchase={handleRecordPurchase}
            />
          )}

          {activeTab === 'yield' && (
            <YieldCalculatorView
              ingredients={ingredients}
              onUpdateIngredientYield={handleUpdateIngredientYield}
            />
          )}

          {activeTab === 'recipes' && (
            <RecipesView
              recipes={recipes}
              ingredients={ingredients}
              recipeTypeFilter="FOOD"
              recipeMenuOrder={recipeMenuOrder}
              onReorderRecipeMenu={handleReorderRecipeMenu}
              onNavigate={handleNavigate}
              onSaveRecipe={handleSaveRecipe}
              onUpdateRecipeVersion={handleUpdateRecipeVersion}
              onCreateRecipeVersion={handleCreateRecipeVersion}
              onSwitchRecipeVersion={handleSwitchRecipeVersion}
              onDuplicateRecipe={handleDuplicateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )}

          {activeTab === 'sauce_recipes' && (
            <RecipesView
              recipes={recipes}
              ingredients={ingredients}
              recipeTypeFilter="SAUCE"
              recipeMenuOrder={recipeMenuOrder}
              onReorderRecipeMenu={handleReorderRecipeMenu}
              onNavigate={handleNavigate}
              onSaveRecipe={handleSaveRecipe}
              onUpdateRecipeVersion={handleUpdateRecipeVersion}
              onCreateRecipeVersion={handleCreateRecipeVersion}
              onSwitchRecipeVersion={handleSwitchRecipeVersion}
              onDuplicateRecipe={handleDuplicateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )}

          {activeTab === 'rice_recipes' && (
            <RecipesView
              recipes={recipes}
              ingredients={ingredients}
              recipeTypeFilter="RICE"
              recipeMenuOrder={recipeMenuOrder}
              onReorderRecipeMenu={handleReorderRecipeMenu}
              onNavigate={handleNavigate}
              onSaveRecipe={handleSaveRecipe}
              onUpdateRecipeVersion={handleUpdateRecipeVersion}
              onCreateRecipeVersion={handleCreateRecipeVersion}
              onSwitchRecipeVersion={handleSwitchRecipeVersion}
              onDuplicateRecipe={handleDuplicateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )}

          {activeTab === 'recipe_calc' && (
            <RecipeCalculatorView recipes={recipes} ingredients={ingredients} />
          )}

          {activeTab === 'packaging' && (
            <PackagingView
              packaging={packaging}
              onSavePackaging={handleSavePackaging}
              onDeletePackaging={handleDeletePackaging}
            />
          )}

          {activeTab === 'menu' && (
            <MenuItemsView
              menuItems={menuItems}
              recipes={recipes}
              packaging={packaging}
              defaultTargetFoodCostPercent={settings.defaultTargetFoodCostPercent}
              onSaveMenuItem={handleSaveMenuItem}
              onDeleteMenuItem={handleDeleteMenuItem}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingProfitView
              menuItems={menuItems}
              recipes={recipes}
              packaging={packaging}
              settings={settings}
            />
          )}

          {activeTab === 'delivery' && (
            <DeliveryProfitView
              menuItems={menuItems}
              recipes={recipes}
              packaging={packaging}
              settings={settings}
            />
          )}

          {activeTab === 'waste' && (
            <WasteView
              wasteRecords={wasteRecords}
              ingredients={ingredients}
              onSaveWasteRecord={handleSaveWasteRecord}
              onDeleteWasteRecord={handleDeleteWasteRecord}
            />
          )}

          {activeTab === 'backup' && <BackupRestoreView onDataMutated={refreshAllData} />}

          {activeTab === 'tests' && <TestRunnerView />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={handleNavigate}
        onOpenMoreMenu={() => setIsMoreMenuOpen(true)}
      />

      {/* Mobile "More Menu" Bottom Sheet / Modal */}
      <Modal
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        title="เมนูเครื่องมือทั้งหมด (All Tools)"
        subtitle="เข้าถึงเครื่องคำนวณ บันทึกของเสีย และสำรองข้อมูล"
        maxWidth="md"
      >
        <div className="grid grid-cols-2 gap-2.5 py-1">
          <button
            onClick={() => handleNavigate('sauce_recipes')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'sauce_recipes' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Soup className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">สูตร ซอส</div>
              <div className="text-[10px] text-gray-500">Sauce Recipe</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('rice_recipes')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'rice_recipes' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Wheat className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">สูตร ข้าว-เส้น</div>
              <div className="text-[10px] text-gray-500">Rice Recipe</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('yield')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'yield' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">คำนวณ Yield</div>
              <div className="text-[10px] text-gray-500">ผลผลิต & ตัดแต่ง</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('recipe_calc')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'recipe_calc' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">สเกลสูตรอาหาร</div>
              <div className="text-[10px] text-gray-500">เตรียมตามจำนวนที่</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('packaging')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'packaging' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">คลังบรรจุภัณฑ์</div>
              <div className="text-[10px] text-gray-500">กล่อง/ถุง/ช้อนส้อม</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('pricing')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'pricing' ? 'bg-orange-50 border-orange-300 text-orange-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">ตั้งราคา & กำไร</div>
              <div className="text-[10px] text-gray-500">เป้าหมาย % Food Cost</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('waste')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'waste' ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">ของเสียในครัว</div>
              <div className="text-[10px] text-gray-500">บันทึกของเน่าเสีย</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('backup')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'backup' ? 'bg-blue-50 border-blue-300 text-blue-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">สำรองข้อมูล</div>
              <div className="text-[10px] text-gray-500">Export/Import JSON</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('tests')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'tests' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">ทดสอบสูตร (14)</div>
              <div className="text-[10px] text-gray-500">ความแม่นยำระบบ</div>
            </div>
          </button>

          <button
            onClick={() => handleNavigate('settings')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
              activeTab === 'settings' ? 'bg-gray-100 border-gray-400 text-gray-900' : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">ตั้งค่าระบบ</div>
              <div className="text-[10px] text-gray-500">ชื่อร้าน & ค่าเริ่มต้น</div>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
}

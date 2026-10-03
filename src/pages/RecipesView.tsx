import React, { useState, useRef } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Edit3,
  Trash2,
  GitBranch,
  Layers,
  Sparkles,
  ChevronRight,
  PlusCircle,
  X,
  History,
  Scale,
  Copy,
  Flame,
  Soup,
  Wheat,
  UtensilsCrossed,
  ArrowRight,
  Info,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import {
  Ingredient,
  Recipe,
  RecipeIngredientItem,
  RecipeType,
  RecipeVersion,
  UnitType,
  UNIT_LABELS,
} from '../types';
import { calculateRecipeCost, hasCircularRecipeDependency } from '../calculations/recipeCost';
import { formatCurrency, formatNumber, formatPercent, formatDateThai } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { optimizeImageFile } from '../utils/imageOptimizer';
import { RecipeMenuSectionNav } from '../components/RecipeMenuSectionNav';
import { MainTab } from '../components/BottomNav';
import { DEFAULT_RECIPE_MENU_ORDER } from '../utils/recipeMenuOrder';

interface RecipesViewProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  recipeTypeFilter?: RecipeType;
  recipeMenuOrder?: MainTab[];
  onReorderRecipeMenu?: (newOrder: MainTab[]) => void;
  onNavigate?: (tab: MainTab) => void;
  onSaveRecipe: (data: {
    id?: string;
    name: string;
    category: string;
    recipeType?: RecipeType;
    imageUrl?: string;
    imageData?: string;
    imageMimeType?: string;
    instructions?: string;
    notes?: string;
    ingredients: RecipeIngredientItem[];
    preparationLossPercent: number;
    portionYield: number;
    preCookWeight?: number;
    cookedWeight?: number;
    cookingLossWeight?: number;
  }) => Promise<void>;
  onUpdateRecipeVersion?: (
    recipeId: string,
    data: {
      name?: string;
      category?: string;
      recipeType?: RecipeType;
      imageUrl?: string;
      imageData?: string;
      imageMimeType?: string;
      instructions?: string;
      notes?: string;
      ingredients: RecipeIngredientItem[];
      preparationLossPercent: number;
      portionYield: number;
      preCookWeight?: number;
      cookedWeight?: number;
      cookingLossWeight?: number;
    }
  ) => Promise<void>;
  onCreateRecipeVersion?: (
    recipeId: string,
    data: {
      versionLabel?: string;
      ingredients: RecipeIngredientItem[];
      preparationLossPercent: number;
      portionYield: number;
      preCookWeight?: number;
      cookedWeight?: number;
      cookingLossWeight?: number;
      instructions?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onCreateNewVersion?: (
    recipeId: string,
    data: {
      versionLabel?: string;
      ingredients: RecipeIngredientItem[];
      preparationLossPercent: number;
      portionYield: number;
      preCookWeight?: number;
      cookedWeight?: number;
      cookingLossWeight?: number;
      instructions?: string;
      notes?: string;
    }
  ) => Promise<void>;
  onDuplicateRecipe?: (recipeId: string) => Promise<void>;
  onSwitchRecipeVersion?: (recipeId: string, versionId: string) => Promise<void>;
  onSwitchActiveVersion?: (recipeId: string, versionId: string) => Promise<void>;
  onDeleteRecipe: (id: string) => Promise<void>;
}

export const RecipesView: React.FC<RecipesViewProps> = ({
  recipes = [],
  ingredients = [],
  recipeTypeFilter = 'FOOD',
  recipeMenuOrder = DEFAULT_RECIPE_MENU_ORDER,
  onReorderRecipeMenu,
  onNavigate,
  onSaveRecipe,
  onUpdateRecipeVersion,
  onCreateRecipeVersion,
  onCreateNewVersion,
  onDuplicateRecipe,
  onSwitchRecipeVersion,
  onSwitchActiveVersion,
  onDeleteRecipe,
}) => {
  const safeRecipes = recipes || [];
  const safeIngredients = ingredients || [];

  const handleCreateVersionFn = onCreateRecipeVersion || onCreateNewVersion;
  const handleSwitchVersionFn = onSwitchRecipeVersion || onSwitchActiveVersion;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [targetVersionRecipe, setTargetVersionRecipe] = useState<Recipe | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Duplicate state
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Image Upload state & Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [formImageData, setFormImageData] = useState<string | undefined>(undefined);
  const [formImageMimeType, setFormImageMimeType] = useState<string | undefined>(undefined);
  const [formImageId, setFormImageId] = useState<string | undefined>(undefined);

  // Config based on recipeTypeFilter
  const pageConfig = {
    FOOD: {
      title: 'สูตรอาหาร (Food Recipes)',
      subtitle: 'คำนวณต้นทุนต่อจานอย่างแม่นยำ รองรับการดึงสูตรซอสและข้าว-เส้นมาเป็นส่วนประกอบ',
      icon: BookOpen,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-100',
      addButtonLabel: '+ เพิ่มสูตรอาหาร',
      defaultCategory: 'อาหารจานเดียว',
      emptyTitle: 'ยังไม่มีสูตรอาหาร',
      emptySubtitle: 'สร้างสูตรอาหารและดึงวัตถุดิบ/สูตรซอส/ข้าว-เส้นเข้ามาคำนวณต้นทุนต่อเสิร์ฟ',
    },
    SAUCE: {
      title: 'สูตร ซอส (Sauce Recipe)',
      subtitle: 'จัดการสูตรซอสปรุงรสและน้ำจิ้ม คำนวณต้นทุนต่อกรัม นำไปใช้ต่อในสูตรอาหารได้ทันที',
      icon: Soup,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      addButtonLabel: '+ เพิ่มสูตรซอส',
      defaultCategory: 'ซอสและเครื่องปรุง',
      emptyTitle: 'ยังไม่มีสูตรซอส',
      emptySubtitle: 'สร้างสูตรซอส เช่น ซอสกะเพรา, ซอสผัดไทย, น้ำจิ้มซีฟู้ด เพื่อใช้เป็นส่วนประกอบในสูตรอาหาร',
    },
    RICE: {
      title: 'สูตร ข้าว-เส้น (Rice Recipe)',
      subtitle: 'จัดการสูตรการหุงข้าวและต้มเส้น คำนวณ Yield และ Prep Loss จากการหุงสุก',
      icon: Wheat,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      addButtonLabel: '+ เพิ่มสูตรข้าว-เส้น',
      defaultCategory: 'ข้าวและเส้น',
      emptyTitle: 'ยังไม่มีสูตรข้าว-เส้น',
      emptySubtitle: 'สร้างสูตรข้าว-เส้น เช่น ข้าวสวยหอมมะลิ, เส้นก๋วยเตี๋ยวลวก, ข้าวเหนียวนึ่ง',
    },
  }[recipeTypeFilter || 'FOOD'];

  // Form states
  const [formRecipeType, setFormRecipeType] = useState<RecipeType>(recipeTypeFilter || 'FOOD');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(pageConfig.defaultCategory);
  const [formPortionYield, setFormPortionYield] = useState<number>(1);
  const [formInstructions, setFormInstructions] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<
    Array<{
      id: string;
      itemType?: 'ingredient' | 'recipe';
      ingredientId: string;
      quantityUsed: number;
      unit: UnitType;
      preparationLossPercent?: number;
      notes?: string;
    }>
  >([]);

  // Cooking Loss & Cooked Weight states
  const [formPreCookWeight, setFormPreCookWeight] = useState<string>('');
  const [formCookedWeight, setFormCookedWeight] = useState<string>('');
  const [formEnableCookingLoss, setFormEnableCookingLoss] = useState<boolean>(true);

  // Version creation form
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');

  const ingredientsMap = new Map<string, Ingredient>(safeIngredients.map((i) => [i.id, i]));
  const recipesMap = new Map<string, Recipe>(safeRecipes.map((r) => [r.id, r]));

  // Auto-calculated Pre-Cook Weight from ingredients and sub-recipes in base grams/ml
  const autoSumPreCookWeight = formItems.reduce((total, item) => {
    if (item.unit === 'g' || item.unit === 'ml') return total + (item.quantityUsed || 0);
    if (item.unit === 'kg' || item.unit === 'L') return total + (item.quantityUsed || 0) * 1000;
    return total;
  }, 0);

  const effectivePreCookWeight =
    formPreCookWeight.trim() !== '' && !isNaN(parseFloat(formPreCookWeight))
      ? parseFloat(formPreCookWeight)
      : autoSumPreCookWeight;

  const parsedCookedWeight =
    formCookedWeight.trim() !== '' && !isNaN(parseFloat(formCookedWeight))
      ? parseFloat(formCookedWeight)
      : null;

  const isCookingLossActive = formEnableCookingLoss && parsedCookedWeight !== null;
  const isCookedWeightInvalid = isCookingLossActive && parsedCookedWeight > effectivePreCookWeight;

  const effectiveCookedWeight =
    isCookingLossActive && !isCookedWeightInvalid ? parsedCookedWeight : effectivePreCookWeight;

  const calculatedCookingLossWeight =
    isCookingLossActive && !isCookedWeightInvalid
      ? Math.max(0, effectivePreCookWeight - parsedCookedWeight)
      : 0;

  const calculatedPrepLossPercent =
    isCookingLossActive && !isCookedWeightInvalid && effectivePreCookWeight > 0
      ? ((effectivePreCookWeight - parsedCookedWeight) / effectivePreCookWeight) * 100
      : 0;

  // Filter recipes for current page view
  const currentViewRecipes = safeRecipes.filter((r) => {
    const rType = r.recipeType || 'FOOD';
    return rType === (recipeTypeFilter || 'FOOD');
  });

  // Grouped sub-recipe candidates for Item Selector
  const sauceRecipes = safeRecipes.filter((r) => r.recipeType === 'SAUCE');
  const riceRecipes = safeRecipes.filter((r) => r.recipeType === 'RICE');
  const foodRecipes = safeRecipes.filter((r) => (r.recipeType || 'FOOD') === 'FOOD');

  const handleImageFileChange = async (file: File) => {
    if (!file) return;
    setIsOptimizingImage(true);
    try {
      const optimized = await optimizeImageFile(file, 400, 0.8);
      setFormImageData(optimized.imageData);
      setFormImageMimeType(optimized.imageMimeType);
      setFormImageId(optimized.imageId);
    } catch (err: any) {
      alert(err?.message || 'ไม่สามารถประมวลผลรูปภาพได้');
    } finally {
      setIsOptimizingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormImageData(undefined);
    setFormImageMimeType(undefined);
    setFormImageId(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = (customType?: RecipeType) => {
    const targetType = customType || recipeTypeFilter || 'FOOD';
    setEditingRecipe(null);
    setFormRecipeType(targetType);
    setFormName('');
    setFormCategory(
      targetType === 'SAUCE'
        ? 'ซอสและเครื่องปรุง'
        : targetType === 'RICE'
        ? 'ข้าวและเส้น'
        : 'อาหารจานเดียว'
    );
    setFormPortionYield(targetType === 'FOOD' ? 1 : 10);
    setFormInstructions('');
    setFormNotes('');
    setFormImageData(undefined);
    setFormImageMimeType(undefined);
    setFormImageId(undefined);
    setFormPreCookWeight('');
    setFormCookedWeight('');
    setFormEnableCookingLoss(true);
    setFormItems([
      {
        id: `item_${Date.now()}_1`,
        itemType: 'ingredient',
        ingredientId: safeIngredients[0]?.id || '',
        quantityUsed: 100,
        unit: safeIngredients[0]?.purchaseUnit || 'g',
        preparationLossPercent: 0,
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    const activeVersion =
      recipe.versions.find((v) => v.id === recipe.currentVersionId) || recipe.versions[0];
    setFormRecipeType(recipe.recipeType || 'FOOD');
    setFormName(recipe.name);
    setFormCategory(recipe.category);
    setFormInstructions(recipe.instructions || activeVersion?.instructions || '');
    setFormNotes(recipe.notes || activeVersion?.notes || '');
    setFormImageData(recipe.imageData);
    setFormImageMimeType(recipe.imageMimeType);
    setFormImageId(recipe.imageId);
    setFormPortionYield(activeVersion?.portionYield || 1);
    setFormItems(
      activeVersion?.ingredients.map((item) => ({
        ...item,
        itemType: item.itemType || (recipesMap.has(item.ingredientId) ? 'recipe' : 'ingredient'),
      })) || []
    );

    if (activeVersion?.cookedWeight !== undefined && activeVersion.cookedWeight > 0) {
      setFormCookedWeight(String(activeVersion.cookedWeight));
      setFormPreCookWeight(
        activeVersion.preCookWeight !== undefined ? String(activeVersion.preCookWeight) : ''
      );
      setFormEnableCookingLoss(true);
    } else if (activeVersion?.preparationLossPercent && activeVersion.preparationLossPercent > 0) {
      setFormEnableCookingLoss(true);
      setFormPreCookWeight(
        activeVersion.preCookWeight !== undefined ? String(activeVersion.preCookWeight) : ''
      );
      setFormCookedWeight('');
    } else {
      setFormEnableCookingLoss(false);
      setFormCookedWeight('');
      setFormPreCookWeight('');
    }

    setIsModalOpen(true);
  };

  const openVersionHistoryModal = (recipe: Recipe) => {
    setTargetVersionRecipe(recipe);
    const activeVersion =
      recipe.versions.find((v) => v.id === recipe.currentVersionId) || recipe.versions[0];
    setNewVersionLabel(`v${recipe.versions.length + 1}.0`);
    setNewVersionNotes('');
    setFormPortionYield(activeVersion?.portionYield || 1);
    setFormItems(activeVersion?.ingredients.map((i) => ({ ...i })) || []);
    if (activeVersion?.cookedWeight !== undefined && activeVersion.cookedWeight > 0) {
      setFormCookedWeight(String(activeVersion.cookedWeight));
      setFormPreCookWeight(
        activeVersion.preCookWeight !== undefined ? String(activeVersion.preCookWeight) : ''
      );
      setFormEnableCookingLoss(true);
    } else {
      setFormEnableCookingLoss(
        activeVersion?.preparationLossPercent ? activeVersion.preparationLossPercent > 0 : false
      );
      setFormCookedWeight('');
      setFormPreCookWeight('');
    }
    setIsVersionModalOpen(true);
  };

  const handleDuplicateRecipe = async (recipe: Recipe) => {
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      if (onDuplicateRecipe) {
        await onDuplicateRecipe(recipe.id);
      } else {
        // Fallback duplicate via onSaveRecipe
        const activeVer =
          recipe.versions.find((v) => v.id === recipe.currentVersionId) || recipe.versions[0];
        await onSaveRecipe({
          name: `${recipe.name} (สำเนา)`,
          category: recipe.category,
          recipeType: recipe.recipeType || 'FOOD',
          imageData: recipe.imageData,
          imageMimeType: recipe.imageMimeType,
          imageId: recipe.imageId,
          instructions: recipe.instructions,
          notes: recipe.notes ? `สำเนาจาก ${recipe.name}` : undefined,
          ingredients: (activeVer?.ingredients || []).map((i) => ({ ...i })),
          preparationLossPercent: activeVer?.preparationLossPercent || 0,
          portionYield: activeVer?.portionYield || 1,
          preCookWeight: activeVer?.preCookWeight,
          cookedWeight: activeVer?.cookedWeight,
          cookingLossWeight: activeVer?.cookingLossWeight,
        });
      }
    } catch (err) {
      console.error('Failed to duplicate recipe:', err);
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleAddItemRow = () => {
    const firstIng = ingredients[0];
    setFormItems([
      ...formItems,
      {
        id: `item_${Date.now()}_${formItems.length + 1}`,
        itemType: 'ingredient',
        ingredientId: firstIng ? firstIng.id : '',
        quantityUsed: 50,
        unit: firstIng ? firstIng.purchaseUnit : 'g',
        preparationLossPercent: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'ingredientId' | 'quantityUsed' | 'unit' | 'preparationLossPercent' | 'notes',
    val: unknown
  ) => {
    const next = [...formItems];
    if (field === 'ingredientId') {
      const selectedId = val as string;

      // Check Circular Dependency
      if (recipesMap.has(selectedId)) {
        const isCircular = hasCircularRecipeDependency(editingRecipe?.id, selectedId, recipesMap);
        if (isCircular) {
          alert('ไม่สามารถเลือกสูตรที่ทำให้เกิดการอ้างอิงวนซ้ำได้');
          return;
        }
        const subRec = recipesMap.get(selectedId);
        const subVer =
          subRec?.versions.find((v) => v.id === subRec.currentVersionId) || subRec?.versions[0];
        const defaultUnit: UnitType =
          (subVer?.cookedWeight && subVer.cookedWeight > 0) ||
          (subVer?.preCookWeight && subVer.preCookWeight > 0)
            ? 'g'
            : 'piece';

        next[index] = {
          ...next[index],
          itemType: 'recipe',
          ingredientId: selectedId,
          unit: defaultUnit,
        };
      } else {
        const ing = ingredientsMap.get(selectedId);
        next[index] = {
          ...next[index],
          itemType: 'ingredient',
          ingredientId: selectedId,
          unit: ing ? ing.purchaseUnit : next[index].unit,
        };
      }
    } else {
      next[index] = {
        ...next[index],
        [field]: val,
      };
    }
    setFormItems(next);
  };

  // Live Recipe Calculation Preview in Form using sub-recipes map & auto-calculated prep loss %
  const dummyVersion: RecipeVersion = {
    id: editingRecipe ? editingRecipe.currentVersionId : 'preview',
    recipeId: editingRecipe ? editingRecipe.id : 'preview',
    versionNumber: 1,
    effectiveDate: new Date().toISOString(),
    ingredients: formItems,
    preparationLossPercent: isCookedWeightInvalid ? 0 : calculatedPrepLossPercent,
    portionYield: Math.max(1, formPortionYield || 1),
    preCookWeight: effectivePreCookWeight > 0 ? effectivePreCookWeight : undefined,
    cookedWeight: isCookingLossActive && !isCookedWeightInvalid ? effectiveCookedWeight : undefined,
    cookingLossWeight: calculatedCookingLossWeight > 0 ? calculatedCookingLossWeight : undefined,
    instructions: formInstructions,
  };

  const previewCost = calculateRecipeCost(dummyVersion, ingredientsMap, recipesMap);

  const handleSaveRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อสูตร');
      return;
    }
    if (formItems.length === 0) {
      alert('กรุณาเพิ่มวัตถุดิบหรือส่วนประกอบอย่างน้อย 1 รายการ');
      return;
    }
    if (isCookedWeightInvalid) {
      alert('น้ำหนักหลังปรุงต้องไม่มากกว่าน้ำหนักก่อนปรุง');
      return;
    }

    // Final circular check before saving
    for (const item of formItems) {
      if (recipesMap.has(item.ingredientId)) {
        if (hasCircularRecipeDependency(editingRecipe?.id, item.ingredientId, recipesMap)) {
          alert('ไม่สามารถเลือกสูตรที่ทำให้เกิดการอ้างอิงวนซ้ำได้');
          return;
        }
      }
    }

    const finalPreCookWeight = effectivePreCookWeight > 0 ? effectivePreCookWeight : undefined;
    const finalCookedWeight = isCookingLossActive ? effectiveCookedWeight : undefined;
    const finalCookingLoss =
      calculatedCookingLossWeight > 0 ? calculatedCookingLossWeight : undefined;
    const finalPrepLoss = isCookingLossActive ? calculatedPrepLossPercent : 0;
    const finalRecipeType = formRecipeType || editingRecipe?.recipeType || recipeTypeFilter || 'FOOD';

    if (editingRecipe && onUpdateRecipeVersion) {
      await onUpdateRecipeVersion(editingRecipe.id, {
        name: formName.trim(),
        category: formCategory,
        recipeType: finalRecipeType,
        imageUrl: formImageData,
        imageData: formImageData,
        imageMimeType: formImageMimeType,
        instructions: formInstructions.trim() || undefined,
        notes: formNotes.trim() || undefined,
        ingredients: formItems,
        preparationLossPercent: finalPrepLoss,
        portionYield: Math.max(1, Number(formPortionYield) || 1),
        preCookWeight: finalPreCookWeight,
        cookedWeight: finalCookedWeight,
        cookingLossWeight: finalCookingLoss,
      });
    } else {
      await onSaveRecipe({
        id: editingRecipe?.id,
        name: formName.trim(),
        category: formCategory,
        recipeType: finalRecipeType,
        imageUrl: formImageData,
        imageData: formImageData,
        imageMimeType: formImageMimeType,
        instructions: formInstructions.trim() || undefined,
        notes: formNotes.trim() || undefined,
        ingredients: formItems,
        preparationLossPercent: finalPrepLoss,
        portionYield: Math.max(1, Number(formPortionYield) || 1),
        preCookWeight: finalPreCookWeight,
        cookedWeight: finalCookedWeight,
        cookingLossWeight: finalCookingLoss,
      });
    }

    setIsModalOpen(false);
  };

  const handleCreateVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVersionRecipe || !handleCreateVersionFn) return;
    if (isCookedWeightInvalid) {
      alert('น้ำหนักหลังปรุงต้องไม่มากกว่าน้ำหนักก่อนปรุง');
      return;
    }

    const finalPreCookWeight = effectivePreCookWeight > 0 ? effectivePreCookWeight : undefined;
    const finalCookedWeight = isCookingLossActive ? effectiveCookedWeight : undefined;
    const finalCookingLoss =
      calculatedCookingLossWeight > 0 ? calculatedCookingLossWeight : undefined;
    const finalPrepLoss = isCookingLossActive ? calculatedPrepLossPercent : 0;

    await handleCreateVersionFn(targetVersionRecipe.id, {
      versionLabel: newVersionLabel.trim() || undefined,
      ingredients: formItems,
      preparationLossPercent: finalPrepLoss,
      portionYield: Math.max(1, Number(formPortionYield) || 1),
      preCookWeight: finalPreCookWeight,
      cookedWeight: finalCookedWeight,
      cookingLossWeight: finalCookingLoss,
      notes: newVersionNotes.trim() || undefined,
    });

    setIsVersionModalOpen(false);
  };

  const categories = Array.from(new Set(currentViewRecipes.map((r) => r.category))).filter(Boolean);

  const filteredRecipes = currentViewRecipes.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === 'ALL' || r.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const currentTab: MainTab =
    recipeTypeFilter === 'SAUCE'
      ? 'sauce_recipes'
      : recipeTypeFilter === 'RICE'
      ? 'rice_recipes'
      : 'recipes';

  const activeRecipeType: RecipeType = (recipeTypeFilter || 'FOOD') as RecipeType;

  const PageIcon = pageConfig.icon;

  return (
    <div className="space-y-5 pb-12">
      {/* Recipe Menu Section Navigation with Custom Ordering & Quick Add */}
      <RecipeMenuSectionNav
        activeTab={currentTab}
        onChangeTab={(tab) => {
          if (onNavigate) {
            onNavigate(tab);
          }
        }}
        order={recipeMenuOrder}
        onOrderChange={(newOrder) => {
          if (onReorderRecipeMenu) {
            onReorderRecipeMenu(newOrder);
          }
        }}
        onOpenAddRecipe={() => openAddModal(activeRecipeType)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <PageIcon className={`w-6 h-6 ${pageConfig.iconColor}`} />
            <span>{pageConfig.title}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">{pageConfig.subtitle}</p>
        </div>

        <button
          onClick={() => openAddModal(activeRecipeType)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{pageConfig.addButtonLabel}</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`ค้นหา${pageConfig.title}...`}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ทั้งหมด ({currentViewRecipes.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipes List Grid (Mobile First: 1 col on mobile, 2 on md, 3 on lg) */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => {
            const activeVersion =
              recipe.versions.find((v) => v.id === recipe.currentVersionId) || recipe.versions[0];
            const cost = calculateRecipeCost(activeVersion, ingredientsMap, recipesMap);

            const hasCookedWeight = activeVersion.cookedWeight && activeVersion.cookedWeight > 0;
            const costPerGram = hasCookedWeight
              ? cost.totalProductionCost / activeVersion.cookedWeight!
              : null;

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all group"
              >
                <div>
                  {/* Top Bar: Category & Version & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${pageConfig.badgeColor}`}>
                        {recipe.category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-orange-500" />
                        {activeVersion.versionLabel || `v${activeVersion.versionNumber}.0`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleDuplicateRecipe(recipe)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="คัดลอกสูตรนี้ (Duplicate Recipe)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openVersionHistoryModal(recipe)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="ดูเวอร์ชันสูตรและประวัติการปรับปรุง"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(recipe)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไขสูตรอาหาร"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(recipe.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ลบสูตรอาหาร"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title, Image and Notes */}
                  <div className="flex items-start gap-3 mt-2.5">
                    {recipe.imageData ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-gray-200 bg-gray-50">
                        <img
                          src={recipe.imageData}
                          alt={recipe.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 leading-snug group-hover:text-orange-600 transition-colors truncate">
                        {recipe.name}
                      </h3>
                      {recipe.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{recipe.notes}</p>
                      )}
                      {recipe.instructions && !recipe.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 italic">
                          วิธีทำ: {recipe.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Highlight Unit Cost Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>ต้นทุนผลผลิตต่อหน่วย:</span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {hasCookedWeight
                          ? `(น้ำหนักปรุงสุก ${formatNumber(activeVersion.cookedWeight!)} g)`
                          : `(ทำได้ ${activeVersion.portionYield} ที่)`}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-xl font-black text-orange-600">
                        {hasCookedWeight && costPerGram !== null ? (
                          <>
                            {formatCurrency(costPerGram, '฿', 3)}
                            <span className="text-xs font-normal text-gray-500"> / กรัม (g)</span>
                          </>
                        ) : (
                          <>
                            {formatCurrency(cost.costPerPortion)}
                            <span className="text-xs font-normal text-gray-500"> / จาน-ที่</span>
                          </>
                        )}
                      </div>

                      {hasCookedWeight && costPerGram !== null && (
                        <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded border border-orange-200">
                          {formatCurrency(costPerGram * 100, '฿', 2)}/100g
                        </span>
                      )}
                    </div>

                    {/* Yield / Prep Loss summary */}
                    <div className="pt-1.5 border-t border-orange-200/50 flex items-center justify-between text-[11px] text-gray-600">
                      <span>ต้นทุนรวมทั้งสูตร:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(cost.totalProductionCost)}</span>
                    </div>

                    {activeVersion.preparationLossPercent > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-amber-700">
                        <span>สูญเสียขณะปรุง (Prep Loss):</span>
                        <span className="font-semibold">{formatPercent(activeVersion.preparationLossPercent)}</span>
                      </div>
                    )}
                  </div>

                  {/* Top Ingredients Summary */}
                  <div className="mt-3 space-y-1">
                    <span className="text-[11px] font-bold text-gray-500">ส่วนประกอบในสูตร ({cost.items.length} รายการ):</span>
                    <div className="space-y-1 text-xs">
                      {cost.items.slice(0, 3).map((item) => (
                        <div key={item.ingredientId} className="flex items-center justify-between text-gray-600">
                          <span className="truncate pr-2 flex items-center gap-1">
                            {item.itemType === 'recipe' ? (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold shrink-0">
                                สูตร
                              </span>
                            ) : (
                              '•'
                            )}{' '}
                            {item.ingredientName} ({formatNumber(item.quantityUsed)} {item.unit})
                          </span>
                          <span className="font-medium text-gray-900 shrink-0">
                            {formatCurrency(item.totalItemCost)}
                          </span>
                        </div>
                      ))}
                      {cost.items.length > 3 && (
                        <div className="text-[11px] text-gray-400">
                          + อีก {cost.items.length - 3} รายการ...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-gray-400">
                    {recipe.versions.length} เวอร์ชัน
                  </span>
                  <button
                    onClick={() => openEditModal(recipe)}
                    className="font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>ดูรายละเอียดสูตร</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 sm:p-10 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className={`w-12 h-12 rounded-2xl ${pageConfig.bgColor} ${pageConfig.iconColor} mx-auto flex items-center justify-center`}>
            <PageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">{pageConfig.emptyTitle}</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">{pageConfig.emptySubtitle}</p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{pageConfig.addButtonLabel}</span>
          </button>
        </div>
      )}

      {/* Add / Edit Recipe Modal (Shared Reuse for Food, Sauce, Rice) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecipe ? `แก้ไข: ${editingRecipe.name}` : `${pageConfig.addButtonLabel}`}
        subtitle="ระบุวัตถุดิบ ปริมาณ และน้ำหนักเพื่อคำนวณต้นทุนการผลิตและ Yield"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveRecipeSubmit} className="space-y-4">
          {/* Recipe Type Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">ประเภทสูตร (Recipe Type)</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormRecipeType('FOOD')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  formRecipeType === 'FOOD'
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>สูตรอาหาร (Food)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormRecipeType('SAUCE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  formRecipeType === 'SAUCE'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Soup className="w-3.5 h-3.5" />
                <span>สูตรซอส (Sauce)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormRecipeType('RICE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  formRecipeType === 'RICE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Wheat className="w-3.5 h-3.5" />
                <span>สูตรข้าว-เส้น (Rice)</span>
              </button>
            </div>
          </div>

          {/* Image Upload & Recipe Basic Info */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Image Preview & Upload Button */}
            <div className="sm:w-36 flex flex-col items-center justify-center shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFileChange(file);
                }}
              />
              {formImageData ? (
                <div className="relative w-full h-32 sm:h-full min-h-[120px] rounded-2xl overflow-hidden border border-gray-200 group bg-gray-50">
                  <img
                    src={formImageData}
                    alt="Recipe preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-white/90 text-gray-800 rounded-lg hover:bg-white transition-colors"
                      title="เปลี่ยนรูปภาพ"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isOptimizingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 sm:h-full min-h-[110px] rounded-2xl border-2 border-dashed border-gray-300 hover:border-orange-500 bg-gray-50 hover:bg-orange-50/50 flex flex-col items-center justify-center gap-1.5 p-3 text-gray-500 hover:text-orange-600 transition-all"
                >
                  <div className="p-2 rounded-xl bg-white shadow-xs text-orange-600">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-center">
                    {isOptimizingImage ? 'กำลังประมวลผล...' : '+ เพิ่มรูปเมนู'}
                  </span>
                  <span className="text-[9px] text-gray-400 text-center">บีบอัดอัตโนมัติ</span>
                </button>
              )}
            </div>

            {/* Form Fields: Name, Category, Portion Yield */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">ชื่อสูตร *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={
                    formRecipeType === 'SAUCE'
                      ? 'เช่น ซอสกะเพราเข้มข้น, น้ำจิ้มซีฟู้ดมะนาวสด...'
                      : formRecipeType === 'RICE'
                      ? 'เช่น ข้าวสวยหอมมะลิหุงสุก, เส้นเล็กต้มลวก...'
                      : 'เช่น ข้าวกะเพราไก่ไข่ดาว, ต้มยำกุ้ง...'
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">หมวดหมู่</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="เช่น ซอส, ข้าว, อาหารจานเดียว"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Portion Yield */}
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  {formRecipeType === 'FOOD'
                    ? 'จำนวนที่ได้ต่อสูตร (Portions) *'
                    : 'จำนวนหน่วยเสิร์ฟโดยประมาณ *'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={formPortionYield}
                  onChange={(e) => setFormPortionYield(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">คำอธิบาย / จุดสังเกต</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="เช่น สูตรนี้เหมาะสำหรับ 1 ที่, รสเผ็ดจัดจ้าน..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Instructions / Preparation steps */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <span>ขั้นตอนและวิธีการปรุง (Instructions / Recipe Method)</span>
              <span className="text-[10px] text-gray-400 font-normal">(บันทึกวิธีทำอย่างละเอียด)</span>
            </label>
            <textarea
              rows={2}
              value={formInstructions}
              onChange={(e) => setFormInstructions(e.target.value)}
              placeholder="1. ตั้งกระทะไฟกลาง ใส่น้ำมันและพริกกระเทียมลงผัดจนหอม&#10;2. ใส่เนื้อสัตว์ ผัดพอสุก แล้วปรุงรสด้วยซอสกะเพรา..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Cooking Loss & Cooked Weight Section */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Scale className="w-4 h-4 text-amber-700" />
                <span>การคำนวณผลผลิต & สูญเสียขณะปรุง (Cooked Yield & Loss)</span>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-amber-800">
                <input
                  type="checkbox"
                  checked={formEnableCookingLoss}
                  onChange={(e) => {
                    setFormEnableCookingLoss(e.target.checked);
                    if (!e.target.checked) {
                      setFormCookedWeight('');
                    }
                  }}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
                <span>คำนวณสูญเสียขณะปรุง</span>
              </label>
            </div>

            {formEnableCookingLoss ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Pre-Cook Weight */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-gray-700">1. น้ำหนักก่อนปรุง (กรัม)</label>
                    <span className="text-[10px] text-gray-400">
                      {formPreCookWeight ? '(กำหนดเอง)' : '(รวมจากวัตถุดิบ)'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={autoSumPreCookWeight > 0 ? `${formatNumber(autoSumPreCookWeight, 1)} g` : '0'}
                      value={formPreCookWeight}
                      onChange={(e) => setFormPreCookWeight(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-400">กรัม (g)</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    รวมจากวัตถุดิบ: {formatNumber(autoSumPreCookWeight, 1)} กรัม
                  </p>
                </div>

                {/* 2. Cooked Weight */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-gray-800">
                      2. น้ำหนักหลังปรุง (Cooked Weight) *
                    </label>
                    <span className="text-[10px] font-semibold text-orange-600">กรอกค่าน้ำหนักจริง</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder={
                        effectivePreCookWeight > 0
                          ? `เช่น ${formatNumber(effectivePreCookWeight * (recipeTypeFilter === 'RICE' ? 2.2 : 0.85), 0)}`
                          : 'กรอกน้ำหนักหลังปรุง'
                      }
                      value={formCookedWeight}
                      onChange={(e) => setFormCookedWeight(e.target.value)}
                      className={`w-full px-3 py-2 text-sm font-semibold border rounded-xl focus:ring-2 focus:outline-none ${
                        isCookedWeightInvalid
                          ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-rose-400'
                          : 'border-amber-300 bg-white text-gray-900 focus:ring-orange-500'
                      }`}
                    />
                    <span className="absolute right-3 top-2 text-xs text-gray-500 font-normal">กรัม (g)</span>
                  </div>
                  {isCookedWeightInvalid ? (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ น้ำหนักหลังปรุงต้องไม่มากกว่าน้ำหนักก่อนปรุง ({formatNumber(effectivePreCookWeight)} g)
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500">
                      ชั่งน้ำหนักสุทธิหลังหุง/เคี่ยวสุกเสร็จแล้ว
                    </p>
                  )}
                </div>

                {/* 3. Cooking Loss Weight (Read-only) */}
                <div className="space-y-1 p-2.5 bg-white/90 border border-amber-200/60 rounded-xl">
                  <span className="text-gray-600 block text-[11px]">3. น้ำหนักที่หายไปขณะปรุง:</span>
                  <div className="text-sm font-black text-gray-900">
                    {formatNumber(calculatedCookingLossWeight, 2)}{' '}
                    <span className="text-xs font-normal text-gray-500">กรัม (g)</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    (ก่อนปรุง − หลังปรุง)
                  </span>
                </div>

                {/* 4. Prep Loss % (Read-only Auto-calculated) */}
                <div className="space-y-1 p-2.5 bg-orange-100/80 border border-orange-300/80 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-900 font-bold text-[11px]">4. สูญเสียขณะปรุง (Prep Loss %):</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-200/90 text-orange-800 font-semibold">
                      คำนวณอัตโนมัติ
                    </span>
                  </div>
                  <div className="text-base font-black text-orange-700">
                    {formatPercent(calculatedPrepLossPercent)}
                  </div>
                  <span className="text-[10px] text-orange-800/70 block">
                    ระบบคำนวณอัตโนมัติ ห้ามกรอกเอง
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-800/80">
                ไม่มีการสูญเสียขณะปรุง (Prep Loss = 0%) ต้นทุนวัตถุดิบจะคิดตามปริมาณตั้งต้นเต็ม 100%
              </p>
            )}
          </div>

          {/* Ingredient & Sub-Recipe Items Table Builder */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">
                รายการวัตถุดิบ & ส่วนประกอบในสูตร ({formItems.length} รายการ)
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ เพิ่มรายการ</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formItems.map((item, idx) => {
                const calculatedItem = previewCost.items[idx];
                const isSubRecipeItem =
                  item.itemType === 'recipe' || recipesMap.has(item.ingredientId);

                return (
                  <div
                    key={item.id || idx}
                    className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2 text-xs"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Item Selector (Ingredient Master + Sauce Recipes + Rice Recipes) */}
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium text-gray-800 text-xs"
                        >
                          {/* 1. Ingredients Master */}
                          <optgroup label="📦 วัตถุดิบ (Ingredient Master)">
                            {safeIngredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({formatCurrency(ing.effectiveCostPerBaseUnit, '฿', 3)}/{UNIT_LABELS[ing.purchaseUnit]?.baseUnit || ing.purchaseUnit})
                              </option>
                            ))}
                          </optgroup>

                          {/* 2. Sauce Recipes */}
                          {sauceRecipes.length > 0 && (
                            <optgroup label="🥣 สูตร ซอส (Sauce Recipes)">
                              {sauceRecipes.map((r) => {
                                const isCircular = hasCircularRecipeDependency(
                                  editingRecipe?.id,
                                  r.id,
                                  recipesMap
                                );
                                const activeVer =
                                  r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
                                const cost = calculateRecipeCost(activeVer, ingredientsMap, recipesMap);
                                const unitLabel = cost.outputBaseUnit || 'g';
                                const unitCost = cost.costPerBaseUnit || cost.costPerPortion;
                                return (
                                  <option key={r.id} value={r.id} disabled={isCircular}>
                                    {r.name} ({formatCurrency(unitCost, '฿', 3)}/{unitLabel}){isCircular ? ' ⛔ (วนซ้ำ)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}

                          {/* 3. Rice Recipes */}
                          {riceRecipes.length > 0 && (
                            <optgroup label="🍚 สูตร ข้าว-เส้น (Rice Recipes)">
                              {riceRecipes.map((r) => {
                                const isCircular = hasCircularRecipeDependency(
                                  editingRecipe?.id,
                                  r.id,
                                  recipesMap
                                );
                                const activeVer =
                                  r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
                                const cost = calculateRecipeCost(activeVer, ingredientsMap, recipesMap);
                                const unitLabel = cost.outputBaseUnit || 'g';
                                const unitCost = cost.costPerBaseUnit || cost.costPerPortion;
                                return (
                                  <option key={r.id} value={r.id} disabled={isCircular}>
                                    {r.name} ({formatCurrency(unitCost, '฿', 3)}/{unitLabel}){isCircular ? ' ⛔ (วนซ้ำ)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}

                          {/* 4. Other Food Recipes */}
                          {foodRecipes.length > 0 && (
                            <optgroup label="🍳 สูตรอาหารอื่น (Food Recipes)">
                              {foodRecipes.map((r) => {
                                const isCircular = hasCircularRecipeDependency(
                                  editingRecipe?.id,
                                  r.id,
                                  recipesMap
                                );
                                const activeVer =
                                  r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
                                const cost = calculateRecipeCost(activeVer, ingredientsMap, recipesMap);
                                return (
                                  <option key={r.id} value={r.id} disabled={isCircular}>
                                    {r.name} ({formatCurrency(cost.costPerPortion)}/ที่){isCircular ? ' ⛔ (วนซ้ำ)' : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantityUsed}
                          onChange={(e) =>
                            handleItemChange(idx, 'quantityUsed', parseFloat(e.target.value) || 0)
                          }
                          placeholder="ปริมาณ"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 text-right font-medium"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value as UnitType)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white focus:outline-none text-xs"
                        >
                          <option value="g">กรัม (g)</option>
                          <option value="kg">กก. (kg)</option>
                          <option value="ml">มล. (ml)</option>
                          <option value="L">ลิตร (L)</option>
                          <option value="piece">ชิ้น/ฟอง (pc)</option>
                          <option value="pack">แพ็ค</option>
                          <option value="bottle">ขวด</option>
                        </select>
                      </div>

                      {/* Calculated cost & Delete button */}
                      <div className="col-span-2 sm:col-span-2 flex items-center justify-between">
                        <span className="font-bold text-gray-900 truncate">
                          {calculatedItem ? formatCurrency(calculatedItem.totalItemCost) : '฿0.00'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recipe Live Cost Calculation Summary Card */}
          <div className="p-4 rounded-xl bg-orange-600 text-white space-y-2 text-xs shadow-md">
            <div className="flex items-center justify-between border-b border-orange-500 pb-2">
              <span className="font-bold text-orange-200">ผลการคำนวณต้นทุนการผลิตแบบเรียลไทม์:</span>
              <span className="font-semibold text-orange-100">
                {isCookingLossActive && effectiveCookedWeight > 0
                  ? `น้ำหนักสุทธิ ${formatNumber(effectiveCookedWeight)} g`
                  : `ได้ ${formPortionYield} ที่`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div>
                <span className="text-orange-200 text-[11px]">ต้นทุนวัตถุดิบรวม:</span>
                <div className="text-sm font-bold">
                  {formatCurrency(previewCost.totalRawIngredientCost)}
                </div>
              </div>
              <div>
                <span className="text-orange-200 text-[11px]">สูญเสียขณะปรุง:</span>
                <div className="text-sm font-bold">
                  +{formatCurrency(previewCost.recipeLevelPrepLossCost)}
                </div>
              </div>
              <div>
                <span className="text-orange-200 text-[11px]">ต้นทุนรวมทั้งหมด:</span>
                <div className="text-sm font-bold">
                  {formatCurrency(previewCost.totalProductionCost)}
                </div>
              </div>
              <div className="bg-orange-700/80 p-2 rounded-lg border border-orange-400/40">
                <span className="text-orange-100 text-[11px] font-bold">ต้นทุนต่อหน่วย:</span>
                <div className="text-base font-black text-amber-300">
                  {previewCost.outputBaseUnit === 'g' && previewCost.costPerBaseUnit
                    ? `${formatCurrency(previewCost.costPerBaseUnit, '฿', 3)}/g`
                    : `${formatCurrency(previewCost.costPerPortion)}/ที่`}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs"
            >
              {editingRecipe ? 'บันทึกการแก้ไขสูตร' : pageConfig.addButtonLabel}
            </button>
          </div>
        </form>
      </Modal>

      {/* Version History & New Version Modal */}
      <Modal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title={`จัดการเวอร์ชัน: ${targetVersionRecipe?.name || ''}`}
        subtitle="ประวัติการพัฒนาสูตร และการสร้างสูตรปรับปรุงเวอร์ชันใหม่"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Existing Versions List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-700">เวอร์ชันทั้งหมดที่มีในระบบ:</h4>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {targetVersionRecipe?.versions.map((ver) => {
                const isActive = ver.id === targetVersionRecipe.currentVersionId;
                const verCost = calculateRecipeCost(ver, ingredientsMap, recipesMap);

                return (
                  <div
                    key={ver.id}
                    className={`p-3 flex items-center justify-between text-xs transition-colors ${
                      isActive ? 'bg-orange-50/70 font-medium' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {ver.versionLabel || `v${ver.versionNumber}.0`}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-600 text-white">
                            เวอร์ชันที่ใช้อยู่ (Active)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {formatDateThai(ver.effectiveDate)} • {ver.ingredients.length} รายการ • ทำได้{' '}
                        {ver.cookedWeight ? `${formatNumber(ver.cookedWeight)} g` : `${ver.portionYield} ที่`}
                      </div>
                      {ver.notes && <div className="text-[11px] text-gray-600 mt-0.5">{ver.notes}</div>}
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="font-black text-orange-600 text-sm">
                          {ver.cookedWeight && ver.cookedWeight > 0
                            ? `${formatCurrency(verCost.totalProductionCost / ver.cookedWeight, '฿', 3)}/g`
                            : `${formatCurrency(verCost.costPerPortion)}/ที่`}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          รวม: {formatCurrency(verCost.totalProductionCost)}
                        </div>
                      </div>

                      {!isActive && handleSwitchVersionFn && (
                        <button
                          type="button"
                          onClick={() => {
                            if (targetVersionRecipe) {
                              handleSwitchVersionFn(targetVersionRecipe.id, ver.id);
                              setIsVersionModalOpen(false);
                            }
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-300 hover:bg-orange-600 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          สลับใช้สูตรนี้
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form to Create a New Version */}
          <form onSubmit={handleCreateVersionSubmit} className="pt-3 border-t border-gray-200 space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-gray-900">สร้างสูตรเวอร์ชันใหม่ (New Recipe Version)</h4>
            </div>
            <p className="text-[11px] text-gray-500">
              ระบบจะเก็บสูตรเวอร์ชันเดิมไว้เป็นประวัติ ไม่มีการลบทับสูตรเก่า
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ชื่อเวอร์ชันใหม่ *</label>
                <input
                  type="text"
                  required
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                  placeholder="เช่น v2.0 (ปรับสัดส่วนใหม่)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">บันทึกเหตุผลการปรับปรุง</label>
                <input
                  type="text"
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  placeholder="เช่น เพิ่มกระเทียมเจียวเพื่อความหอม"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>บันทึกเป็นเวอร์ชันใหม่</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deletingId) onDeleteRecipe(deletingId);
        }}
        title="ยืนยันการลบสูตร"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบสูตรนี้? สูตรอาหารหรือเมนูอาหารที่เชื่อมกับสูตรนี้จะได้รับผลกระทบ"
        confirmText="ลบสูตร"
        isDestructive
      />
    </div>
  );
};

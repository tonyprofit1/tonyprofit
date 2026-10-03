import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Edit2,
  Trash2,
  History,
  Scale,
  Sparkles,
  Camera,
  Image as ImageIcon,
  X,
  RotateCcw,
  Utensils,
  Leaf,
  Beef,
  Coffee,
  Wheat,
  Pipette,
  Box,
  HelpCircle,
  Lock,
  Check,
  Percent,
} from 'lucide-react';
import {
  Ingredient,
  IngredientCategory,
  IngredientPriceHistory,
  IngredientPurchase,
  INGREDIENT_CATEGORIES,
  DEFAULT_INGREDIENT_CATEGORY,
  UnitType,
  UNIT_LABELS,
  normalizeIngredientCategory,
} from '../types';
import { calculateIngredientCost } from '../calculations/ingredientCost';
import { toBaseUnitQuantity } from '../calculations/units';
import { formatCurrency, formatNumber, formatPercent, formatDateThai } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { optimizeImageFile } from '../utils/imageOptimizer';

export interface IngredientsViewProps {
  ingredients: Ingredient[];
  priceHistory?: IngredientPriceHistory[];
  purchases?: IngredientPurchase[];
  onSaveIngredient: (
    data: {
      id?: string;
      name: string;
      category: IngredientCategory;
      imageId?: string;
      imageData?: string;
      imageMimeType?: string;
      imageUpdatedAt?: string;
      purchaseUnit: UnitType;
      purchaseQuantity: number;
      purchasePrice: number;
      usableYieldPercent: number;
      rawStartingWeight?: number;
      scrapWeight?: number;
      usableWeight?: number;
      notes?: string;
    },
    priceReason?: string
  ) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onRecordPurchase: (data: {
    ingredientId: string;
    supplier: string;
    purchaseDate: string;
    quantity: number;
    unit: UnitType;
    totalPrice: number;
    notes?: string;
    rawStartingWeight?: number;
    scrapWeight?: number;
    usableWeight?: number;
    yieldPercent?: number;
  }) => Promise<void>;
}

type SortOption = 'th-asc' | 'th-desc' | 'en-asc' | 'en-desc';

export const IngredientsView: React.FC<IngredientsViewProps> = ({
  ingredients = [],
  priceHistory = [],
  onSaveIngredient,
  onDeleteIngredient,
  onRecordPurchase,
}) => {
  // 1. Category state: default is strictly "ผักสด"
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory>(DEFAULT_INGREDIENT_CATEGORY);

  // 2. Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAllCategories, setSearchAllCategories] = useState(false);

  // 3. Sort state: default is Thai A-Z (ก → ฮ)
  const [sortOption, setSortOption] = useState<SortOption>('th-asc');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  // Quick Purchase modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseTargetIngredient, setPurchaseTargetIngredient] = useState<Ingredient | null>(null);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(1);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');

  // History modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetIngredient, setHistoryTargetIngredient] = useState<Ingredient | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Unified Form states for Add/Edit + Purchase + Yield
  const [formData, setFormData] = useState<{
    name: string;
    category: IngredientCategory;
    imageId?: string;
    imageData?: string;
    imageMimeType?: string;
    imageUpdatedAt?: string;
    // Section 2: Purchase Data
    purchaseUnit: UnitType;
    purchaseQuantity: number;
    purchasePrice: number;
    // Section 3: Yield / Trimming Test Data
    isNoLoss: boolean;
    rawStartingWeight: number;
    usableWeight: number;
    // Notes & Reason
    notes: string;
    priceChangeReason: string;
  }>({
    name: '',
    category: DEFAULT_INGREDIENT_CATEGORY,
    purchaseUnit: 'kg',
    purchaseQuantity: 1,
    purchasePrice: 95,
    isNoLoss: false,
    rawStartingWeight: 1000,
    usableWeight: 900,
    notes: '',
    priceChangeReason: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Open Add modal: Category is automatically set to the currently active category
  const openAddModal = () => {
    setEditingIngredient(null);
    const initialUnit: UnitType = 'kg';
    const initialQty = 1;
    const baseInfo = toBaseUnitQuantity(initialQty, initialUnit);
    const defaultNoLoss = selectedCategory === 'ซอส' || selectedCategory === 'แพ็คเกจ' || selectedCategory === 'ของแห้ง';

    setFormData({
      name: '',
      category: selectedCategory, // Automatically locked to active category
      imageId: undefined,
      imageData: undefined,
      imageMimeType: undefined,
      imageUpdatedAt: undefined,
      purchaseUnit: initialUnit,
      purchaseQuantity: initialQty,
      purchasePrice: 95,
      isNoLoss: defaultNoLoss,
      rawStartingWeight: baseInfo.baseQuantity,
      usableWeight: defaultNoLoss ? baseInfo.baseQuantity : Math.round(baseInfo.baseQuantity * 0.9),
      notes: '',
      priceChangeReason: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit modal: Category remains editable if user wants to move category
  const openEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    const baseInfo = toBaseUnitQuantity(ing.purchaseQuantity, ing.purchaseUnit);
    const isNoLoss = ing.usableYieldPercent >= 100 && (!ing.scrapWeight || ing.scrapWeight === 0);
    const rawWeight = ing.rawStartingWeight ?? baseInfo.baseQuantity;
    const usable = ing.usableWeight ?? (ing.rawStartingWeight ? Math.round(ing.rawStartingWeight * (ing.usableYieldPercent / 100)) : Math.round(rawWeight * (ing.usableYieldPercent / 100)));

    setFormData({
      name: ing.name,
      category: normalizeIngredientCategory(ing.category),
      imageId: ing.imageId,
      imageData: ing.imageData,
      imageMimeType: ing.imageMimeType,
      imageUpdatedAt: ing.imageUpdatedAt,
      purchaseUnit: ing.purchaseUnit,
      purchaseQuantity: ing.purchaseQuantity,
      purchasePrice: ing.purchasePrice,
      isNoLoss,
      rawStartingWeight: rawWeight,
      usableWeight: usable,
      notes: ing.notes || '',
      priceChangeReason: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle image upload from file or camera
  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingImage(true);
      setFormError(null);
      const optimized = await optimizeImageFile(file, 300, 0.75);
      setFormData((prev) => ({
        ...prev,
        imageId: optimized.imageId,
        imageData: optimized.imageData,
        imageMimeType: optimized.imageMimeType,
        imageUpdatedAt: optimized.imageUpdatedAt,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถประมวลผลรูปภาพได้';
      setFormError(msg);
    } finally {
      setIsOptimizingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove product image
  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageId: undefined,
      imageData: undefined,
      imageMimeType: undefined,
      imageUpdatedAt: undefined,
    }));
  };

  const openPurchaseModal = (ing: Ingredient) => {
    setPurchaseTargetIngredient(ing);
    setPurchaseSupplier('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseQuantity(ing.purchaseQuantity);
    setPurchasePrice(ing.purchasePrice);
    setPurchaseNotes('');
    setIsPurchaseModalOpen(true);
  };

  const openHistoryModal = (ing: Ingredient) => {
    setHistoryTargetIngredient(ing);
    setIsHistoryModalOpen(true);
  };

  const openDeleteModal = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  // =========================================================================
  // Live Yield & Cost Calculation Engine
  // =========================================================================
  const baseUnitInfo = useMemo(() => {
    return toBaseUnitQuantity(formData.purchaseQuantity || 1, formData.purchaseUnit);
  }, [formData.purchaseQuantity, formData.purchaseUnit]);

  const baseUnit = baseUnitInfo.baseUnit;

  // Derive Weights, Yield %, Loss %, and Scrap Weight
  const rawWeightInput = Number(formData.rawStartingWeight) || 0;
  const usableWeightInput = Number(formData.usableWeight) || 0;

  let calculatedRawWeight = rawWeightInput;
  let calculatedUsableWeight = usableWeightInput;
  let calculatedScrapWeight = 0;
  let calculatedYieldPercent = 100;
  let calculatedLossPercent = 0;

  const isUsableExceedsRaw = !formData.isNoLoss && rawWeightInput > 0 && usableWeightInput > rawWeightInput;

  if (formData.isNoLoss) {
    calculatedRawWeight = baseUnitInfo.baseQuantity;
    calculatedUsableWeight = baseUnitInfo.baseQuantity;
    calculatedScrapWeight = 0;
    calculatedYieldPercent = 100;
    calculatedLossPercent = 0;
  } else {
    calculatedRawWeight = rawWeightInput;
    calculatedUsableWeight = usableWeightInput;
    calculatedScrapWeight = Math.max(0, calculatedRawWeight - calculatedUsableWeight);

    if (calculatedRawWeight > 0) {
      calculatedYieldPercent = (calculatedUsableWeight / calculatedRawWeight) * 100;
      calculatedLossPercent = (calculatedScrapWeight / calculatedRawWeight) * 100;
    } else {
      calculatedYieldPercent = 0;
      calculatedLossPercent = 0;
    }
  }

  // Cost calculations
  const totalPurchasePrice = Math.max(0, Number(formData.purchasePrice) || 0);
  const basePurchaseQty = baseUnitInfo.baseQuantity;
  const rawCostPerBaseUnit = basePurchaseQty > 0 ? totalPurchasePrice / basePurchaseQty : 0;
  const effectiveUsableQty = calculatedYieldPercent > 0 ? basePurchaseQty * (calculatedYieldPercent / 100) : 0;
  const effectiveCostPerBaseUnit = effectiveUsableQty > 0 ? totalPurchasePrice / effectiveUsableQty : rawCostPerBaseUnit;

  // Single Save Handler (Saves Ingredient + Yield + Price History + Purchase in 1 transaction)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('กรุณากรอกชื่อวัตถุดิบ');
      return;
    }
    if (formData.purchaseQuantity <= 0) {
      setFormError('จำนวนที่ซื้อต้องมากกว่า 0');
      return;
    }
    if (formData.purchasePrice < 0) {
      setFormError('ราคาซื้อต้องไม่ติดลบ');
      return;
    }

    if (!formData.isNoLoss) {
      if (calculatedRawWeight <= 0) {
        setFormError('น้ำหนักวัตถุดิบตั้งต้นต้องมากกว่า 0');
        return;
      }
      if (calculatedUsableWeight < 0) {
        setFormError('น้ำหนักที่ใช้ได้จริงต้องไม่ติดลบ');
        return;
      }
      if (calculatedUsableWeight > calculatedRawWeight) {
        setFormError('น้ำหนักที่ใช้ได้จริงต้องไม่มากกว่าน้ำหนักตั้งต้น');
        return;
      }
    }

    try {
      await onSaveIngredient(
        {
          id: editingIngredient?.id,
          name: formData.name.trim(),
          category: formData.category,
          imageId: formData.imageId,
          imageData: formData.imageData,
          imageMimeType: formData.imageMimeType,
          imageUpdatedAt: formData.imageUpdatedAt,
          purchaseUnit: formData.purchaseUnit,
          purchaseQuantity: Number(formData.purchaseQuantity),
          purchasePrice: Number(formData.purchasePrice),
          usableYieldPercent: calculatedYieldPercent,
          rawStartingWeight: calculatedRawWeight,
          scrapWeight: calculatedScrapWeight,
          usableWeight: calculatedUsableWeight,
          notes: formData.notes.trim() || undefined,
        },
        formData.priceChangeReason.trim() || undefined
      );
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseTargetIngredient) return;
    if (purchaseQuantity <= 0 || purchasePrice <= 0) {
      alert('กรุณากรอกจำนวนและราคารวมให้ถูกต้อง');
      return;
    }

    await onRecordPurchase({
      ingredientId: purchaseTargetIngredient.id,
      supplier: purchaseSupplier.trim() || 'ตลาดสด / ซัพพลายเออร์',
      purchaseDate,
      quantity: Number(purchaseQuantity),
      unit: purchaseTargetIngredient.purchaseUnit,
      totalPrice: Number(purchasePrice),
      notes: purchaseNotes.trim() || undefined,
    });
    setIsPurchaseModalOpen(false);
  };

  // Safe normalized ingredients list
  const normalizedIngredients = useMemo(() => {
    return (ingredients || []).map((ing) => ({
      ...ing,
      category: normalizeIngredientCategory(ing.category),
    }));
  }, [ingredients]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    INGREDIENT_CATEGORIES.forEach((c) => {
      counts[c.key] = 0;
    });
    normalizedIngredients.forEach((ing) => {
      const cat = ing.category;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts['อื่น'] = (counts['อื่น'] || 0) + 1;
      }
    });
    return counts;
  }, [normalizedIngredients]);

  // Filter & Sort list
  const displayedIngredients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // 1. Filter by search & category
    const filtered = normalizedIngredients.filter((ing) => {
      const matchSearch =
        !query ||
        ing.name.toLowerCase().includes(query) ||
        (ing.notes && ing.notes.toLowerCase().includes(query));

      if (searchAllCategories && query) {
        return matchSearch;
      }

      const matchCat = ing.category === selectedCategory;
      return matchSearch && matchCat;
    });

    // 2. Sort according to selection (Thai localeCompare default ก → ฮ)
    return filtered.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';

      switch (sortOption) {
        case 'th-asc':
          return nameA.localeCompare(nameB, 'th', { sensitivity: 'base', numeric: true });
        case 'th-desc':
          return nameB.localeCompare(nameA, 'th', { sensitivity: 'base', numeric: true });
        case 'en-asc':
          return nameA.localeCompare(nameB, 'en', { sensitivity: 'base', numeric: true });
        case 'en-desc':
          return nameB.localeCompare(nameA, 'en', { sensitivity: 'base', numeric: true });
        default:
          return nameA.localeCompare(nameB, 'th', { sensitivity: 'base' });
      }
    });
  }, [normalizedIngredients, selectedCategory, searchQuery, searchAllCategories, sortOption]);

  // Category Icon & Color Helper
  const getCategoryTheme = (cat: IngredientCategory) => {
    switch (cat) {
      case 'ผักสด':
        return {
          icon: Leaf,
          bgColor: 'bg-emerald-50 text-emerald-600',
          badgeColor: 'bg-emerald-100 text-emerald-800',
        };
      case 'เนื้อสัตว์ ไข่':
        return {
          icon: Beef,
          bgColor: 'bg-rose-50 text-rose-600',
          badgeColor: 'bg-rose-100 text-rose-800',
        };
      case 'ของแห้ง':
        return {
          icon: Wheat,
          bgColor: 'bg-amber-50 text-amber-700',
          badgeColor: 'bg-amber-100 text-amber-900',
        };
      case 'ข้าว เส้น':
        return {
          icon: Coffee,
          bgColor: 'bg-orange-50 text-orange-600',
          badgeColor: 'bg-orange-100 text-orange-800',
        };
      case 'ซอส':
        return {
          icon: Pipette,
          bgColor: 'bg-purple-50 text-purple-600',
          badgeColor: 'bg-purple-100 text-purple-800',
        };
      case 'แพ็คเกจ':
        return {
          icon: Box,
          bgColor: 'bg-sky-50 text-sky-600',
          badgeColor: 'bg-sky-100 text-sky-800',
        };
      case 'อื่น':
      default:
        return {
          icon: HelpCircle,
          bgColor: 'bg-gray-100 text-gray-600',
          badgeColor: 'bg-gray-200 text-gray-800',
        };
    }
  };

  const currentTheme = getCategoryTheme(selectedCategory);
  const CurrentCategoryIcon = currentTheme.icon;

  return (
    <div className="space-y-3 pb-16 max-w-7xl mx-auto">
      {/* 1. Header (Clean & Compact) */}
      <div className="border-b border-gray-100 pb-2">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-1.5">
          <span className="p-1 rounded-lg bg-orange-100 text-orange-600">
            <Utensils className="w-4 h-4" />
          </span>
          <span>จัดการวัตถุดิบ & การซื้อ</span>
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          เลือกหมวดหมู่เพื่อดูรายการวัตถุดิบ ปรับราคาซื้อ และเพิ่มวัตถุดิบในหมวดนั้น
        </p>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-gray-200/80 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-ingredient-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาวัตถุดิบ..."
              className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-gray-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
                title="ล้างคำค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Toggle: ค้นหาทุกหมวด */}
          <label className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 cursor-pointer select-none shrink-0 transition-colors">
            <input
              id="chk-search-all-categories"
              type="checkbox"
              checked={searchAllCategories}
              onChange={(e) => setSearchAllCategories(e.target.checked)}
              className="w-3.5 h-3.5 text-orange-600 rounded accent-orange-600"
            />
            <span className="hidden sm:inline">ค้นหาทุกหมวด</span>
            <span className="sm:hidden text-[11px]">ทุกหมวด</span>
          </label>
        </div>

        {/* 3. Category Horizontal Tabs (Exact 7 categories in required order) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs select-none">
          {INGREDIENT_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.key] || 0;
            const isSelected = selectedCategory === cat.key;
            const ThemeIcon = getCategoryTheme(cat.key).icon;

            return (
              <button
                key={cat.key}
                id={`tab-category-${cat.key}`}
                onClick={() => {
                  setSelectedCategory(cat.key);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80 active:bg-gray-200'
                }`}
              >
                <ThemeIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                <span>{cat.labelTh}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-gray-200/80 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Sort Control Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
          <div className="text-gray-500 font-medium flex items-center gap-1">
            <span>หมวดหมู่:</span>
            <span className="font-bold text-gray-900">{selectedCategory}</span>
            {searchAllCategories && searchQuery && (
              <span className="text-[10px] text-orange-600 font-medium">(ค้นหาข้ามหมวด)</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium">เรียง:</span>
            <select
              id="select-ingredient-sorting"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-2 py-1 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              <option value="th-asc">ก → ฮ</option>
              <option value="th-desc">ฮ → ก</option>
              <option value="en-asc">A → Z</option>
              <option value="en-desc">Z → A</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Selected Category Header & Compact [ + เพิ่มวัตถุดิบ ] Button */}
      <div className="bg-white rounded-xl p-3 border border-gray-200/80 shadow-2xs flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${currentTheme.bgColor}`}>
            <CurrentCategoryIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-black text-gray-900 truncate">
                {selectedCategory}
              </h3>
              <span className="text-[11px] font-bold px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                {displayedIngredients.length} รายการ
              </span>
            </div>
            <p className="text-[10px] text-gray-400">
              กดปุ่มเพื่อเพิ่มวัตถุดิบในหมวด {selectedCategory}
            </p>
          </div>
        </div>

        {/* Compact Add Ingredient Button inside Selected Category */}
        <button
          id="btn-add-ingredient-category"
          onClick={openAddModal}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ เพิ่มวัตถุดิบ</span>
        </button>
      </div>

      {/* 6. Ingredient Compact Vertical List */}
      {displayedIngredients.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs divide-y divide-gray-100 overflow-hidden">
          {displayedIngredients.map((ing) => {
            const unitObj = UNIT_LABELS[ing.purchaseUnit] || { th: ing.purchaseUnit, baseUnit: ing.purchaseUnit };
            const theme = getCategoryTheme(ing.category);
            const ThemeIcon = theme.icon;
            const isScrapLoss = ing.usableYieldPercent < 100;

            return (
              <div
                key={ing.id}
                id={`ingredient-row-${ing.id}`}
                className="p-2.5 sm:p-3 hover:bg-orange-50/30 transition-colors flex items-center justify-between gap-2.5 group"
              >
                {/* Left: Thumbnail & Details */}
                <div
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => openEditModal(ing)}
                  title="คลิกเพื่อแก้ไขข้อมูลหรือเปลี่ยนรูป"
                >
                  {/* Square Thumbnail (48px) with object-fit: cover */}
                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                    {ing.imageData ? (
                      <img
                        src={ing.imageData}
                        alt={ing.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${theme.bgColor}`}>
                        <ThemeIcon className="w-5 h-5 opacity-75" />
                      </div>
                    )}
                  </div>

                  {/* Text Information */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate leading-snug group-hover:text-orange-600 transition-colors">
                        {ing.name}
                      </h3>
                      {searchAllCategories && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${theme.badgeColor}`}>
                          {ing.category}
                        </span>
                      )}
                    </div>

                    {/* Latest Purchase Price */}
                    <div className="flex items-center gap-1 text-xs text-gray-700 flex-wrap">
                      <span className="font-black text-gray-900">
                        {formatCurrency(ing.purchasePrice)}
                      </span>
                      <span className="text-gray-500 text-[11px]">
                        / {ing.purchaseQuantity} {unitObj.th}
                      </span>
                    </div>

                    {/* Effective Cost & Yield */}
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-wrap">
                      <span>
                        ต้นทุนแท้:{' '}
                        <strong className="text-orange-600 font-bold">
                          {formatCurrency(ing.effectiveCostPerBaseUnit, '฿', 4)}/{unitObj.baseUnit}
                        </strong>
                      </span>
                      <span>•</span>
                      <span className={isScrapLoss ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                        Yield: {formatPercent(ing.usableYieldPercent)}
                      </span>
                      {ing.notes && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate max-w-xs text-gray-400">
                            {ing.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Quick Purchase */}
                  <button
                    id={`btn-purchase-${ing.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openPurchaseModal(ing);
                    }}
                    className="inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors"
                    title="บันทึกการซื้อเข้าใหม่"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">ซื้อเข้า</span>
                  </button>

                  {/* History */}
                  <button
                    id={`btn-history-${ing.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openHistoryModal(ing);
                    }}
                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="ดูประวัติราคาซื้อ"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit */}
                  <button
                    id={`btn-edit-${ing.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(ing);
                    }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="แก้ไขข้อมูลวัตถุดิบและรูปสินค้า"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    id={`btn-delete-${ing.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteModal(ing.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="ลบวัตถุดิบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200/80 text-center space-y-2.5 shadow-2xs">
          <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center ${currentTheme.bgColor}`}>
            <CurrentCategoryIcon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">
            {searchQuery
              ? 'ไม่พบวัตถุดิบที่ตรงกับการค้นหา'
              : `ยังไม่มีวัตถุดิบในหมวด "${selectedCategory}"`}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? 'ลองเปลี่ยนคำค้นหา หรือเปิดตัวเลือก "ค้นหาทุกหมวด"'
              : `เพิ่มวัตถุดิบใหม่ในหมวด "${selectedCategory}" เพื่อเริ่มต้นคำนวณต้นทุน`}
          </p>
          <button
            id="btn-add-ingredient-empty"
            onClick={openAddModal}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ เพิ่มวัตถุดิบในหมวด {selectedCategory}</span>
          </button>
        </div>
      )}

      {/* Hidden File Inputs for Product Image Upload & Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelected}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelected}
        className="hidden"
      />

      {/* ====================================================================
          Unified Add / Edit Ingredient + Yield Calculation Modal
         ==================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingIngredient ? 'แก้ไขข้อมูลวัตถุดิบ & ผลผลิต' : '+ เพิ่มวัตถุดิบ & คำนวณผลผลิต (Yield)'}
        subtitle="บันทึกข้อมูลการซื้อและการตัดแต่งวัตถุดิบในขั้นตอนเดียวเพื่อคำนวณต้นทุนเนื้อแท้"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          {/* ============================================================
              SECTION 1: ข้อมูลพื้นฐานวัตถุดิบ (Basic Info)
             ============================================================ */}
          <div className="space-y-3 p-3 bg-gray-50/70 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-1.5 pb-1 border-b border-gray-200/60">
              <Utensils className="w-3.5 h-3.5 text-orange-600" />
              <h4 className="text-xs font-bold text-gray-800">1. ข้อมูลวัตถุดิบ & รูปภาพ</h4>
            </div>

            {/* Product Image Section */}
            <div className="flex items-center gap-3">
              {/* Image Preview Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-gray-300 bg-white overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                {isOptimizingImage ? (
                  <div className="flex flex-col items-center justify-center p-1 text-center">
                    <RotateCcw className="w-4 h-4 text-orange-600 animate-spin mb-0.5" />
                    <span className="text-[8px] text-gray-500">บีบอัด...</span>
                  </div>
                ) : formData.imageData ? (
                  <img
                    src={formData.imageData}
                    alt="Product Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-1 text-gray-400">
                    <ImageIcon className="w-5 h-5 mx-auto opacity-50" />
                    <span className="text-[8px] block">ไม่มีรูป</span>
                  </div>
                )}
              </div>

              {/* Upload & Remove Controls */}
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isOptimizingImage}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    <ImageIcon className="w-3 h-3 text-orange-600" />
                    <span>{formData.imageData ? 'เปลี่ยนรูป' : '+ เพิ่มรูป'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isOptimizingImage}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors shadow-2xs"
                  >
                    <Camera className="w-3 h-3 text-orange-600" />
                    <span>ถ่ายรูป</span>
                  </button>

                  {formData.imageData && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="inline-flex items-center gap-0.5 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบ</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 truncate">
                  ย่อรูปอัตโนมัติไม่เกิน 300px เพื่อประหยัดพื้นที่
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Name */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700">ชื่อวัตถุดิบ *</label>
                <input
                  id="input-form-ingredient-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น สันในไก่สด, กะหล่ำปลี, กระเทียมไทยแกะ..."
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-900 bg-white"
                />
              </div>

              {/* Category Field: Auto-locked on Add, Editable on Edit */}
              <div className="sm:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <span>หมวดหมู่ *</span>
                    {!editingIngredient && <Lock className="w-3 h-3 text-gray-400" />}
                  </label>
                  {!editingIngredient && (
                    <span className="text-[10px] text-orange-600 font-medium">(ล็อกตามหมวดปัจจุบัน)</span>
                  )}
                </div>

                {!editingIngredient ? (
                  <input
                    id="input-form-ingredient-category-locked"
                    type="text"
                    readOnly
                    disabled
                    value={formData.category}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-200 bg-gray-100 rounded-lg font-bold text-gray-800 cursor-not-allowed select-none"
                  />
                ) : (
                  <select
                    id="select-form-ingredient-category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as IngredientCategory,
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-900"
                  >
                    {INGREDIENT_CATEGORIES.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.labelTh}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 2: ข้อมูลการซื้อ (Purchase Info)
             ============================================================ */}
          <div className="space-y-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                <h4 className="text-xs font-bold text-blue-950">2. ข้อมูลการซื้อ (Purchase Info)</h4>
              </div>
              <span className="text-[10px] text-blue-700 font-medium">
                ต้นทุนก่อนตัดแต่ง: {formatCurrency(rawCostPerBaseUnit, '฿', 2)}/{baseUnit}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Purchase Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ปริมาณที่ซื้อ (Qty) *</label>
                <input
                  id="input-form-purchase-quantity"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={formData.purchaseQuantity}
                  onChange={(e) => {
                    const newQty = parseFloat(e.target.value) || 0;
                    const newBaseInfo = toBaseUnitQuantity(newQty || 1, formData.purchaseUnit);
                    setFormData((prev) => ({
                      ...prev,
                      purchaseQuantity: newQty,
                      rawStartingWeight: newBaseInfo.baseQuantity,
                      usableWeight: prev.isNoLoss
                        ? newBaseInfo.baseQuantity
                        : Math.round(newBaseInfo.baseQuantity * (calculatedYieldPercent > 0 ? calculatedYieldPercent / 100 : 0.9)),
                    }));
                  }}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                />
              </div>

              {/* Purchase Unit */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">หน่วยซื้อ (Purchase Unit) *</label>
                <select
                  id="select-form-ingredient-unit"
                  value={formData.purchaseUnit}
                  onChange={(e) => {
                    const newUnit = e.target.value as UnitType;
                    const newBaseInfo = toBaseUnitQuantity(formData.purchaseQuantity || 1, newUnit);
                    setFormData((prev) => ({
                      ...prev,
                      purchaseUnit: newUnit,
                      rawStartingWeight: newBaseInfo.baseQuantity,
                      usableWeight: prev.isNoLoss
                        ? newBaseInfo.baseQuantity
                        : Math.round(newBaseInfo.baseQuantity * (calculatedYieldPercent > 0 ? calculatedYieldPercent / 100 : 0.9)),
                    }));
                  }}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-gray-900"
                >
                  {Object.entries(UNIT_LABELS).map(([unitKey, info]) => (
                    <option key={unitKey} value={unitKey}>
                      {info.th}
                    </option>
                  ))}
                </select>
              </div>

              {/* Purchase Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ราคาซื้อรวม (฿) *</label>
                <input
                  id="input-form-purchase-price"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formData.purchasePrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchasePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>

          {/* ============================================================
              SECTION 3: การคำนวณผลผลิต & ตัดแต่ง (Yield / Trimming Test)
             ============================================================ */}
          <div className="space-y-3 p-3 sm:p-4 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between pb-1 border-b border-amber-200/60">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-700 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-amber-950">3. การคำนวณผลผลิต (Yield / Trimming)</h4>
              </div>
              <span className="text-[11px] font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                Yield: {calculatedRawWeight > 0 ? `${formatNumber(calculatedYieldPercent, 1)}%` : '--'}
              </span>
            </div>

            {/* Toggle: 100% No Loss vs Yield Test */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-form-toggle-yield-test"
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    isNoLoss: false,
                  }))
                }
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !formData.isNoLoss
                    ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-600/30'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>มีการตัดแต่ง / คัดทิ้ง</span>
              </button>

              <button
                id="btn-form-toggle-no-loss"
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    isNoLoss: true,
                    usableWeight: baseUnitInfo.baseQuantity,
                  }))
                }
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  formData.isNoLoss
                    ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-600/30'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>ใช้ได้ 100% (ไม่มีสูญเสีย)</span>
              </button>
            </div>

            {/* Yield Trimming Inputs (Mobile vertical stack) */}
            {!formData.isNoLoss ? (
              <div className="space-y-3 pt-1">
                {/* 1. น้ำหนักวัตถุดิบตั้งต้น */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    1. น้ำหนักวัตถุดิบตั้งต้น (Raw Starting Weight) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-form-raw-weight"
                      type="number"
                      min="0.001"
                      step="any"
                      required
                      value={formData.rawStartingWeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          rawStartingWeight: val,
                        }));
                      }}
                      className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-gray-900 bg-white font-medium"
                      placeholder="เช่น 1000"
                    />
                    <span className="w-16 shrink-0 py-2 text-center text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl select-none">
                      {baseUnit}
                    </span>
                  </div>
                </div>

                {/* 2. น้ำหนักที่ใช้ได้จริง */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">
                      2. น้ำหนักที่ใช้ได้จริง (Usable Weight) *
                    </label>
                    {isUsableExceedsRaw && (
                      <span className="text-[10px] text-rose-600 font-bold">
                        * ต้องไม่มากกว่าน้ำหนักตั้งต้น
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-form-usable-weight"
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={formData.usableWeight}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          usableWeight: val,
                        }));
                      }}
                      className={`flex-1 min-w-0 px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:outline-none text-gray-900 bg-white font-medium ${
                        isUsableExceedsRaw
                          ? 'border-rose-400 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                          : 'border-gray-300 focus:ring-amber-500'
                      }`}
                      placeholder="เช่น 900"
                    />
                    <span className="w-16 shrink-0 py-2 text-center text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl select-none">
                      {baseUnit}
                    </span>
                  </div>
                  {isUsableExceedsRaw && (
                    <p className="text-[11px] font-bold text-rose-600">
                      ⚠️ น้ำหนักที่ใช้ได้จริงต้องไม่มากกว่าน้ำหนักตั้งต้น ({formatNumber(calculatedRawWeight)} {baseUnit})
                    </p>
                  )}
                </div>

                {/* 3. น้ำหนักเศษที่ตัดทิ้ง (คำนวณอัตโนมัติ / Read-only Field) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700">
                      3. น้ำหนักเศษที่ตัดทิ้ง (Scrap Weight)
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                      คำนวณอัตโนมัติ (Read-only)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      id="display-form-scrap-weight"
                      className="flex-1 min-w-0 px-3 py-2 text-sm bg-gray-100/90 border border-gray-200 rounded-xl text-gray-900 font-bold flex items-center justify-between select-none"
                    >
                      <span className={calculatedScrapWeight > 0 ? 'text-rose-700' : 'text-gray-700'}>
                        {calculatedRawWeight > 0 ? formatNumber(calculatedScrapWeight) : '--'}
                      </span>
                      <span className="text-[11px] font-normal text-gray-500">
                        (ตั้งต้น - ใช้ได้จริง)
                      </span>
                    </div>
                    <span className="w-16 shrink-0 py-2 text-center text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-xl select-none">
                      {baseUnit}
                    </span>
                  </div>
                </div>

                {/* Trimming Summary Pills */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-xl border border-amber-200/80 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 block font-medium">ผลผลิต (Yield)</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 block">
                      {calculatedRawWeight > 0 ? `${formatNumber(calculatedYieldPercent, 1)}%` : '--'}
                    </span>
                  </div>
                  <div className="space-y-0.5 border-x border-gray-100">
                    <span className="text-[10px] text-gray-500 block font-medium">สูญเสีย (Loss)</span>
                    <span className="text-xs sm:text-sm font-black text-rose-600 block">
                      {calculatedRawWeight > 0 ? `${formatNumber(calculatedLossPercent, 1)}%` : '--'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 block font-medium">เศษตัดทิ้ง</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-800 block">
                      {calculatedRawWeight > 0 ? `${formatNumber(calculatedScrapWeight)} ${baseUnit}` : '--'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ไม่มีการตัดแต่งสูญเสีย — ใช้งานได้เต็ม 100% (Yield = 100%, Loss = 0%, เศษตัดทิ้ง = 0)</span>
              </div>
            )}
          </div>

          {/* ============================================================
              SECTION 4: สรุปผลการคำนวณต้นทุนเนื้อแท้ (Effective Cost Engine)
             ============================================================ */}
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-orange-950 text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                <span>สรุปต้นทุนเนื้อแท้ (Effective Cost Engine)</span>
              </div>
              <span className="text-[10px] font-black text-orange-800 bg-orange-200/80 px-2 py-0.5 rounded-full">
                สูตรคำนวณอัตโนมัติ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-white/90 rounded-xl border border-orange-100">
                <span className="text-[10px] text-gray-500 block">ต้นทุนก่อนตัดแต่ง</span>
                <span className="text-xs sm:text-sm font-bold text-gray-800">
                  {formatCurrency(rawCostPerBaseUnit, '฿', 4)}/{baseUnit}
                </span>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-orange-100">
                <span className="text-[10px] text-gray-500 block">ผลผลิตที่ใช้ได้ (Yield)</span>
                <span className="text-xs sm:text-sm font-black text-emerald-700">
                  {calculatedRawWeight > 0 ? `${formatNumber(calculatedYieldPercent, 1)}%` : '--'}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 bg-orange-600 text-white rounded-xl shadow-2xs">
                <span className="text-[10px] text-orange-100 block">ต้นทุนเนื้อแท้ใช้งานจริง</span>
                <span className="text-xs sm:text-sm font-black">
                  {formatCurrency(effectiveCostPerBaseUnit, '฿', 4)}/{baseUnit}
                </span>
              </div>
            </div>

            {calculatedYieldPercent < 100 && calculatedRawWeight > 0 && (
              <p className="text-[10px] text-orange-800">
                * ต้นทุนต่อ {baseUnit} เพิ่มขึ้น{' '}
                <span className="font-bold">
                  +{formatNumber(((effectiveCostPerBaseUnit - rawCostPerBaseUnit) / (rawCostPerBaseUnit || 1)) * 100, 1)}%
                </span>{' '}
                เนื่องจากหักการสูญเสียจากการตัดแต่งออกแล้ว
              </p>
            )}
          </div>

          {/* ============================================================
              SECTION 5: หมายเหตุ & เหตุผลการเปลี่ยนราคา
             ============================================================ */}
          <div className="space-y-2.5">
            {editingIngredient && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">หมายเหตุการปรับราคา (ถ้ามีการเปลี่ยนราคา)</label>
                <input
                  type="text"
                  value={formData.priceChangeReason}
                  onChange={(e) => setFormData({ ...formData, priceChangeReason: e.target.value })}
                  placeholder="เช่น ราคาตลาดปรับขึ้นรอบต้นสัปดาห์"
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-900 bg-white"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">หมายเหตุ / วิธีการตัดแต่ง</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="เช่น ปอกเปลือกและคัดหัวฝ่อออก, ลอกหนัง 10%..."
                className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-900 bg-white"
              />
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isOptimizingImage}
              className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-95 rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingIngredient ? 'บันทึกการแก้ไข' : 'บันทึกวัตถุดิบ & ผลผลิต'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          Record Purchase Modal
         ==================================================================== */}
      <Modal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="บันทึกการซื้อวัตถุดิบเข้าใหม่"
        subtitle={purchaseTargetIngredient ? `วัตถุดิบ: ${purchaseTargetIngredient.name}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleSavePurchase} className="space-y-3">
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">วันที่ซื้อ *</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">ร้านค้า / ซัพพลายเออร์ (Supplier)</label>
              <input
                type="text"
                value={purchaseSupplier}
                onChange={(e) => setPurchaseSupplier(e.target.value)}
                placeholder="เช่น ตลาดสดยิ่งเจริญ, ซีพี, แม็คโคร..."
                className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">
                  จำนวน ({purchaseTargetIngredient?.purchaseUnit}) *
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ราคารวม (฿) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">หมายเหตุ</label>
              <input
                type="text"
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="เช่น ซื้อยกแพ็ค, ของคัดเกรด A"
                className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
              />
            </div>
          </div>

          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
            ระบบจะอัปเดตราคาซื้อล่าสุดของวัตถุดิบนี้ และบันทึกลงประวัติราคาโดยอัตโนมัติ
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-2xs"
            >
              บันทึกการซื้อเข้า
            </button>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          Price History Modal
         ==================================================================== */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`ประวัติราคา: ${historyTargetIngredient?.name || ''}`}
        subtitle="แนวโน้มราคาซื้อและต้นทุนเนื้อแท้ในแต่ละช่วงเวลา"
        maxWidth="md"
      >
        <div className="space-y-2.5">
          {historyTargetIngredient && (
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {(priceHistory || [])
                .filter((p) => p.ingredientId === historyTargetIngredient.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-gray-900">{formatDateThai(item.date)}</div>
                      <div className="text-[10px] text-gray-500">{item.reason || 'บันทึกราคา'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {formatCurrency(item.purchasePrice)} / {item.purchaseQuantity} {item.purchaseUnit}
                      </div>
                      <div className="text-[10px] text-orange-600 font-semibold">
                        ต้นทุนแท้: {formatCurrency(item.effectiveCostPerBaseUnit, '฿', 4)}/หน่วยฐาน
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ====================================================================
          Delete Confirmation Modal
         ==================================================================== */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deletingId) onDeleteIngredient(deletingId);
        }}
        title="ยืนยันการลบวัตถุดิบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบวัตถุดิบนี้? ข้อมูลราคาและประวัติที่เกี่ยวข้องจะถูกลบออกจากฐานข้อมูล"
        confirmText="ลบวัตถุดิบ"
        isDestructive
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  Plus,
  Search,
  UtensilsCrossed,
  Edit2,
  Trash2,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Store,
  Truck,
  PlusCircle,
  X,
} from 'lucide-react';
import { Ingredient, MenuItem, MenuItemPackagingItem, PackagingItem, Recipe, SalesChannel } from '../types';
import { calculateRecipeCost } from '../calculations/recipeCost';
import { calculateMenuItemProfit } from '../calculations/profitPricing';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { CostBadge } from '../components/CostBadge';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface MenuItemsViewProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  packaging: PackagingItem[];
  defaultTargetFoodCostPercent: number;
  onSaveMenuItem: (data: {
    id?: string;
    name: string;
    category?: string;
    recipeId: string;
    salesChannel: SalesChannel;
    sellingPrice: number;
    targetFoodCostPercent: number;
    packagingItems: MenuItemPackagingItem[];
    notes?: string;
  }) => Promise<void>;
  onDeleteMenuItem: (id: string) => Promise<void>;
}

export const MenuItemsView: React.FC<MenuItemsViewProps> = ({
  menuItems = [],
  recipes = [],
  packaging = [],
  defaultTargetFoodCostPercent,
  onSaveMenuItem,
  onDeleteMenuItem,
}) => {
  const safeMenuItems = menuItems || [];
  const safeRecipes = recipes || [];
  const safePackaging = packaging || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | SalesChannel>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRecipeId, setFormRecipeId] = useState<string>(safeRecipes[0]?.id || '');
  const [formChannel, setFormChannel] = useState<SalesChannel>('restaurant');
  const [formSellingPrice, setFormSellingPrice] = useState<number>(65);
  const [formTargetFoodCostPct, setFormTargetFoodCostPct] = useState<number>(defaultTargetFoodCostPercent || 35);
  const [formPackagingItems, setFormPackagingItems] = useState<MenuItemPackagingItem[]>([]);
  const [formNotes, setFormNotes] = useState('');

  const recipesMap = new Map<string, Recipe>(safeRecipes.map((r) => [r.id, r]));
  const packagingMap = new Map<string, PackagingItem>(safePackaging.map((p) => [p.id, p]));

  // Pre-calculate all recipe portion costs
  const recipeCostsMap = new Map<string, number>();
  for (const r of safeRecipes) {
    const activeVersion = r.versions.find((v) => v.id === r.currentVersionId) || r.versions[0];
    if (activeVersion) {
      // Pass empty map if ingredients aren't here or rely on precomputed
      const ingredientsMap = new Map<string, Ingredient>(); // recipe cost will use internal or fallback
      const cost = calculateRecipeCost(activeVersion, ingredientsMap, recipesMap);
      recipeCostsMap.set(r.id, cost.costPerPortion);
    }
  }

  const openAddModal = () => {
    setEditingItem(null);
    const firstRecipe = safeRecipes[0];
    setFormName(firstRecipe ? firstRecipe.name : '');
    setFormRecipeId(firstRecipe ? firstRecipe.id : '');
    setFormChannel('restaurant');
    setFormSellingPrice(65);
    setFormTargetFoodCostPct(defaultTargetFoodCostPercent || 35);
    setFormPackagingItems([]);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormRecipeId(item.recipeId);
    setFormChannel(item.salesChannel);
    setFormSellingPrice(item.sellingPrice);
    setFormTargetFoodCostPct(item.targetFoodCostPercent);
    setFormPackagingItems([...item.packagingItems]);
    setFormNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleAddPackagingRow = () => {
    const firstPack = packaging[0];
    if (!firstPack) return;
    setFormPackagingItems([
      ...formPackagingItems,
      {
        packagingId: firstPack.id,
        quantity: 1,
      },
    ]);
  };

  const handleRemovePackagingRow = (index: number) => {
    setFormPackagingItems(formPackagingItems.filter((_, i) => i !== index));
  };

  const handlePackagingChange = (index: number, field: 'packagingId' | 'quantity', val: unknown) => {
    const next = [...formPackagingItems];
    next[index] = {
      ...next[index],
      [field]: val,
    };
    setFormPackagingItems(next);
  };

  // Form Live Calculation Preview
  const selectedRecipeCost = recipeCostsMap.get(formRecipeId) || 0;
  const dummyItem: MenuItem = {
    id: 'preview',
    name: formName,
    category: recipesMap.get(formRecipeId)?.category || 'อาหารจานเดียว',
    recipeId: formRecipeId,
    salesChannel: formChannel,
    sellingPrice: formSellingPrice,
    targetFoodCostPercent: formTargetFoodCostPct,
    packagingItems: formPackagingItems,
    createdAt: '',
    updatedAt: '',
  };
  const liveProfitCalc = calculateMenuItemProfit(dummyItem, selectedRecipeCost, packagingMap);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('กรุณากรอกชื่อเมนูอาหาร');
      return;
    }
    if (!formRecipeId) {
      alert('กรุณาเลือกสูตรอาหารที่เชื่อมโยง');
      return;
    }
    if (formSellingPrice <= 0) {
      alert('ราคาขายต้องมากกว่า 0');
      return;
    }

    await onSaveMenuItem({
      id: editingItem?.id,
      name: formName.trim(),
      recipeId: formRecipeId,
      salesChannel: formChannel,
      sellingPrice: Number(formSellingPrice),
      targetFoodCostPercent: Number(formTargetFoodCostPct) || 35,
      packagingItems: formPackagingItems,
      notes: formNotes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const getChannelBadge = (channel: SalesChannel) => {
    switch (channel) {
      case 'restaurant':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            <Store className="w-3 h-3" /> ทานที่ร้าน
          </span>
        );
      case 'takeaway':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <ShoppingBag className="w-3 h-3" /> สั่งกลับบ้าน
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Truck className="w-3 h-3" /> เดลิเวอรี่
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-700 border border-gray-100">
            อื่นๆ
          </span>
        );
    }
  };

  const filteredItems = menuItems.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchChannel = channelFilter === 'ALL' || m.salesChannel === channelFilter;
    return matchSearch && matchChannel;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-600" />
            <span>รายการเมนู & ต้นทุนขาย (Menu Items & Food Cost)</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            เชื่อมโยงสูตรอาหาร บรรจุภัณฑ์ และคำนวณ % ต้นทุนอาหาร (Food Cost %) และกำไรส่วนเกิน
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มเมนูอาหารใหม่</span>
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
            placeholder="ค้นหาชื่อเมนูอาหาร..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        {/* Channel Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setChannelFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              channelFilter === 'ALL'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทุกช่องทางขาย ({menuItems.length})
          </button>
          <button
            onClick={() => setChannelFilter('restaurant')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              channelFilter === 'restaurant'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทานที่ร้าน (Dine-in)
          </button>
          <button
            onClick={() => setChannelFilter('takeaway')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              channelFilter === 'takeaway'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            สั่งกลับบ้าน (Takeaway)
          </button>
          <button
            onClick={() => setChannelFilter('delivery')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              channelFilter === 'delivery'
                ? 'bg-orange-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            เดลิเวอรี่ (Delivery)
          </button>
        </div>
      </div>

      {/* Menu Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const foodCost = recipeCostsMap.get(item.recipeId) || 0;
            const profit = calculateMenuItemProfit(item, foodCost, packagingMap);
            const recipe = recipesMap.get(item.recipeId);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    {getChannelBadge(item.salesChannel)}

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="แก้ไขเมนู"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(item.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ลบเมนู"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mt-2.5 leading-snug group-hover:text-orange-600 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    สูตร: <span className="text-gray-700 font-medium">{recipe?.name || 'ไม่ระบุ'}</span>
                  </p>

                  {/* Pricing and Cost Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">ราคาขายตั้งไว้:</span>
                      <span className="text-base font-black text-gray-900">
                        {formatCurrency(item.sellingPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span>ต้นทุนวัตถุดิบ + กล่อง:</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(profit.totalDirectCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-gray-600">
                      <span>กำไรส่วนเกิน (Contribution):</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(profit.grossContributionProfit)} ({formatPercent(profit.grossMarginPercent)})
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700">Food Cost %:</span>
                      <CostBadge
                        percent={profit.foodCostPercent}
                        targetPercent={item.targetFoodCostPercent}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Packaging tag if any */}
                  {item.packagingItems.length > 0 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        มีบรรจุภัณฑ์ {item.packagingItems.length} ชิ้น ({formatCurrency(profit.packagingCost)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>เป้าหมาย: {item.targetFoodCostPercent}%</span>
                  <span className="text-orange-600 font-semibold">
                    ราคาขายแนะนำ: {formatCurrency(profit.recommendedSellingPrice)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">ยังไม่มีรายการเมนูอาหาร</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            สร้างรายการเมนูเพื่อเชื่อมสูตรอาหาร บรรจุภัณฑ์ และตั้งราคาขาย
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มเมนูแรก</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? `แก้ไขเมนู: ${editingItem.name}` : 'เพิ่มรายการเมนูขายใหม่ (New Menu Item)'}
        subtitle="ผูกสูตรอาหาร กำหนดช่องทางขาย และวิเคราะห์กำไรส่วนเกิน"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-700">ชื่อเมนูอาหาร *</label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="เช่น ข้าวกะเพราไก่ไข่ดาว (กล่องเดลิเวอรี่)..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Recipe link */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">สูตรอาหารที่เชื่อมโยง (Recipe) *</label>
              <select
                value={formRecipeId}
                onChange={(e) => setFormRecipeId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({formatCurrency(recipeCostsMap.get(r.id) || 0)}/จาน)
                  </option>
                ))}
              </select>
            </div>

            {/* Channel */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">ช่องทางการขาย (Sales Channel)</label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value as SalesChannel)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="restaurant">ทานที่ร้าน (Dine-in)</option>
                <option value="takeaway">สั่งกลับบ้าน (Takeaway)</option>
                <option value="delivery">เดลิเวอรี่ (Delivery)</option>
              </select>
            </div>

            {/* Selling Price */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">ราคาขายที่ตั้งไว้ (Selling Price ฿) *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
              />
            </div>

            {/* Target Food Cost % */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">เป้าหมาย Food Cost % (Target)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={formTargetFoodCostPct}
                  onChange={(e) => setFormTargetFoodCostPct(parseFloat(e.target.value) || 35)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                />
                <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center">
                  %
                </div>
              </div>
            </div>
          </div>

          {/* Packaging Section (especially for takeaway/delivery) */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">
                บรรจุภัณฑ์ที่ใช้ในเมนูนี้ ({formPackagingItems.length} ชิ้น)
              </span>
              <button
                type="button"
                onClick={handleAddPackagingRow}
                className="inline-flex items-center gap-1 px-3 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg text-xs font-bold transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เพิ่มกล่อง/ถุง</span>
              </button>
            </div>

            {formPackagingItems.map((item, idx) => {
              const pack = packagingMap.get(item.packagingId);
              const cost = pack ? pack.costPerPiece * item.quantity : 0;

              return (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl text-xs">
                  <select
                    value={item.packagingId}
                    onChange={(e) => handlePackagingChange(idx, 'packagingId', e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    {packaging.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.costPerPiece)}/ชิ้น)
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => handlePackagingChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-right"
                  />

                  <span className="font-bold text-gray-900 w-16 text-right">{formatCurrency(cost)}</span>

                  <button
                    type="button"
                    onClick={() => handleRemovePackagingRow(idx)}
                    className="p-1 text-gray-400 hover:text-rose-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Live Profit Analysis Box */}
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-orange-200/80 pb-1.5">
              <span className="font-bold text-orange-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" /> ผลการวิเคราะห์กำไร & ต้นทุน
              </span>
              <CostBadge
                percent={liveProfitCalc.foodCostPercent}
                targetPercent={formTargetFoodCostPct}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-gray-700 pt-1">
              <div>
                ต้นทุนวัตถุดิบ (อาหาร): <span className="font-bold">{formatCurrency(liveProfitCalc.foodCost)}</span>
              </div>
              <div>
                ต้นทุนบรรจุภัณฑ์: <span className="font-bold">{formatCurrency(liveProfitCalc.packagingCost)}</span>
              </div>
              <div>
                ต้นทุนรวมทั้งหมด: <span className="font-bold text-gray-900">{formatCurrency(liveProfitCalc.totalDirectCost)}</span>
              </div>
              <div>
                กำไรส่วนเกิน: <span className="font-bold text-emerald-700">{formatCurrency(liveProfitCalc.grossContributionProfit)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-orange-200/80 flex items-center justify-between">
              <span className="text-gray-600">ราคาขายแนะนำ (ตามเป้าหมาย {formTargetFoodCostPct}%):</span>
              <span className="text-sm font-black text-orange-700">
                {formatCurrency(liveProfitCalc.recommendedSellingPrice)}
              </span>
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
              {editingItem ? 'บันทึกการแก้ไข' : 'สร้างรายการเมนู'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deletingId) onDeleteMenuItem(deletingId);
        }}
        title="ยืนยันการลบเมนู"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบเมนูอาหารนี้?"
        confirmText="ลบเมนู"
        isDestructive
      />
    </div>
  );
};

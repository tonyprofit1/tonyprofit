import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { Ingredient, UnitType, WasteReason, WasteRecord, WASTE_REASONS } from '../types';
import { calculateWasteCost } from '../calculations/wasteCost';
import { formatCurrency, formatNumber, formatDateThai } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface WasteViewProps {
  wasteRecords: WasteRecord[];
  ingredients: Ingredient[];
  onSaveWasteRecord: (data: {
    id?: string;
    date: string;
    ingredientId: string;
    quantity: number;
    unit: UnitType;
    reason: WasteReason;
    notes?: string;
  }) => Promise<void>;
  onDeleteWasteRecord: (id: string) => Promise<void>;
}

export const WasteView: React.FC<WasteViewProps> = ({
  wasteRecords = [],
  ingredients = [],
  onSaveWasteRecord,
  onDeleteWasteRecord,
}) => {
  const safeWaste = wasteRecords || [];
  const safeIngredients = ingredients || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formIngredientId, setFormIngredientId] = useState<string>(safeIngredients[0]?.id || '');
  const [formQuantity, setFormQuantity] = useState<number>(100);
  const [formUnit, setFormUnit] = useState<UnitType>(safeIngredients[0]?.purchaseUnit || 'g');
  const [formReason, setFormReason] = useState<WasteReason>('Spoilage');
  const [formNotes, setFormNotes] = useState('');

  const ingredientsMap = new Map<string, Ingredient>(safeIngredients.map((i) => [i.id, i]));

  // Re-calculate all waste items with latest effective unit costs
  const calculatedWaste = safeWaste.map((w) => {
    const ing = ingredientsMap.get(w.ingredientId);
    const cost = ing
      ? calculateWasteCost(w.quantity, w.unit, ing.effectiveCostPerBaseUnit, ing.purchaseUnit)
      : w.calculatedCost;
    return {
      ...w,
      calculatedCost: cost,
      ingredientName: ing ? ing.name : 'วัตถุดิบที่ถูกลบ',
    };
  });

  const totalWasteCost = calculatedWaste.reduce((sum, w) => sum + (w.calculatedCost || 0), 0);

  const openAddModal = () => {
    const firstIng = ingredients[0];
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormIngredientId(firstIng ? firstIng.id : '');
    setFormQuantity(100);
    setFormUnit(firstIng ? firstIng.purchaseUnit : 'g');
    setFormReason('Spoilage');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleIngredientChange = (ingId: string) => {
    setFormIngredientId(ingId);
    const ing = ingredientsMap.get(ingId);
    if (ing) {
      setFormUnit(ing.purchaseUnit);
    }
  };

  // Live calculation preview in modal
  const selectedIng = ingredientsMap.get(formIngredientId);
  const liveWasteCost = selectedIng
    ? calculateWasteCost(
        formQuantity,
        formUnit,
        selectedIng.effectiveCostPerBaseUnit,
        selectedIng.purchaseUnit
      )
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIngredientId) {
      alert('กรุณาเลือกวัตถุดิบ');
      return;
    }
    if (formQuantity <= 0) {
      alert('จำนวนต้องมากกว่า 0');
      return;
    }

    await onSaveWasteRecord({
      date: formDate,
      ingredientId: formIngredientId,
      quantity: Number(formQuantity),
      unit: formUnit,
      reason: formReason,
      notes: formNotes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const filteredWaste = calculatedWaste.filter((w) => {
    const matchSearch =
      w.ingredientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.notes && w.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchReason = selectedReason === 'ALL' || w.reason === selectedReason;
    return matchSearch && matchReason;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-orange-600" />
            <span>บันทึกของเสียในครัว (Kitchen Waste & Loss Log)</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            ติดตามและประเมินมูลค่าวัตถุดิบที่เน่าเสีย หมดอายุ หรือปรุงผิดพลาด เพื่อลดการรั่วไหล
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>บันทึกของเสียใหม่</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">มูลค่าของเสียสะสมรวม</span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2">
            {formatCurrency(totalWasteCost)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">คำนวณตามราคาเนื้อแท้จริง</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">จำนวนครั้งที่บันทึกของเสีย</span>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-2">
            {wasteRecords.length}
            <span className="text-xs font-normal text-gray-500 ml-1">ครั้ง</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">บันทึกทั้งหมดในฐานข้อมูล</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">สาเหตุการสูญเสียหลัก</span>
          <div className="text-lg font-bold text-gray-900 mt-2 truncate">
            {WASTE_REASONS.find((r) => r.key === 'Spoilage')?.labelTh || 'เน่าเสีย / ชำรุด'}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">ช่วยระบุจุดที่ต้องปรับปรุงการจัดเก็บ</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อวัตถุดิบที่เสีย..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedReason('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
              selectedReason === 'ALL'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ทุกสาเหตุ ({wasteRecords.length})
          </button>
          {WASTE_REASONS.map((r) => {
            const count = wasteRecords.filter((w) => w.reason === r.key).length;
            return (
              <button
                key={r.key}
                onClick={() => setSelectedReason(r.key)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedReason === r.key
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r.labelTh} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Waste List */}
      {filteredWaste.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden divide-y divide-gray-100">
          {filteredWaste.map((w) => {
            const reasonObj = WASTE_REASONS.find((r) => r.key === w.reason);

            return (
              <div key={w.id} className="p-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors text-xs sm:text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{w.ingredientName}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                      {reasonObj?.labelTh || w.reason}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    วันที่ {formatDateThai(w.date)} • เสียไป {formatNumber(w.quantity)} {w.unit}
                  </div>
                  {w.notes && <div className="text-[11px] text-gray-400">{w.notes}</div>}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-black text-rose-600 text-sm sm:text-base">
                      {formatCurrency(w.calculatedCost || 0)}
                    </div>
                    <div className="text-[10px] text-gray-400">มูลค่าความเสียหาย</div>
                  </div>

                  <button
                    onClick={() => {
                      setDeletingId(w.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">ยังไม่มีประวัติของเสีย</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            บันทึกของเสียเมื่อพบวัตถุดิบเน่าเสียเพื่อติดตามจุดรั่วไหลของต้นทุนร้านอาหาร
          </p>
        </div>
      )}

      {/* Add Waste Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="บันทึกของเสีย / สูญเสีย (New Waste Log)"
        subtitle="ระบุวัตถุดิบและปริมาณที่สูญเสีย ระบบจะคำนวณมูลค่าความเสียหายให้อัตโนมัติ"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">วันที่เกิดเหตุ *</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">เลือกวัตถุดิบที่สูญเสีย *</label>
              <select
                value={formIngredientId}
                onChange={(e) => handleIngredientChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold"
              >
                {ingredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({formatCurrency(ing.effectiveCostPerBaseUnit, '฿', 3)}/{ing.purchaseUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ปริมาณที่สูญเสีย *</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">หน่วย</label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none"
                >
                  <option value="g">กรัม (g)</option>
                  <option value="kg">กก. (kg)</option>
                  <option value="ml">มล. (ml)</option>
                  <option value="L">ลิตร (L)</option>
                  <option value="piece">ชิ้น/ฟอง (pc)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">สาเหตุของการสูญเสีย *</label>
              <select
                value={formReason}
                onChange={(e) => setFormReason(e.target.value as WasteReason)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {WASTE_REASONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.labelTh} ({r.labelEn})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">บันทึกรายละเอียด</label>
              <input
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="เช่น ตู้เย็นอุณหภูมิตกค้างคืน, พนักงานทำหก..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live cost preview */}
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs flex items-center justify-between">
            <span className="font-bold text-rose-900">มูลค่าความเสียหายที่คำนวณได้:</span>
            <span className="text-base font-black text-rose-600">
              {formatCurrency(liveWasteCost)}
            </span>
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
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
            >
              บันทึกของเสีย
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deletingId) onDeleteWasteRecord(deletingId);
        }}
        title="ยืนยันการลบบันทึกของเสีย"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกของเสียรายการนี้?"
        confirmText="ลบรายการ"
        isDestructive
      />
    </div>
  );
};

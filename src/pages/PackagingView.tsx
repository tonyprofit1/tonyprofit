import React, { useState } from 'react';
import { Plus, Search, Layers, Edit2, Trash2, Box, Package } from 'lucide-react';
import { PackagingItem } from '../types';
import { formatCurrency, formatNumber, formatDateThai } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface PackagingViewProps {
  packaging: PackagingItem[];
  onSavePackaging: (data: {
    id?: string;
    name: string;
    unit: string;
    price: number;
    quantityPerUnit: number;
    notes?: string;
  }) => Promise<void>;
  onDeletePackaging: (id: string) => Promise<void>;
}

export const PackagingView: React.FC<PackagingViewProps> = ({
  packaging = [],
  onSavePackaging,
  onDeletePackaging,
}) => {
  const safePackaging = packaging || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingItem | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('แพ็ค (100 ชิ้น)');
  const [price, setPrice] = useState<number>(120);
  const [quantityPerUnit, setQuantityPerUnit] = useState<number>(100);
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setUnit('แพ็ค (100 ชิ้น)');
    setPrice(100);
    setQuantityPerUnit(100);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: PackagingItem) => {
    setEditingItem(item);
    setName(item.name);
    setUnit(item.unit);
    setPrice(item.price);
    setQuantityPerUnit(item.quantityPerUnit);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อบรรจุภัณฑ์');
      return;
    }
    if (price < 0 || quantityPerUnit <= 0) {
      alert('กรุณากรอกราคาและจำนวนต่อหน่วยให้ถูกต้อง');
      return;
    }

    await onSavePackaging({
      id: editingItem?.id,
      name: name.trim(),
      unit: unit.trim() || 'แพ็ค',
      price: Number(price),
      quantityPerUnit: Math.max(1, Number(quantityPerUnit) || 1),
      notes: notes.trim() || undefined,
    });

    setIsModalOpen(false);
  };

  const liveCostPerPiece = quantityPerUnit > 0 ? price / quantityPerUnit : 0;

  const filteredItems = safePackaging.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-600" />
            <span>คลังบรรจุภัณฑ์ (Packaging & Containers)</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            คำนวณต้นทุนต่อชิ้นของกล่อง ช้อนส้อม ถ้วยน้ำจิ้ม และถุงหิ้วสำหรับเมนูกลับบ้านและเดลิเวอรี่
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มบรรจุภัณฑ์ใหม่</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อบรรจุภัณฑ์..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Packaging Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="แก้ไข"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingId(item.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 mt-3 leading-snug group-hover:text-orange-600 transition-colors">
                  {item.name}
                </h3>
                {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}

                {/* Specs Box */}
                <div className="mt-4 p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>ราคาซื้อต่อแพ็ค/หน่วย:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(item.price)} ({item.unit})
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>จำนวนชิ้นต่อแพ็ค:</span>
                    <span className="font-semibold text-gray-900">{formatNumber(item.quantityPerUnit)} ชิ้น</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                    <span className="font-bold text-gray-700">ต้นทุนเฉลี่ยต่อชิ้น:</span>
                    <span className="text-sm font-black text-orange-600">
                      {formatCurrency(item.costPerPiece)}
                      <span className="text-[11px] font-normal text-gray-500"> / ชิ้น</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                อัปเดต: {formatDateThai(item.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 border border-gray-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">ยังไม่มีบรรจุภัณฑ์ในระบบ</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            เพิ่มกล่อง ถุง ช้อนส้อม เพื่อนำไปผูกกับเมนูสั่งกลับบ้านและเดลิเวอรี่
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบรรจุภัณฑ์แรก</span>
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'แก้ไขข้อมูลบรรจุภัณฑ์' : 'เพิ่มบรรจุภัณฑ์ใหม่ (New Packaging)'}
        subtitle="ระบุราคาและจำนวนต่อแพ็ค เพื่อคำนวณต้นทุนต่อชิ้น"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">ชื่อบรรจุภัณฑ์ *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น กล่องกระดาษคราฟท์ 650ml, ช้อนส้อม..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">หน่วยการซื้อ (Unit Description)</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="เช่น แพ็ค (100 ชิ้น), ลัง (500 ชุด)"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">ราคาซื้อต่อหน่วย (฿) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">จำนวนชิ้นต่อหน่วย *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantityPerUnit}
                  onChange={(e) => setQuantityPerUnit(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">บันทึกเพิ่มเติม</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ซื้อจากแม็คโคร, เกรดทนความร้อน"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live calculation box */}
          <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl text-xs flex items-center justify-between">
            <span className="font-bold text-gray-700">ต้นทุนเฉลี่ยที่คำนวณได้:</span>
            <span className="text-sm font-black text-orange-600">
              {formatCurrency(liveCostPerPiece)} / ชิ้น
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
              className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs"
            >
              {editingItem ? 'บันทึกการแก้ไข' : 'สร้างรายการบรรจุภัณฑ์'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deletingId) onDeletePackaging(deletingId);
        }}
        title="ยืนยันการลบบรรจุภัณฑ์"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบบรรจุภัณฑ์นี้? เมนูอาหารที่ผูกกับบรรจุภัณฑ์นี้จะถูกนำรายการนี้ออก"
        confirmText="ลบบรรจุภัณฑ์"
        isDestructive
      />
    </div>
  );
};

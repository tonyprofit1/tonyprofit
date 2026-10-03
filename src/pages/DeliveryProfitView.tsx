import React, { useState } from 'react';
import { Truck, Calculator, Sparkles, AlertCircle, TrendingUp, CheckCircle, Percent, DollarSign } from 'lucide-react';
import { AppSettings, MenuItem, PackagingItem, Recipe } from '../types';
import { calculateDeliveryProfit } from '../calculations/profitPricing';
import { calculateRecipeCost } from '../calculations/recipeCost';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface DeliveryProfitViewProps {
  menuItems: MenuItem[];
  recipes: Recipe[];
  packaging: PackagingItem[];
  settings: AppSettings;
}

export const DeliveryProfitView: React.FC<DeliveryProfitViewProps> = ({
  menuItems = [],
  recipes = [],
  packaging = [],
  settings,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('grab_lineman');
  const [deliverySellingPrice, setDeliverySellingPrice] = useState<number>(95);
  const [foodCost, setFoodCost] = useState<number>(25);
  const [packagingCost, setPackagingCost] = useState<number>(4.5);
  const [gpPercent, setGpPercent] = useState<number>(settings.defaultDeliveryGpPercent || 30);
  const [vatOnGp, setVatOnGp] = useState<boolean>(true);
  const [merchantPromoDiscount, setMerchantPromoDiscount] = useState<number>(0);
  const [fixedFee, setFixedFee] = useState<number>(0);

  // Delivery platform presets
  const presets = [
    { id: 'grab_lineman', name: 'Grab / LINE MAN (30% GP + VAT 7%)', gp: 30, vat: true },
    { id: 'shopee', name: 'ShopeeFood (30% GP + VAT 7%)', gp: 30, vat: true },
    { id: 'robinhood', name: 'Robinhood (0% GP)', gp: 0, vat: false },
    { id: 'custom_20', name: 'โปรพิเศษค่ายเดลิเวอรี่ (20% GP + VAT)', gp: 20, vat: true },
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.id);
    setGpPercent(preset.gp);
    setVatOnGp(preset.vat);
  };

  const deliveryResult = calculateDeliveryProfit(
    deliverySellingPrice,
    foodCost,
    packagingCost,
    gpPercent,
    {
      vatOnGp,
      merchantPromoDiscount,
      fixedFeePerOrder: fixedFee,
    }
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Truck className="w-6 h-6 text-orange-600" />
          <span>คำนวณกำไรหัก GP เดลิเวอรี่ (Delivery GP & Profit Calculator)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          วิเคราะห์กำไรสุทธิหลังหักค่าคอมมิชชั่น GP แพลตฟอร์ม (Grab / LINE MAN / ShopeeFood) รวม VAT 7%
        </p>
      </div>

      {/* Platform Presets */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700">เลือกแพลตฟอร์มเดลิเวอรี่ (Delivery Presets):</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all border ${
                selectedPreset === p.id
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-orange-50'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Input Parameters (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-600" />
              <span>ระบุโครงสร้างราคาและต้นทุนของเมนูเดลิเวอรี่</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Delivery Selling Price */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-gray-700">
                1. ราคาขายบนแอปเดลิเวอรี่ (Delivery App Price ฿) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">฿</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={deliverySellingPrice}
                  onChange={(e) => setDeliverySellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2.5 text-base font-black border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-400">ราคาที่แสดงให้ลูกค้ากดสั่งใน Grab / LINE MAN</p>
            </div>

            {/* Food Cost */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">2. ต้นทุนอาหาร/วัตถุดิบ (Food Cost ฿) *</label>
              <input
                type="number"
                min="0"
                step="any"
                value={foodCost}
                onChange={(e) => setFoodCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            {/* Packaging Cost */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">
                3. ต้นทุนกล่อง+ช้อน+ถุง (Packaging ฿) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={packagingCost}
                onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            {/* GP % */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-700">4. ค่า GP ของแอป (%) *</label>
                <span className="text-xs font-bold text-orange-600">{gpPercent}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={gpPercent}
                onChange={(e) => setGpPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 font-bold"
              />
            </div>

            {/* Merchant Promo Discount */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">5. ส่วนลดโปรโมชั่นที่ร้านออก (฿)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={merchantPromoDiscount}
                onChange={(e) => setMerchantPromoDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* VAT 7% Toggle */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800">คิดภาษีมูลค่าเพิ่ม VAT 7% บนค่า GP</div>
                <div className="text-[11px] text-gray-400">
                  (ค่าย Grab/LINE MAN/Shopee จะคิด VAT 7% บนค่า GP ทำให้ GP 30% กลายเป็น 32.1% จริง)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatOnGp}
                  onChange={(e) => setVatOnGp(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Output Financial Card (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                ผลการคำนวณกำไรสุทธิต่อกล่อง
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  deliveryResult.netProfitPerPortion > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {deliveryResult.netProfitPerPortion > 0 ? 'เหลือกำไร' : 'ขาดทุน'}
              </span>
            </div>

            {/* Main Profit Display */}
            <div className="mt-4 p-4 rounded-xl bg-gray-800/90 border border-gray-700 space-y-1">
              <span className="text-xs text-gray-400">กำไรสุทธิต่อกล่องที่เข้ากระเป๋าจริง:</span>
              <div
                className={`text-3xl font-black ${
                  deliveryResult.netProfitPerPortion > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(deliveryResult.netProfitPerPortion)}
              </div>
              <div className="text-xs text-gray-400 pt-1 flex justify-between">
                <span>อัตรากำไรสุทธิ (Net Margin):</span>
                <span className="font-bold text-white">{formatPercent(deliveryResult.netProfitMarginPercent)}</span>
              </div>
            </div>

            {/* Detailed Deductions */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>ราคาขายบนแอป:</span>
                <span className="font-bold text-white">{formatCurrency(deliverySellingPrice)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-rose-300">
                <span>หัก ค่า GP แพลตฟอร์ม {vatOnGp ? '(รวม VAT 7%)' : ''}:</span>
                <span className="font-bold">-{formatCurrency(deliveryResult.totalGpFeeWithVat)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-emerald-300">
                <span>เงินที่แอปโอนเข้าบัญชีร้าน (Net Payout):</span>
                <span className="font-bold">{formatCurrency(deliveryResult.netPayoutFromPlatform)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>หัก ต้นทุนอาหาร (Food Cost):</span>
                <span>-{formatCurrency(foodCost)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-700/60 text-gray-300">
                <span>หัก ต้นทุนบรรจุภัณฑ์ (Packaging):</span>
                <span>-{formatCurrency(packagingCost)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700 text-[11px] text-gray-300 leading-relaxed">
            <span className="font-bold text-orange-400">💡 คำแนะนำ:</span> หากต้องการกำไรสุทธิ ฿35 ต่อกล่องบนแอป Grab/LINE MAN (GP 30% + VAT 7%) คุณควรตั้งราคาขายบนแอปอย่างน้อย{' '}
            <span className="font-bold text-white">
              {formatCurrency(((foodCost + packagingCost + 35) / (1 - 0.321)))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

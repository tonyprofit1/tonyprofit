import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Percent,
  Truck,
  Database,
  Save,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Info,
  Smartphone,
} from 'lucide-react';
import { AppSettings } from '../types';
import { MainTab } from '../components/BottomNav';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  onNavigate: (tab: MainTab) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onNavigate,
}) => {
  const [restaurantName, setRestaurantName] = useState(settings.restaurantName || "Tony's Thai Kitchen");
  const [defaultTargetFoodCost, setDefaultTargetFoodCost] = useState<number>(
    settings.defaultTargetFoodCostPercent || 35
  );
  const [defaultDeliveryGp, setDefaultDeliveryGp] = useState<number>(
    settings.defaultDeliveryGpPercent || 30
  );
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '฿');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      restaurantName: restaurantName.trim() || "Tony's Thai Kitchen",
      defaultTargetFoodCostPercent: Number(defaultTargetFoodCost) || 35,
      defaultDeliveryGpPercent: Number(defaultDeliveryGp) || 30,
      currencySymbol: currencySymbol.trim() || '฿',
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-orange-600" />
          <span>การตั้งค่าระบบ (Application Settings)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          กำหนดค่าเริ่มต้นสำหรับร้านของคุณ เปอร์เซ็นต์เป้าหมาย และการทำงานออฟไลน์
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Settings Form (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-orange-600" />
                <span>ชื่อร้านอาหาร (Restaurant Name)</span>
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => {
                  setRestaurantName(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="เช่น ครัวคุณโทนี่, ส้มตำยกครก..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-orange-600" />
                  <span>เป้าหมาย Food Cost % เริ่มต้น</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={defaultTargetFoodCost}
                    onChange={(e) => {
                      setDefaultTargetFoodCost(parseFloat(e.target.value) || 35);
                      setIsSaved(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                  />
                  <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center">
                    %
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">มาตรฐานร้านอาหารไทยทั่วไปอยู่ที่ 30% - 35%</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-orange-600" />
                  <span>ค่า GP เดลิเวอรี่เริ่มต้น</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={defaultDeliveryGp}
                    onChange={(e) => {
                      setDefaultDeliveryGp(parseFloat(e.target.value) || 30);
                      setIsSaved(false);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none font-bold"
                  />
                  <div className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 flex items-center">
                    %
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">Grab / LINE MAN โดยทั่วไปอยู่ที่ 30%</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              {isSaved ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> บันทึกการตั้งค่าเรียบร้อยแล้ว
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info & PWA Specs (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-orange-600" /> ข้อมูลระบบ PWA & ออฟไลน์
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">สถานะที่เก็บข้อมูล:</span>
                <span className="font-bold text-emerald-600">IndexedDB (เครื่องนี้)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">การทำงานออฟไลน์:</span>
                <span className="font-bold text-emerald-600">100% Offline Ready</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">ค่าบริการคลาวด์:</span>
                <span className="font-bold text-emerald-600">฿0 ฟรีตลอดชีพ</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">เวอร์ชันแอป:</span>
                <span className="font-bold text-gray-900">v1.0.0 (Production)</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> การตรวจสอบระบบ
            </h3>
            <p className="text-xs text-gray-500">
              รันการทดสอบทางคณิตศาสตร์ 12 ข้อ เพื่อยืนยันความถูกต้องของสูตรคำนวณ
            </p>
            <button
              onClick={() => onNavigate('tests')}
              className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>เปิดหน้าระบบทดสอบสูตร</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

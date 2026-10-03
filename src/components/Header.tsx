import React, { useState, useEffect } from 'react';
import { ChefHat, Wifi, WifiOff, Sparkles, SlidersHorizontal, CheckCircle2, RotateCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { demoDataService } from '../services/demoDataService';

interface HeaderProps {
  settings: AppSettings;
  onRefreshData: () => void;
  onOpenSettings: () => void;
  onOpenTests: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onRefreshData,
  onOpenSettings,
  onOpenTests,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await demoDataService.loadDemoData();
      onRefreshData();
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Brand and Restaurant Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate tracking-tight">
                {settings.restaurantName || "Tony's Restaurant Cost Control"}
              </h1>
              {settings.isDemoMode && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-600" /> ตัวอย่าง (Demo)
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-gray-500 truncate">
              ระบบควบคุมต้นทุน & สูตรอาหารแบบออฟไลน์ 100%
            </p>
          </div>
        </div>

        {/* Action Controls & Offline Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Offline / Online Pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
            }`}
            title={isOnline ? 'เชื่อมต่อเครือข่าย' : 'ทำงานแบบออฟไลน์ (IndexedDB)'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isOnline ? 'Online / Offline Ready' : 'ออฟไลน์ (Offline Mode)'}</span>
          </div>

          {/* Load Demo Data Quick Button (if not yet loaded) */}
          <button
            onClick={handleLoadDemo}
            disabled={isLoadingDemo}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            title="โหลดข้อมูลตัวอย่างอาหารไทย (กะเพราไก่, ต้มยำกุ้ง, ชาไทย)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isLoadingDemo ? 'กำลังโหลด...' : 'โหลดข้อมูลสาธิต (Demo)'}</span>
          </button>

          {/* Test Suite Runner Button */}
          <button
            onClick={onOpenTests}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            title="ตรวจสอบความถูกต้องของสูตรคำนวณคณิตศาสตร์ (12 Tests)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">ผลทดสอบสูตร</span>
            <span className="sm:hidden">ทดสอบ</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200/80"
            title="ตั้งค่าระบบและกู้คืนข้อมูล"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

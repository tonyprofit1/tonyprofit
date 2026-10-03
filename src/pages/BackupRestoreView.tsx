import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Database,
  ArrowRight,
} from 'lucide-react';
import { AppBackupData } from '../types';
import {
  exportBackupToFile,
  parseAndValidateBackupFile,
  restoreBackupToDatabase,
  resetAllDatabaseData,
} from '../services/backupService';
import { seedSampleDemoData } from '../services/demoDataService';
import { formatDateThai } from '../utils/formatters';
import { ConfirmModal } from '../components/ConfirmModal';

interface BackupRestoreViewProps {
  onDataMutated: () => Promise<void>;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ onDataMutated }) => {
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File import state
  const [stagedBackup, setStagedBackup] = useState<AppBackupData | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modals
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  const handleExport = async () => {
    try {
      setErrorMessage(null);
      await exportBackupToFile();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage('เกิดข้อผิดพลาดในการ Export ไฟล์สำรอง: ' + message);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const data = await parseAndValidateBackupFile(file);
      setStagedBackup(data);
      setStagedFileName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || 'ไฟล์ JSON ไม่ถูกต้องตามรูปแบบของแอป');
      setStagedBackup(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!stagedBackup) return;
    try {
      setErrorMessage(null);
      await restoreBackupToDatabase(stagedBackup);
      await onDataMutated();
      setStagedBackup(null);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage('เกิดข้อผิดพลาดในการ Import: ' + message);
    }
  };

  const handleExecuteDemoSeed = async () => {
    try {
      setErrorMessage(null);
      await seedSampleDemoData();
      await onDataMutated();
      setDemoSuccess(true);
      setTimeout(() => setDemoSuccess(false), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage('เกิดข้อผิดพลาดในการใส่ข้อมูลตัวอย่าง: ' + message);
    }
  };

  const handleExecuteReset = async () => {
    try {
      setErrorMessage(null);
      await resetAllDatabaseData();
      await onDataMutated();
      alert('ล้างข้อมูลทั้งหมดใน IndexedDB เรียบร้อยแล้ว');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage('เกิดข้อผิดพลาดในการล้างข้อมูล: ' + message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-orange-600" />
          <span>สำรอง & กู้คืนข้อมูล (Backup & Restore)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          ข้อมูลทั้งหมดเก็บในเบราว์เซอร์ของคุณ (IndexedDB) คุณสามารถดาวน์โหลดไฟล์ JSON สำรองและนำกลับมาใช้ได้ทุกเมื่อ 100% ฟรี
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {exportSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>ดาวน์โหลดไฟล์สำรองข้อมูล JSON สำเร็จเรียบร้อย!</span>
        </div>
      )}

      {importSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>กู้คืนข้อมูลจากไฟล์ JSON เรียบร้อยแล้ว! ฐานข้อมูลอัปเดตเรียบร้อย</span>
        </div>
      )}

      {demoSuccess && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-600 shrink-0" />
          <span>ลงข้อมูลตัวอย่างร้านอาหารไทยสำเร็จแล้ว!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Export Backup */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">ส่งออกไฟล์สำรอง (Export Backup JSON)</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              ดาวน์โหลดข้อมูลวัตถุดิบ สูตรอาหาร ประวัติราคา บรรจุภัณฑ์ และของเสียทั้งหมดออกมาเป็นไฟล์ .json เก็บไว้ในเครื่องอย่างปลอดภัย
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <button
              onClick={handleExport}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ JSON สำรองข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Card 2: Import Backup */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900">นำเข้าไฟล์สำรอง (Import Backup JSON)</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              กู้คืนข้อมูลจากไฟล์สำรอง JSON ที่คุณเคยดาวน์โหลดไว้ ข้อมูลจะถูกเขียนทับลงในเบราว์เซอร์นี้
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileSelected}
              className="hidden"
            />

            {!stagedBackup ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>เลือกไฟล์ JSON จากอุปกรณ์</span>
              </button>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-blue-900">
                  <span className="truncate pr-2">ไฟล์: {stagedFileName}</span>
                  <span>{stagedBackup.metadata.appName}</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px] text-blue-800">
                  <div>วัตถุดิบ: {stagedBackup.ingredients.length}</div>
                  <div>สูตร: {stagedBackup.recipes.length}</div>
                  <div>เมนู: {stagedBackup.menuItems.length}</div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => setStagedBackup(null)}
                    className="px-3 py-1.5 text-gray-600 hover:bg-blue-100 rounded-lg text-xs"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportConfirmOpen(true)}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    ยืนยันการกู้คืน
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Data & Factory Reset Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {/* Demo Data Seed */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> ข้อมูลตัวอย่างร้านอาหารไทย
            </span>
            <h4 className="text-sm font-bold text-gray-900 mt-1">โหลดข้อมูลตัวอย่าง (Sample Demo Data)</h4>
            <p className="text-xs text-gray-500 mt-1">
              ใส่ข้อมูลตัวอย่างเมนูยอดนิยม (ข้าวกะเพราไก่, ต้มยำกุ้ง, ข้าวผัดหมู) พร้อมวัตถุดิบและ Yield มาตรฐาน
            </p>
          </div>

          <button
            onClick={() => setIsDemoConfirmOpen(true)}
            className="w-full py-2 px-3 border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-xl text-xs font-bold transition-colors text-center"
          >
            โหลดข้อมูลจำลองร้านอาหาร
          </button>
        </div>

        {/* Factory Reset */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> ล้างข้อมูลทั้งหมด
            </span>
            <h4 className="text-sm font-bold text-gray-900 mt-1">ล้างฐานข้อมูล (Factory Data Reset)</h4>
            <p className="text-xs text-gray-500 mt-1">
              ลบวัตถุดิบ สูตรอาหาร เมนู และประวัติทั้งหมดออกจากเครื่องเพื่อเริ่มต้นใหม่ทั้งหมด
            </p>
          </div>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-2 px-3 border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-colors text-center"
          >
            ล้างข้อมูลทั้งหมดในเครื่อง
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={isDemoConfirmOpen}
        onClose={() => setIsDemoConfirmOpen(false)}
        onConfirm={handleExecuteDemoSeed}
        title="โหลดข้อมูลตัวอย่างร้านอาหาร"
        message="การดำเนินการนี้จะโหลดวัตถุดิบและสูตรอาหารตัวอย่าง (ข้าวกะเพราไก่, ต้มยำกุ้ง, ข้าวผัดหมู) ลงในฐานข้อมูล ต้องการดำเนินการต่อหรือไม่?"
        confirmText="โหลดข้อมูลตัวอย่าง"
      />

      <ConfirmModal
        isOpen={isImportConfirmOpen}
        onClose={() => setIsImportConfirmOpen(false)}
        onConfirm={handleExecuteImport}
        title="ยืนยันการกู้คืนข้อมูลจากไฟล์"
        message="ข้อมูลในเครื่องจะถูกแทนที่ด้วยข้อมูลจากไฟล์ JSON สำรองนี้ คุณแน่ใจหรือไม่?"
        confirmText="กู้คืนข้อมูลทันที"
      />

      <ConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleExecuteReset}
        title="ยืนยันการล้างข้อมูลทั้งหมด"
        message="คำเตือน: ข้อมูลทั้งหมดจะถูกลบออกจากเบราว์เซอร์อย่างถาวรและไม่สามารถกู้คืนได้เว้นแต่คุณมีไฟล์ JSON สำรองไว้ คุณแน่ใจหรือไม่?"
        confirmText="ล้างข้อมูลทั้งหมด"
        isDestructive
      />
    </div>
  );
};

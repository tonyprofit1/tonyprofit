import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { runAllFinancialTests, FinancialTestCaseResult } from '../calculations/automatedTests';

export const TestRunnerView: React.FC = () => {
  const [results, setResults] = useState<FinancialTestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllFinancialTests();
      setResults(res);
      setIsRunning(false);
    }, 100);
  };

  useEffect(() => {
    executeTests();
  }, []);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>ตรวจสอบความถูกต้องของสูตรคำนวณ (Financial Tests & Verification)</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">
            ทดสอบความแม่นยำทางคณิตศาสตร์ 14 ข้อ ครอบคลุม Unit Conversion, Yield %, Food Cost, Sub-Recipes, GP เดลิเวอรี่
          </p>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0"
        >
          <RotateCcw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          <span>รันการทดสอบทั้งหมด</span>
        </button>
      </div>

      {/* Summary Score Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 text-white shadow-md transition-colors ${
          failed === 0 ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
              สถานะเครื่องคำนวณ (Calculation Engine Integrity)
            </span>
            <div className="text-2xl sm:text-3xl font-black">
              {failed === 0 ? 'ผ่านการทดสอบ 100% (All Passed)' : `พบข้อผิดพลาด ${failed} รายการ`}
            </div>
            <p className="text-xs sm:text-sm text-emerald-100">
              ทุกโมดูลคำนวณทำงานด้วยฟังก์ชันบริสุทธิ์ (Pure Functions) ตามมาตรฐานการควบคุมต้นทุนร้านอาหาร
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl text-center border border-white/20">
              <span className="text-xs text-white/80 block">ผ่าน</span>
              <span className="text-xl sm:text-2xl font-black text-white">{passed}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl text-center border border-white/20">
              <span className="text-xs text-white/80 block">ทั้งหมด</span>
              <span className="text-xl sm:text-2xl font-black text-white">{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results List */}
      <div className="space-y-3">
        {results.map((res, index) => (
          <div
            key={res.id || index}
            className={`p-4 rounded-2xl border transition-all ${
              res.passed
                ? 'bg-white border-gray-200/80 shadow-2xs hover:border-emerald-300'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {res.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{res.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                      {res.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{res.description}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    res.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {res.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>

            {/* Values details */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="text-gray-600">
                <span className="font-semibold text-gray-500">ค่าที่คาดหวัง (Expected): </span>
                <span className="font-mono text-gray-900 font-bold">{res.expected}</span>
              </div>
              <div className="text-gray-600">
                <span className="font-semibold text-gray-500">ค่าที่คำนวณได้จริง (Actual): </span>
                <span className={`font-mono font-bold ${res.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {res.actual}
                </span>
              </div>
            </div>

            {res.details && (
              <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[11px] text-gray-500 font-mono">
                {res.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

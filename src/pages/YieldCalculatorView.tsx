import React, { useState } from 'react';
import { Calculator, Scale, Sparkles, Check, Flame, Save, AlertTriangle, ArrowDown } from 'lucide-react';
import { Ingredient, UnitType } from '../types';
import { calculateIngredientCost, calculateYieldFromWeights, calculatePrepLossFromWeights } from '../calculations/ingredientCost';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface YieldCalculatorViewProps {
  ingredients: Ingredient[];
  onUpdateIngredientYield?: (ingredientId: string, newYieldPercent: number) => Promise<void>;
}

export const YieldCalculatorView: React.FC<YieldCalculatorViewProps> = ({
  ingredients = [],
  onUpdateIngredientYield,
}) => {
  const safeIngredients = ingredients || [];
  const [calcMode, setCalcMode] = useState<'byUsable' | 'byScrap'>('byScrap');
  const [rawWeight, setRawWeight] = useState<number>(1000); // e.g. 1000g raw
  const [scrapWeight, setScrapWeight] = useState<number>(100); // e.g. 100g trimmings
  const [usableWeightInput, setUsableWeightInput] = useState<number>(900); // e.g. 900g usable
  const [purchasePrice, setPurchasePrice] = useState<number>(95);
  const [unit, setUnit] = useState<UnitType>('g');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  // Step 2: Cooking Loss states
  const [enableCookingLoss, setEnableCookingLoss] = useState<boolean>(true);
  const [cookedWeightInput, setCookedWeightInput] = useState<string>('720');

  // Step 1 Calculations (Trimming / Scrap Loss)
  const actualUsableWeight = calcMode === 'byScrap' ? Math.max(0, rawWeight - scrapWeight) : usableWeightInput;
  const actualScrapWeight = calcMode === 'byScrap' ? scrapWeight : Math.max(0, rawWeight - usableWeightInput);
  const yieldPercent = calculateYieldFromWeights(rawWeight, actualUsableWeight);
  const yieldLossPercent = Math.max(0, 100 - yieldPercent);

  // Step 2 Calculations (Prep / Cooking Loss)
  const preCookWeight = actualUsableWeight;
  const parsedCookedWeight = cookedWeightInput.trim() !== '' ? parseFloat(cookedWeightInput) : null;
  const isCookingLossActive = enableCookingLoss && parsedCookedWeight !== null && !isNaN(parsedCookedWeight);

  const cookingLossValidation = isCookingLossActive
    ? calculatePrepLossFromWeights(preCookWeight, parsedCookedWeight)
    : null;

  const isCookedWeightInvalid = isCookingLossActive && parsedCookedWeight !== null && parsedCookedWeight > preCookWeight;
  const cookedWeight = isCookingLossActive && !isCookedWeightInvalid && parsedCookedWeight !== null ? parsedCookedWeight : preCookWeight;
  const cookingLossWeight = isCookingLossActive && !isCookedWeightInvalid && parsedCookedWeight !== null
    ? Math.max(0, preCookWeight - parsedCookedWeight)
    : 0;
  const prepLossPercent = isCookingLossActive && !isCookedWeightInvalid && cookingLossValidation
    ? cookingLossValidation.prepLossPercent
    : (enableCookingLoss && parsedCookedWeight === null ? null : 0);

  // Effective Cooked Cost (Full Floating-Point Precision: purchasePrice / cookedWeight)
  const effectiveCookedCostPerUnit = isCookingLossActive && cookedWeight > 0 && purchasePrice >= 0
    ? purchasePrice / cookedWeight
    : null;

  // Cost engine for Step 1
  let calcResult = null;
  try {
    if (rawWeight > 0 && purchasePrice >= 0 && yieldPercent > 0) {
      calcResult = calculateIngredientCost(rawWeight, unit, purchasePrice, yieldPercent);
    }
  } catch {
    calcResult = null;
  }

  // Presets
  const presets = [
    { name: 'อกไก่สด (ลอกหนัง/ต้มสุก)', raw: 1000, scrap: 100, cooked: 720, price: 95, unit: 'g' as UnitType },
    { name: 'กุ้งขาวสด (แกะเปลือก/ลวก)', raw: 1000, scrap: 250, cooked: 600, price: 240, unit: 'g' as UnitType },
    { name: 'มะนาวสด (คั้นน้ำ)', raw: 1000, scrap: 350, cooked: 650, price: 70, unit: 'g' as UnitType },
    { name: 'ใบกะเพรา (เด็ดก้าน/ผัด)', raw: 500, scrap: 75, cooked: 340, price: 40, unit: 'g' as UnitType },
    { name: 'ปลากะพงสด (แล่เนื้อ/ทอด)', raw: 1000, scrap: 500, cooked: 400, price: 180, unit: 'g' as UnitType },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setRawWeight(p.raw);
    setScrapWeight(p.scrap);
    setUsableWeightInput(p.raw - p.scrap);
    setCookedWeightInput(String(p.cooked));
    setEnableCookingLoss(true);
    setPurchasePrice(p.price);
    setUnit(p.unit);
    setIsSavedSuccess(false);
  };

  const handleSaveToIngredient = async () => {
    if (!selectedIngredientId || !onUpdateIngredientYield || isCookedWeightInvalid) return;
    await onUpdateIngredientYield(selectedIngredientId, Math.round(yieldPercent * 10) / 10);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-6 h-6 text-orange-600" />
          <span>เครื่องคิดผลผลิตวัตถุดิบ & การสูญเสียขณะปรุง (Yield & Prep Loss)</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500">
          วิเคราะห์การสูญเสีย 2 ขั้นตอน: 1. ตัดแต่ง (Trimming Yield) และ 2. ปรุงสุก (Cooking Prep Loss)
        </p>
      </div>

      {/* Preset Chips */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-gray-700">สูตรทดสอบมาตรฐาน (Quick Presets):</label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="px-3 py-1.5 bg-white hover:bg-orange-50 hover:border-orange-300 border border-gray-200 rounded-xl text-gray-700 whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-2xs font-medium"
            >
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 w-full min-w-0">
        {/* Input Form Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4 w-full min-w-0">
          {/* Step 1 Card: Trimming / Scrap Loss */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>ขั้นที่ 1: การตัดแต่ง (Trimming & Scrap Loss)</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">น้ำหนักตั้งต้น → น้ำหนักหลังตัดแต่ง (ก่อนปรุง)</p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setCalcMode('byScrap')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    calcMode === 'byScrap' ? 'bg-white text-orange-600 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  ระบุน้ำหนักเศษทิ้ง
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('byUsable')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    calcMode === 'byUsable' ? 'bg-white text-orange-600 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  ระบุน้ำหนักที่ใช้ได้
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 w-full min-w-0">
              {/* 1. Raw Weight */}
              <div className="w-full min-w-0 space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  น้ำหนักวัตถุดิบตั้งต้น (Raw Starting Weight) *
                </label>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <input
                    id="input-yield-raw-weight"
                    type="number"
                    min="1"
                    step="any"
                    value={rawWeight}
                    onChange={(e) => {
                      setRawWeight(parseFloat(e.target.value) || 0);
                      setIsSavedSuccess(false);
                    }}
                    className="flex-1 min-w-0 w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                  />
                  <select
                    id="select-yield-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as UnitType)}
                    className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                  >
                    <option value="g">กรัม (g)</option>
                    <option value="kg">กก. (kg)</option>
                    <option value="ml">มล. (ml)</option>
                    <option value="piece">ชิ้น (pc)</option>
                  </select>
                </div>
              </div>

              {/* 2. Purchase Price */}
              <div className="w-full min-w-0 space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  ราคาซื้อทั้งหมด (Total Purchase Price) *
                </label>
                <div className="flex items-center gap-2 w-full min-w-0">
                  <div className="relative flex-1 min-w-0 w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none select-none">
                      ฿
                    </span>
                    <input
                      id="input-yield-purchase-price"
                      type="number"
                      min="0"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => {
                        setPurchasePrice(parseFloat(e.target.value) || 0);
                        setIsSavedSuccess(false);
                      }}
                      className="w-full min-w-0 pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-900"
                    />
                  </div>
                  <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                    บาท
                  </div>
                </div>
              </div>

              {/* 3. Scrap Weight vs Usable Weight based on mode */}
              {calcMode === 'byScrap' ? (
                <>
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-rose-700">
                      น้ำหนักเศษที่ต้องทิ้ง (Scrap Weight) *
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <input
                        id="input-yield-scrap-weight"
                        type="number"
                        min="0"
                        max={rawWeight}
                        step="any"
                        value={scrapWeight}
                        onChange={(e) => {
                          setScrapWeight(parseFloat(e.target.value) || 0);
                          setIsSavedSuccess(false);
                        }}
                        className="flex-1 min-w-0 w-full px-3 py-2 text-sm border border-rose-300 bg-rose-50/40 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-gray-900"
                      />
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>

                  {/* Read-only Usable Weight */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-emerald-700">
                      น้ำหนักที่ใช้ได้จริง (ก่อนปรุง)
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="flex-1 min-w-0 w-full px-3 py-2 text-sm font-bold bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between">
                        <span>{formatNumber(actualUsableWeight)}</span>
                        <span className="text-xs font-normal text-emerald-700">({yieldPercent.toFixed(1)}% Yield)</span>
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-emerald-700">
                      น้ำหนักเนื้อแท้ที่ใช้ได้ (Usable Weight) *
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <input
                        id="input-yield-usable-weight"
                        type="number"
                        min="0"
                        max={rawWeight}
                        step="any"
                        value={usableWeightInput}
                        onChange={(e) => {
                          setUsableWeightInput(parseFloat(e.target.value) || 0);
                          setIsSavedSuccess(false);
                        }}
                        className="flex-1 min-w-0 w-full px-3 py-2 text-sm border border-emerald-300 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-gray-900"
                      />
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>

                  {/* Read-only Scrap Weight */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-rose-700">
                      น้ำหนักเศษที่ตัดทิ้ง (คำนวณอัตโนมัติ)
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="flex-1 min-w-0 w-full px-3 py-2 text-sm font-bold bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center justify-between">
                        <span>{formatNumber(actualScrapWeight)}</span>
                        <span className="text-xs font-normal text-rose-700">({yieldLossPercent.toFixed(1)}% Loss)</span>
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Step 2 Card: Prep / Cooking Loss */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-xs space-y-4 w-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ขั้นที่ 2: การสูญเสียขณะปรุง (Prep / Cooking Loss)</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">น้ำหนักหลังตัดแต่ง (ก่อนปรุง) → น้ำหนักหลังปรุง</p>
                </div>
              </div>

              {/* No Cooking Loss Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!enableCookingLoss}
                  onChange={(e) => setEnableCookingLoss(!e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                />
                <span>ไม่มีการสูญเสียขณะปรุง (Prep Loss 0%)</span>
              </label>
            </div>

            {enableCookingLoss ? (
              <div className="space-y-3.5">
                {/* Mobile Responsive 1-column stack / 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full min-w-0">
                  {/* Field 1: Pre-cook weight */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      น้ำหนักก่อนปรุง / หลังตัดแต่ง (Pre-Cook Weight)
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="flex-1 min-w-0 w-full px-3 py-2 text-sm font-bold bg-gray-100 border border-gray-200 text-gray-800 rounded-xl">
                        {formatNumber(preCookWeight)}
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>

                  {/* Field 2: Cooked weight (User Input) */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-orange-700">
                      น้ำหนักหลังปรุง (Cooked Weight) *
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <input
                        id="input-yield-cooked-weight"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="เช่น 720"
                        value={cookedWeightInput}
                        onChange={(e) => {
                          setCookedWeightInput(e.target.value);
                          setIsSavedSuccess(false);
                        }}
                        className={`flex-1 min-w-0 w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:outline-none bg-white text-gray-900 font-bold ${
                          isCookedWeightInvalid
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/20'
                            : 'border-orange-300 focus:ring-orange-500'
                        }`}
                      />
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>

                  {/* Field 3: Lost Weight (Read-only) */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      น้ำหนักที่หายไป (Cooking Loss Weight)
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="flex-1 min-w-0 w-full px-3 py-2 text-sm font-bold bg-amber-50/60 border border-amber-200 text-amber-900 rounded-xl">
                        {isCookedWeightInvalid ? '--' : `${formatNumber(cookingLossWeight)}`}
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        {unit}
                      </div>
                    </div>
                  </div>

                  {/* Field 4: Prep Loss % (Read-only Calculated) */}
                  <div className="w-full min-w-0 space-y-1">
                    <label className="block text-xs font-bold text-amber-800">
                      สูญเสียขณะปรุงรวม (Prep Loss %)
                    </label>
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="flex-1 min-w-0 w-full px-3 py-2 text-sm font-black bg-amber-100 border border-amber-300 text-amber-900 rounded-xl flex items-center justify-between">
                        <span>
                          {isCookedWeightInvalid || prepLossPercent === null
                            ? '--'
                            : `${prepLossPercent.toFixed(2)}%`}
                        </span>
                        <span className="text-[11px] font-medium text-amber-700">(คำนวณอัตโนมัติ)</span>
                      </div>
                      <div className="w-24 sm:w-28 shrink-0 px-2.5 py-2 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center select-none">
                        %
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation Error Message */}
                {isCookedWeightInvalid && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>น้ำหนักหลังปรุงต้องไม่มากกว่าน้ำหนักก่อนปรุง</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>ไม่มีการสูญเสียขณะปรุง: Prep Loss = 0%, น้ำหนักหลังปรุง = {formatNumber(preCookWeight)} {unit}</span>
              </div>
            )}

            {/* Target Ingredient selector to save yield directly */}
            <div className="w-full min-w-0 space-y-1 pt-3 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700">
                นำค่า Yield ไปบันทึกลงวัตถุดิบ (ตัวเลือก)
              </label>
              <select
                id="select-yield-target-ingredient"
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(e.target.value)}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 truncate"
              >
                <option value="">-- เลือกวัตถุดิบที่ต้องการอัปเดต --</option>
                {safeIngredients.map((ing) => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} (Yield เดิม: {ing.usableYieldPercent}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Action button to save to DB */}
            {selectedIngredientId && onUpdateIngredientYield && (
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  อัปเดต Yield ของวัตถุดิบนี้เป็น{' '}
                  <span className="font-bold text-orange-600">{yieldPercent.toFixed(1)}%</span>
                </span>
                <button
                  id="btn-save-yield-to-ingredient"
                  type="button"
                  disabled={isCookedWeightInvalid}
                  onClick={handleSaveToIngredient}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  {isSavedSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                  <span>{isSavedSuccess ? 'บันทึกสำเร็จ!' : 'บันทึก Yield ไปยังวัตถุดิบ'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Output Results Column (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                ผลการวิเคราะห์ต้นทุนแท้จริง (Cost & Yield Analysis)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                Yield {yieldPercent.toFixed(1)}%
              </span>
            </div>

            {/* Main Highlight Metric 1: Effective Cooked Cost */}
            {effectiveCookedCostPerUnit !== null && !isCookedWeightInvalid ? (
              <div className="mt-4 p-4 rounded-xl bg-orange-950/60 border border-orange-500/40 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-orange-300 font-bold">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>ต้นทุนแท้จริงหลังปรุงสุก (Effective Cooked Cost):</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300">
                  {formatCurrency(effectiveCookedCostPerUnit, '฿', 4)}
                  <span className="text-xs font-normal text-gray-300"> / {calcResult?.baseUnit || unit}</span>
                </div>
                <div className="text-[11px] text-orange-200/80 pt-1">
                  คำนวณจาก: ราคาซื้อ ฿{purchasePrice} ÷ น้ำหนักหลังปรุง {formatNumber(cookedWeight)} {unit}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-xl bg-gray-800/80 border border-gray-700 space-y-1">
                <span className="text-xs text-gray-400">ต้นทุนเนื้อแท้ที่ใช้จริง (Effective Usable Cost):</span>
                <div className="text-2xl sm:text-3xl font-black text-orange-400">
                  {calcResult ? formatCurrency(calcResult.effectiveCostPerBaseUnit, '฿', 4) : '฿0.00'}
                  <span className="text-xs font-normal text-gray-400"> / {calcResult?.baseUnit || unit}</span>
                </div>
              </div>
            )}

            {/* Two-Step Breakdown Pipeline */}
            <div className="mt-4 space-y-2.5 text-xs">
              <div className="font-bold text-gray-300 text-[11px] uppercase tracking-wide">
                เส้นทางการสูญเสีย 2 ขั้นตอน (2-Step Loss Pipeline):
              </div>

              {/* Step 1 breakdown */}
              <div className="p-2.5 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-gray-200">
                  <span>ขั้นที่ 1: การตัดแต่ง (Trimming)</span>
                  <span className="text-emerald-400">Yield {yieldPercent.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span>น้ำหนักตั้งต้น: {formatNumber(rawWeight)} {unit}</span>
                  <span className="text-rose-300">เศษตัดทิ้ง: {formatNumber(actualScrapWeight)} {unit} ({yieldLossPercent.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span>ต้นทุนก่อนตัดแต่ง: {calcResult ? formatCurrency(calcResult.rawCostPerBaseUnit, '฿', 4) : '฿0.00'}/{unit}</span>
                  <span className="text-orange-300 font-semibold">
                    ต้นทุนหลังตัดแต่ง: {calcResult ? formatCurrency(calcResult.effectiveCostPerBaseUnit, '฿', 4) : '฿0.00'}/{unit}
                  </span>
                </div>
              </div>

              <div className="flex justify-center text-gray-500">
                <ArrowDown className="w-4 h-4 text-orange-400" />
              </div>

              {/* Step 2 breakdown */}
              <div className="p-2.5 bg-gray-800/80 rounded-xl border border-gray-700/80 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-gray-200">
                  <span>ขั้นที่ 2: การปรุงสุก (Cooking Prep)</span>
                  <span className="text-amber-400">
                    {enableCookingLoss && prepLossPercent !== null
                      ? `Prep Loss ${prepLossPercent.toFixed(2)}%`
                      : 'Prep Loss 0%'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span>ก่อนปรุง: {formatNumber(preCookWeight)} {unit}</span>
                  <span className="text-amber-300">
                    หลังปรุง: {enableCookingLoss && !isCookedWeightInvalid ? formatNumber(cookedWeight) : formatNumber(preCookWeight)} {unit}
                  </span>
                </div>
                {enableCookingLoss && !isCookedWeightInvalid && (
                  <div className="flex items-center justify-between text-gray-400 text-[11px]">
                    <span className="text-rose-300">น้ำหนักหายขณะปรุง: {formatNumber(cookingLossWeight)} {unit}</span>
                    <span className="text-amber-300 font-bold">
                      ต้นทุนปรุงสุก: {effectiveCookedCostPerUnit !== null ? formatCurrency(effectiveCookedCostPerUnit, '฿', 4) : '฿0.00'}/{unit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-800/60 rounded-xl border border-gray-700 text-[11px] text-gray-300 leading-relaxed">
            <span className="font-bold text-orange-400">💡 เคล็ดลับ Cost Engine:</span> หากซื้อไก่ 1,000g ฿95 ตัดแต่งเหลือ 900g (Yield 90%) ต้มสุกเหลือน้ำหนัก 720g (Prep Loss 20%) ต้นทุนเนื้อไก่ต้มสุกที่แท้จริงคือ ฿95 ÷ 720g = <span className="text-amber-300 font-bold">฿0.131944/กรัม</span>
          </div>
        </div>
      </div>
    </div>
  );
};


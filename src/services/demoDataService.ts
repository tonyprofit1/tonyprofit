import { getDatabase } from '../database/db';
import {
  AppSettings,
  Ingredient,
  IngredientPriceHistory,
  IngredientPurchase,
  MenuItem,
  PackagingItem,
  Recipe,
  WasteRecord,
} from '../types';
import { calculateIngredientCost } from '../calculations/ingredientCost';

export const demoDataService = {
  async loadDemoData(): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // 1. Ingredients
    const rawIngredientsData: Array<{
      id: string;
      name: string;
      category: Ingredient['category'];
      purchaseUnit: Ingredient['purchaseUnit'];
      purchaseQuantity: number;
      purchasePrice: number;
      usableYieldPercent: number;
      notes?: string;
    }> = [
      { id: 'ing_chicken', name: 'อกไก่สด (Chicken breast)', category: 'เนื้อสัตว์ ไข่', purchaseUnit: 'kg', purchaseQuantity: 1, purchasePrice: 95, usableYieldPercent: 90, notes: 'ลอกหนังและพังผืดออก 10%' },
      { id: 'ing_pork', name: 'เนื้อหมูสันนอก (Pork loin)', category: 'เนื้อสัตว์ ไข่', purchaseUnit: 'kg', purchaseQuantity: 1, purchasePrice: 160, usableYieldPercent: 95, notes: 'หั่นแต่งไขมันเล็กน้อย' },
      { id: 'ing_shrimp', name: 'กุ้งขาวสดไว้หาง (Shrimp)', category: 'เนื้อสัตว์ ไข่', purchaseUnit: 'kg', purchaseQuantity: 1, purchasePrice: 240, usableYieldPercent: 75, notes: 'แกะเปลือก ผ่าหลัง ดึงเส้นดำ' },
      { id: 'ing_rice', name: 'ข้าวสารหอมมะลิ (Jasmine Rice)', category: 'ข้าว เส้น', purchaseUnit: 'kg', purchaseQuantity: 5, purchasePrice: 190, usableYieldPercent: 100, notes: 'หุงขึ้นหม้อ 1 กิโลกรัมข้าวสารได้ข้าวสวย ~2.3 กิโลกรัม' },
      { id: 'ing_egg', name: 'ไข่ไก่เบอร์ 2 (Egg #2)', category: 'เนื้อสัตว์ ไข่', purchaseUnit: 'piece', purchaseQuantity: 30, purchasePrice: 125, usableYieldPercent: 100, notes: 'แผงละ 30 ฟอง ตกฟองละ ฿4.17' },
      { id: 'ing_basil', name: 'ใบกะเพรา (Holy Basil)', category: 'ผักสด', purchaseUnit: 'g', purchaseQuantity: 500, purchasePrice: 40, usableYieldPercent: 85, notes: 'เด็ดก้านแข็งทิ้ง 15%' },
      { id: 'ing_garlic', name: 'กระเทียมไทย (Thai Garlic)', category: 'ของแห้ง', purchaseUnit: 'g', purchaseQuantity: 500, purchasePrice: 55, usableYieldPercent: 80, notes: 'ปอกเปลือกและคัดหัวฝ่อออก' },
      { id: 'ing_chili', name: 'พริกขี้หนูสวน (Chili)', category: 'ผักสด', purchaseUnit: 'g', purchaseQuantity: 300, purchasePrice: 45, usableYieldPercent: 95, notes: 'เด็ดขั้วพริกออก' },
      { id: 'ing_oil', name: 'น้ำมันพืชปาล์ม (Cooking Oil)', category: 'ซอส', purchaseUnit: 'L', purchaseQuantity: 1, purchasePrice: 52, usableYieldPercent: 100, notes: 'ขวด 1 ลิตร' },
      { id: 'ing_oyster_sauce', name: 'ซอสหอยนางรม (Oyster Sauce)', category: 'ซอส', purchaseUnit: 'g', purchaseQuantity: 1000, purchasePrice: 65, usableYieldPercent: 100, notes: 'ขวดแกลลอน 1 กิโลกรัม' },
      { id: 'ing_soy_sauce', name: 'ซอสปรุงรสฝาเขียว (Soy Sauce)', category: 'ซอส', purchaseUnit: 'ml', purchaseQuantity: 1000, purchasePrice: 48, usableYieldPercent: 100, notes: 'ขวด 1,000 มล.' },
      { id: 'ing_fish_sauce', name: 'น้ำปลาแท้ (Fish Sauce)', category: 'ซอส', purchaseUnit: 'ml', purchaseQuantity: 700, purchasePrice: 38, usableYieldPercent: 100, notes: 'ขวดแก้ว 700 มล.' },
      { id: 'ing_sugar', name: 'น้ำตาลทรายขาว (Sugar)', category: 'ของแห้ง', purchaseUnit: 'kg', purchaseQuantity: 1, purchasePrice: 28, usableYieldPercent: 100, notes: 'ถุง 1 กิโลกรัม' },
      { id: 'ing_lime', name: 'มะนาวแป้นสด (Lime)', category: 'ผักสด', purchaseUnit: 'kg', purchaseQuantity: 1, purchasePrice: 70, usableYieldPercent: 65, notes: 'คั้นน้ำมะนาวสด ได้น้ำ 65%' },
      { id: 'ing_mushrooms', name: 'เห็ดฟาง (Straw Mushrooms)', category: 'ผักสด', purchaseUnit: 'g', purchaseQuantity: 500, purchasePrice: 60, usableYieldPercent: 90, notes: 'ตัดโคนแต่งดินออก' },
      { id: 'ing_tomyum_herbs', name: 'ชุดสมุนไพรต้มยำ ข่า ตะไคร้ ใบมะกรูด', category: 'ผักสด', purchaseUnit: 'g', purchaseQuantity: 300, purchasePrice: 30, usableYieldPercent: 80, notes: 'ล้างหั่นท่อน' },
      { id: 'ing_evaporated_milk', name: 'นมข้นจืดคาร์เนชัน (Evaporated Milk)', category: 'ของแห้ง', purchaseUnit: 'g', purchaseQuantity: 385, purchasePrice: 28, usableYieldPercent: 100, notes: 'กระป๋อง 385 กรัม' },
      { id: 'ing_thai_tea_powder', name: 'ผงชาไทยตรามือ (Thai Tea Powder)', category: 'ของแห้ง', purchaseUnit: 'g', purchaseQuantity: 400, purchasePrice: 75, usableYieldPercent: 100, notes: 'ถุงฟอยล์ 400 กรัม' },
      { id: 'ing_condensed_milk', name: 'นมข้นหวาน (Condensed Milk)', category: 'ของแห้ง', purchaseUnit: 'g', purchaseQuantity: 380, purchasePrice: 27, usableYieldPercent: 100, notes: 'กระป๋อง 380 กรัม' },
      { id: 'ing_pkg_kraft', name: 'กล่องคราฟท์อาหาร 650ml', category: 'แพ็คเกจ', purchaseUnit: 'piece', purchaseQuantity: 100, purchasePrice: 220, usableYieldPercent: 100, notes: 'สำหรับใส่อาหารกลับบ้าน' },
    ];

    const finalIngredients: Ingredient[] = rawIngredientsData.map((d) => {
      const calc = calculateIngredientCost(d.purchaseQuantity, d.purchaseUnit, d.purchasePrice, d.usableYieldPercent);
      return {
        ...d,
        usableQuantity: calc.usableQuantity,
        effectiveCostPerBaseUnit: calc.effectiveCostPerBaseUnit,
        createdAt: now,
        updatedAt: now,
      };
    });

    // 2. Price History for trends
    const samplePriceHistory: IngredientPriceHistory[] = [
      { id: 'ph_demo_1', ingredientId: 'ing_chicken', date: '2026-08-01', purchasePrice: 90, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 90 / 900, reason: 'ราคาตลาดรอบต้นเดือน', createdAt: now },
      { id: 'ph_demo_2', ingredientId: 'ing_chicken', date: '2026-08-10', purchasePrice: 92, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 92 / 900, reason: 'ปรับราคาตามตลาดสด', createdAt: now },
      { id: 'ph_demo_3', ingredientId: 'ing_chicken', date: '2026-08-17', purchasePrice: 95, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 95 / 900, reason: 'ราคาปัจจุบัน (最新)', createdAt: now },
      { id: 'ph_demo_4', ingredientId: 'ing_shrimp', date: '2026-08-05', purchasePrice: 230, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 230 / 750, reason: 'ราคาตลาดมหาชัย', createdAt: now },
      { id: 'ph_demo_5', ingredientId: 'ing_shrimp', date: '2026-08-17', purchasePrice: 240, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 240 / 750, reason: 'ราคากุ้งขยับขึ้นช่วงมรสุม', createdAt: now },
      { id: 'ph_demo_6', ingredientId: 'ing_lime', date: '2026-08-01', purchasePrice: 60, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 60 / 650, reason: 'ต้นเดือน', createdAt: now },
      { id: 'ph_demo_7', ingredientId: 'ing_lime', date: '2026-08-17', purchasePrice: 70, purchaseQuantity: 1, purchaseUnit: 'kg', effectiveCostPerBaseUnit: 70 / 650, reason: 'มะนาวแพงขึ้น', createdAt: now },
    ];

    // 3. Purchases history
    const samplePurchases: IngredientPurchase[] = [
      { id: 'pur_1', ingredientId: 'ing_chicken', supplier: 'ซีพี / ตลาดสดยิ่งเจริญ', purchaseDate: '2026-08-17', quantity: 10, unit: 'kg', totalPrice: 950, unitPrice: 95, notes: 'อกไก่สดคุณภาพดี', createdAt: now },
      { id: 'pur_2', ingredientId: 'ing_shrimp', supplier: 'แพกุ้งมหาชัยเจริญ', purchaseDate: '2026-08-17', quantity: 5, unit: 'kg', totalPrice: 1200, unitPrice: 240, notes: 'กุ้งขาวคัดไซส์ 40 ตัว/โล', createdAt: now },
      { id: 'pur_3', ingredientId: 'ing_rice', supplier: 'ร้านข้าวสารเจริญผล', purchaseDate: '2026-08-15', quantity: 20, unit: 'kg', totalPrice: 760, unitPrice: 38, notes: 'ข้าวหอมมะลิใหม่ 100%', createdAt: now },
      { id: 'pur_4', ingredientId: 'ing_egg', supplier: 'ฟาร์มไข่สมบูรณ์', purchaseDate: '2026-08-16', quantity: 60, unit: 'piece', totalPrice: 250, unitPrice: 4.17, notes: '2 แผง', createdAt: now },
      { id: 'pur_5', ingredientId: 'ing_oil', supplier: 'แม็คโคร แจ้งวัฒนะ', purchaseDate: '2026-08-12', quantity: 12, unit: 'L', totalPrice: 624, unitPrice: 52, notes: 'ยกลัง 12 ขวด', createdAt: now },
    ];

    // 4. Packaging
    const samplePackaging: PackagingItem[] = [
      { id: 'pkg_kraft_box', name: 'กล่องกระดาษคราฟท์เคลือบกันซึม 650ml', unit: 'แพ็ค 100 ชิ้น', price: 220, quantityPerUnit: 100, costPerPiece: 2.20, notes: 'สำหรับอาหารจานเดียว', createdAt: now, updatedAt: now },
      { id: 'pkg_soup_bowl', name: 'ชามกระดาษใส่ต้มยำ 850ml พร้อมฝา PP', unit: 'แพ็ค 50 ชุด', price: 175, quantityPerUnit: 50, costPerPiece: 3.50, notes: 'ทนความร้อนสูง', createdAt: now, updatedAt: now },
      { id: 'pkg_cutlery', name: 'ชุดช้อนส้อมพลาสติกแข็ง + ทิชชู่ห่อแยก', unit: 'แพ็ค 100 ชุด', price: 95, quantityPerUnit: 100, costPerPiece: 0.95, notes: 'เกรดพรีเมียม', createdAt: now, updatedAt: now },
      { id: 'pkg_sauce_cup', name: 'ถ้วยน้ำจิ้ม 2 ออนซ์ พร้อมฝาปิดสนิท', unit: 'แพ็ค 100 ชุด', price: 60, quantityPerUnit: 100, costPerPiece: 0.60, notes: 'สำหรับพริกน้ำปลา / น้ำจิ้ม', createdAt: now, updatedAt: now },
      { id: 'pkg_carrier_bag', name: 'ถุงพลาสติกหูหิ้วใสไฮโซ ขนาด 6x14', unit: 'แพ็ค 100 ใบ', price: 65, quantityPerUnit: 100, costPerPiece: 0.65, notes: 'รับน้ำหนักได้ดี', createdAt: now, updatedAt: now },
      { id: 'pkg_drink_cup', name: 'แก้วพลาสติก PP 22oz + ฝาฮาล์ฟ + หลอดห่อ', unit: 'แพ็ค 50 ชุด', price: 140, quantityPerUnit: 50, costPerPiece: 2.80, notes: 'สำหรับเครื่องดื่มเย็น', createdAt: now, updatedAt: now },
    ];

    // 5. Recipes (Food Recipes + Sauce Recipes + Rice Recipes)
    const sampleRecipes: Recipe[] = [
      // --- 5.1 Sauce Recipes (สูตรซอส) ---
      {
        id: 'rec_sauce_kaprao',
        name: 'ซอสกะเพราเข้มข้นสูตรสำเร็จ (Master Holy Basil Sauce)',
        category: 'ซอสและเครื่องปรุง',
        recipeType: 'SAUCE',
        currentVersionId: 'rv_sauce_kaprao_v1',
        versions: [
          {
            id: 'rv_sauce_kaprao_v1',
            recipeId: 'rec_sauce_kaprao',
            versionNumber: 1,
            versionLabel: 'v1.0 (สูตรปรุงสำเร็จ 1 กก.)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'sk1', ingredientId: 'ing_oyster_sauce', quantityUsed: 500, unit: 'g' },
              { id: 'sk2', ingredientId: 'ing_soy_sauce', quantityUsed: 250, unit: 'ml' },
              { id: 'sk3', ingredientId: 'ing_fish_sauce', quantityUsed: 150, unit: 'ml' },
              { id: 'sk4', ingredientId: 'ing_sugar', quantityUsed: 100, unit: 'g' },
            ],
            preparationLossPercent: 2,
            portionYield: 10,
            preCookWeight: 1000,
            cookedWeight: 980,
            cookingLossWeight: 20,
            notes: 'เคี่ยวน้ำตาลให้ละลายเข้ากัน เก็บในตู้เย็นได้ 1 เดือน',
          },
        ],
        notes: 'ตักใช้ 30-35 กรัม ต่อ 1 จานผัดกะเพรา',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rec_sauce_seafood',
        name: 'น้ำจิ้มซีฟู้ดมะนาวแท้ (Spicy Seafood Lime Sauce)',
        category: 'ซอสและเครื่องปรุง',
        recipeType: 'SAUCE',
        currentVersionId: 'rv_sauce_seafood_v1',
        versions: [
          {
            id: 'rv_sauce_seafood_v1',
            recipeId: 'rec_sauce_seafood',
            versionNumber: 1,
            versionLabel: 'v1.0 (สูตรปั่นสด 500g)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'sf1', ingredientId: 'ing_lime', quantityUsed: 200, unit: 'g', notes: 'น้ำมะนาวแท้คั้นสด' },
              { id: 'sf2', ingredientId: 'ing_fish_sauce', quantityUsed: 150, unit: 'ml' },
              { id: 'sf3', ingredientId: 'ing_garlic', quantityUsed: 50, unit: 'g' },
              { id: 'sf4', ingredientId: 'ing_chili', quantityUsed: 50, unit: 'g' },
              { id: 'sf5', ingredientId: 'ing_sugar', quantityUsed: 50, unit: 'g' },
            ],
            preparationLossPercent: 0,
            portionYield: 10,
            preCookWeight: 500,
            cookedWeight: 500,
            cookingLossWeight: 0,
            notes: 'ปั่นละเอียด พร้อมเสิร์ฟคู่ซีฟู้ด',
          },
        ],
        notes: 'ใช้มะนาวแท้ 100% รสชาติเปรี้ยวเผ็ดกลมกล่อม',
        createdAt: now,
        updatedAt: now,
      },

      // --- 5.2 Rice & Noodle Recipes (สูตรข้าว-เส้น) ---
      {
        id: 'rec_rice_jasmine',
        name: 'ข้าวสวยหอมมะลิหุงสุก (Cooked Jasmine Rice)',
        category: 'ข้าวและเส้น',
        recipeType: 'RICE',
        currentVersionId: 'rv_rice_jasmine_v1',
        versions: [
          {
            id: 'rv_rice_jasmine_v1',
            recipeId: 'rec_rice_jasmine',
            versionNumber: 1,
            versionLabel: 'v1.0 (หุงหม้อใหญ่ 1 กก.)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'rj1', ingredientId: 'ing_rice', quantityUsed: 1000, unit: 'g', notes: 'ข้าวสารหอมมะลิเกรดส่งออก' },
            ],
            preparationLossPercent: 0,
            portionYield: 11, // ~11 portions of 200g
            preCookWeight: 1000,
            cookedWeight: 2250, // Yield ~225%
            cookingLossWeight: 0,
            notes: 'อัตราส่วน ข้าว 1 : น้ำ 1.25 หุงสุกแล้วฟูนุ่ม หอมกรุ่น',
          },
        ],
        notes: 'เสิร์ฟจานละ 200 กรัม ได้ 11 จาน/หม้อ',
        createdAt: now,
        updatedAt: now,
      },

      // --- 5.3 Food Recipes (สูตรอาหารหลัก - รองรับ Sub-Recipe) ---
      {
        id: 'rec_kaprao',
        name: 'ข้าวกะเพราไก่ไข่ดาว (Pad Kra Pao Chicken with Fried Egg)',
        category: 'อาหารจานเดียว',
        recipeType: 'FOOD',
        currentVersionId: 'rv_kaprao_v1',
        versions: [
          {
            id: 'rv_kaprao_v1',
            recipeId: 'rec_kaprao',
            versionNumber: 1,
            versionLabel: 'v1.0 (สูตรมาตรฐานหน้าร้าน)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'i1', ingredientId: 'ing_chicken', quantityUsed: 120, unit: 'g', preparationLossPercent: 0 },
              { id: 'i2', ingredientId: 'ing_basil', quantityUsed: 15, unit: 'g', preparationLossPercent: 0 },
              { id: 'i3', ingredientId: 'ing_garlic', quantityUsed: 10, unit: 'g', preparationLossPercent: 0 },
              { id: 'i4', ingredientId: 'ing_chili', quantityUsed: 10, unit: 'g', preparationLossPercent: 0 },
              { id: 'i5', ingredientId: 'ing_oil', quantityUsed: 15, unit: 'ml', preparationLossPercent: 0 },
              { id: 'i6', ingredientId: 'rec_sauce_kaprao', itemType: 'recipe', quantityUsed: 35, unit: 'g', preparationLossPercent: 0, notes: 'ดึงจากสูตรซอสกะเพราเข้มข้น' },
              { id: 'i9', ingredientId: 'rec_rice_jasmine', itemType: 'recipe', quantityUsed: 200, unit: 'g', preparationLossPercent: 0, notes: 'ดึงจากสูตรข้าวสวยหอมมะลิหุงสุก' },
              { id: 'i10', ingredientId: 'ing_egg', quantityUsed: 1, unit: 'piece', preparationLossPercent: 0, notes: 'ไข่ดาวทอดกรอบ 1 ฟอง' },
            ],
            preparationLossPercent: 2, // 2% cooking heat loss
            portionYield: 1,
            notes: 'สูตรยอดนิยมอันดับ 1 ของร้าน',
          },
        ],
        notes: 'กะเพราไก่สับแท้ ไม่ใส่ถั่วฝักยาว',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rec_tomyum',
        name: 'ต้มยำกุ้งน้ำข้น (Creamy Tom Yum Kung)',
        category: 'ต้มและแกง',
        recipeType: 'FOOD',
        currentVersionId: 'rv_tomyum_v1',
        versions: [
          {
            id: 'rv_tomyum_v1',
            recipeId: 'rec_tomyum',
            versionNumber: 1,
            versionLabel: 'v1.0 (สูตรชามใหญ่ / หม้อไฟ)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 't1', ingredientId: 'ing_shrimp', quantityUsed: 180, unit: 'g', preparationLossPercent: 0, notes: 'กุ้งสดแกะเปลือก 5-6 ตัว' },
              { id: 't2', ingredientId: 'ing_mushrooms', quantityUsed: 100, unit: 'g', preparationLossPercent: 0 },
              { id: 't3', ingredientId: 'ing_tomyum_herbs', quantityUsed: 40, unit: 'g', preparationLossPercent: 0 },
              { id: 't4', ingredientId: 'ing_lime', quantityUsed: 30, unit: 'g', preparationLossPercent: 0 },
              { id: 't5', ingredientId: 'ing_fish_sauce', quantityUsed: 25, unit: 'ml', preparationLossPercent: 0 },
              { id: 't6', ingredientId: 'ing_evaporated_milk', quantityUsed: 60, unit: 'g', preparationLossPercent: 0 },
              { id: 't7', ingredientId: 'ing_chili', quantityUsed: 15, unit: 'g', preparationLossPercent: 0 },
              { id: 't8', ingredientId: 'ing_sugar', quantityUsed: 5, unit: 'g', preparationLossPercent: 0 },
            ],
            preparationLossPercent: 3,
            portionYield: 1,
            notes: 'รสชาติจัดจ้าน หอมสมุนไพรและนมสด',
          },
        ],
        notes: 'เสิร์ฟร้อนพร้อมกุ้งสด',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rec_fried_rice_pork',
        name: 'ข้าวผัดหมูสูตรโบราณ (Pork Fried Rice)',
        category: 'อาหารจานเดียว',
        recipeType: 'FOOD',
        currentVersionId: 'rv_fried_rice_v1',
        versions: [
          {
            id: 'rv_fried_rice_v1',
            recipeId: 'rec_fried_rice_pork',
            versionNumber: 1,
            versionLabel: 'v1.0 (สูตรกระทะเหล็ก)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'f1', ingredientId: 'ing_pork', quantityUsed: 100, unit: 'g' },
              { id: 'f2', ingredientId: 'rec_rice_jasmine', itemType: 'recipe', quantityUsed: 220, unit: 'g', notes: 'ดึงจากสูตรข้าวสวยหอมมะลิ' },
              { id: 'f3', ingredientId: 'ing_egg', quantityUsed: 1, unit: 'piece' },
              { id: 'f4', ingredientId: 'ing_garlic', quantityUsed: 8, unit: 'g' },
              { id: 'f5', ingredientId: 'ing_soy_sauce', quantityUsed: 12, unit: 'ml' },
              { id: 'f6', ingredientId: 'ing_sugar', quantityUsed: 4, unit: 'g' },
              { id: 'f7', ingredientId: 'ing_oil', quantityUsed: 15, unit: 'ml' },
            ],
            preparationLossPercent: 2,
            portionYield: 1,
            notes: 'กลิ่นกระทะหอม',
          },
        ],
        notes: 'เสิร์ฟพร้อมมะนาวและแตงกวา',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rec_thai_tea',
        name: 'ชาไทยเย็นเข้มข้น (Authentic Iced Thai Tea)',
        category: 'เครื่องดื่ม',
        recipeType: 'FOOD',
        currentVersionId: 'rv_thai_tea_v1',
        versions: [
          {
            id: 'rv_thai_tea_v1',
            recipeId: 'rec_thai_tea',
            versionNumber: 1,
            versionLabel: 'v1.0 (แก้ว 22oz)',
            effectiveDate: '2026-08-01',
            ingredients: [
              { id: 'tea1', ingredientId: 'ing_thai_tea_powder', quantityUsed: 25, unit: 'g' },
              { id: 'tea2', ingredientId: 'ing_condensed_milk', quantityUsed: 35, unit: 'g' },
              { id: 'tea3', ingredientId: 'ing_evaporated_milk', quantityUsed: 45, unit: 'g' },
              { id: 'tea4', ingredientId: 'ing_sugar', quantityUsed: 10, unit: 'g' },
            ],
            preparationLossPercent: 0,
            portionYield: 1,
            notes: 'ชงสดแก้วต่อแก้ว',
          },
        ],
        notes: 'ชงสด หวานมันกำลังดี',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 6. Menu items across channels
    const sampleMenuItems: MenuItem[] = [
      {
        id: 'menu_kaprao_dinein',
        name: 'ข้าวกะเพราไก่ไข่ดาว (ทานที่ร้าน)',
        category: 'อาหารจานเดียว',
        recipeId: 'rec_kaprao',
        sellingPrice: 75,
        salesChannel: 'restaurant',
        packagingItems: [],
        targetFoodCostPercent: 32,
        notes: 'เสิร์ฟใส่จานเมลามีนหน้าร้าน',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'menu_kaprao_takeaway',
        name: 'ข้าวกะเพราไก่ไข่ดาว (ใส่กล่องกลับบ้าน)',
        category: 'อาหารจานเดียว',
        recipeId: 'rec_kaprao',
        sellingPrice: 80,
        salesChannel: 'takeaway',
        packagingItems: [
          { packagingId: 'pkg_kraft_box', quantity: 1 },
          { packagingId: 'pkg_cutlery', quantity: 1 },
          { packagingId: 'pkg_sauce_cup', quantity: 1 },
          { packagingId: 'pkg_carrier_bag', quantity: 1 },
        ],
        targetFoodCostPercent: 32,
        notes: 'พร้อมช้อนส้อมและพริกน้ำปลา',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'menu_kaprao_delivery',
        name: 'ข้าวกะเพราไก่ไข่ดาว [Grab / Lineman]',
        category: 'เดลิเวอรี่',
        recipeId: 'rec_kaprao',
        sellingPrice: 110,
        salesChannel: 'delivery',
        packagingItems: [
          { packagingId: 'pkg_kraft_box', quantity: 1 },
          { packagingId: 'pkg_cutlery', quantity: 1 },
          { packagingId: 'pkg_sauce_cup', quantity: 1 },
          { packagingId: 'pkg_carrier_bag', quantity: 1 },
        ],
        targetFoodCostPercent: 30,
        deliveryConfig: {
          platformFeePercent: 30, // 30% GP
          fixedPlatformFee: 0,
          promotionDiscount: 0,
          paymentFeePercent: 3,
        },
        notes: 'บวกราคาชดเชยค่า GP เดลิเวอรี่ 30% + ค่าตัดบัตร 3%',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'menu_tomyum_dinein',
        name: 'ต้มยำกุ้งน้ำข้น (ทานที่ร้าน)',
        category: 'ต้มและแกง',
        recipeId: 'rec_tomyum',
        sellingPrice: 180,
        salesChannel: 'restaurant',
        packagingItems: [],
        targetFoodCostPercent: 35,
        notes: 'เสิร์ฟในหม้อไฟร้อน',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'menu_tomyum_delivery',
        name: 'ต้มยำกุ้งน้ำข้น [Delivery Set]',
        category: 'เดลิเวอรี่',
        recipeId: 'rec_tomyum',
        sellingPrice: 240,
        salesChannel: 'delivery',
        packagingItems: [
          { packagingId: 'pkg_soup_bowl', quantity: 1 },
          { packagingId: 'pkg_cutlery', quantity: 1 },
          { packagingId: 'pkg_carrier_bag', quantity: 1 },
        ],
        targetFoodCostPercent: 33,
        deliveryConfig: {
          platformFeePercent: 30,
          fixedPlatformFee: 0,
          promotionDiscount: 10,
          paymentFeePercent: 3,
        },
        notes: 'ชามทนความร้อนพร้อมถุงหิ้ว',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'menu_thai_tea_takeaway',
        name: 'ชาไทยเย็น 22oz (สั่งกลับบ้าน/เดลิเวอรี่)',
        category: 'เครื่องดื่ม',
        recipeId: 'rec_thai_tea',
        sellingPrice: 45,
        salesChannel: 'takeaway',
        packagingItems: [
          { packagingId: 'pkg_drink_cup', quantity: 1 },
          { packagingId: 'pkg_carrier_bag', quantity: 1 },
        ],
        targetFoodCostPercent: 28,
        notes: 'แก้ว 22oz พร้อมหลอดห่อ',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 7. Waste records
    const sampleWaste: WasteRecord[] = [
      {
        id: 'waste_1',
        date: today,
        ingredientId: 'ing_basil',
        quantity: 100,
        unit: 'g',
        reason: 'Spoilage',
        calculatedCost: 100 * (40 / 425),
        notes: 'ใบกะเพราเฉาในตู้เย็นเนื่องจากความชื้นสูง',
        createdAt: now,
      },
      {
        id: 'waste_2',
        date: '2026-08-16',
        ingredientId: 'ing_lime',
        quantity: 200,
        unit: 'g',
        reason: 'Expired',
        calculatedCost: 200 * (70 / 650),
        notes: 'มะนาวผิวดำและแห้งเกินไป',
        createdAt: now,
      },
      {
        id: 'waste_3',
        date: '2026-08-14',
        ingredientId: 'ing_chicken',
        quantity: 250,
        unit: 'g',
        reason: 'Cooking Error',
        calculatedCost: 250 * (95 / 900),
        notes: 'ผัดไหม้กระทะ ลูกค้าขอยกเลิกจาน',
        createdAt: now,
      },
    ];

    // 8. Settings
    const sampleSettings: AppSettings = {
      restaurantName: "Tony's Thai Kitchen (โทนี่ ครัวไทย)",
      currencySymbol: '฿',
      defaultTargetFoodCostPercent: 32,
      defaultDeliveryGpPercent: 30,
      defaultPaymentFeePercent: 3,
      isDemoMode: true,
      lastBackupDate: now,
    };

    // Put everything into DB
    const tx = db.transaction(
      ['ingredients', 'purchases', 'priceHistory', 'recipes', 'packaging', 'menuItems', 'waste', 'settings'],
      'readwrite'
    );

    await tx.objectStore('ingredients').clear();
    await tx.objectStore('purchases').clear();
    await tx.objectStore('priceHistory').clear();
    await tx.objectStore('recipes').clear();
    await tx.objectStore('packaging').clear();
    await tx.objectStore('menuItems').clear();
    await tx.objectStore('waste').clear();

    for (const item of finalIngredients) await tx.objectStore('ingredients').put(item);
    for (const item of samplePurchases) await tx.objectStore('purchases').put(item);
    for (const item of samplePriceHistory) await tx.objectStore('priceHistory').put(item);
    for (const item of sampleRecipes) await tx.objectStore('recipes').put(item);
    for (const item of samplePackaging) await tx.objectStore('packaging').put(item);
    for (const item of sampleMenuItems) await tx.objectStore('menuItems').put(item);
    for (const item of sampleWaste) await tx.objectStore('waste').put(item);
    await tx.objectStore('settings').put({ key: 'app_config', data: sampleSettings });

    await tx.done;
  },
};

export async function seedSampleDemoData(): Promise<void> {
  return demoDataService.loadDemoData();
}


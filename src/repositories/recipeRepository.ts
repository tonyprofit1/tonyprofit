import { getDatabase } from '../database/db';
import { Recipe, RecipeIngredientItem, RecipeType, RecipeVersion } from '../types';

export const recipeRepository = {
  async getAll(): Promise<Recipe[]> {
    const db = await getDatabase();
    return db.getAll('recipes');
  },

  async getById(id: string): Promise<Recipe | undefined> {
    const db = await getDatabase();
    return db.get('recipes', id);
  },

  async create(data: {
    name: string;
    category: string;
    recipeType?: RecipeType;
    imageUrl?: string;
    imageData?: string;
    imageMimeType?: string;
    instructions?: string;
    notes?: string;
    ingredients: RecipeIngredientItem[];
    preparationLossPercent: number;
    portionYield: number;
    preCookWeight?: number;
    cookedWeight?: number;
    cookingLossWeight?: number;
  }): Promise<Recipe> {
    const db = await getDatabase();
    const recipeId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const versionId = `rv_${Date.now()}_1`;
    const now = new Date().toISOString();

    const initialVersion: RecipeVersion = {
      id: versionId,
      recipeId,
      versionNumber: 1,
      versionLabel: 'v1.0 (ต้นฉบับ)',
      effectiveDate: now.split('T')[0],
      ingredients: data.ingredients,
      preparationLossPercent: data.preparationLossPercent || 0,
      portionYield: Math.max(1, data.portionYield || 1),
      preCookWeight: data.preCookWeight,
      cookedWeight: data.cookedWeight,
      cookingLossWeight: data.cookingLossWeight,
      instructions: data.instructions,
      notes: 'เวอร์ชันเริ่มต้น',
    };

    const recipe: Recipe = {
      id: recipeId,
      name: data.name,
      category: data.category || (data.recipeType === 'SAUCE' ? 'ซอสและเครื่องปรุง' : data.recipeType === 'RICE' ? 'ข้าวและเส้น' : 'อาหารจานหลัก'),
      recipeType: data.recipeType || 'FOOD',
      imageUrl: data.imageUrl,
      imageData: data.imageData,
      imageMimeType: data.imageMimeType,
      instructions: data.instructions,
      currentVersionId: versionId,
      versions: [initialVersion],
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('recipes', recipe);
    return recipe;
  },

  async updateCurrentVersion(
    recipeId: string,
    data: {
      name?: string;
      category?: string;
      recipeType?: RecipeType;
      imageUrl?: string;
      imageData?: string;
      imageMimeType?: string;
      instructions?: string;
      notes?: string;
      ingredients: RecipeIngredientItem[];
      preparationLossPercent: number;
      portionYield: number;
      preCookWeight?: number;
      cookedWeight?: number;
      cookingLossWeight?: number;
    }
  ): Promise<Recipe> {
    const db = await getDatabase();
    const recipe = await db.get('recipes', recipeId);
    if (!recipe) throw new Error(`ไม่พบสูตรอาหาร ID: ${recipeId}`);

    const currentVersionIndex = recipe.versions.findIndex((v) => v.id === recipe.currentVersionId);
    const now = new Date().toISOString();

    if (currentVersionIndex >= 0) {
      recipe.versions[currentVersionIndex] = {
        ...recipe.versions[currentVersionIndex],
        ingredients: data.ingredients,
        preparationLossPercent: data.preparationLossPercent,
        portionYield: Math.max(1, data.portionYield || 1),
        preCookWeight: data.preCookWeight,
        cookedWeight: data.cookedWeight,
        cookingLossWeight: data.cookingLossWeight,
        instructions: data.instructions !== undefined ? data.instructions : recipe.versions[currentVersionIndex].instructions,
      };
    }

    if (data.name) recipe.name = data.name;
    if (data.category) recipe.category = data.category;
    if (data.recipeType) recipe.recipeType = data.recipeType;
    if (data.imageUrl !== undefined) recipe.imageUrl = data.imageUrl;
    if (data.imageData !== undefined) recipe.imageData = data.imageData;
    if (data.imageMimeType !== undefined) recipe.imageMimeType = data.imageMimeType;
    if (data.instructions !== undefined) recipe.instructions = data.instructions;
    if (data.notes !== undefined) recipe.notes = data.notes;
    recipe.updatedAt = now;

    await db.put('recipes', recipe);
    return recipe;
  },

  async createNewVersion(
    recipeId: string,
    data: {
      versionLabel?: string;
      ingredients: RecipeIngredientItem[];
      preparationLossPercent: number;
      portionYield: number;
      preCookWeight?: number;
      cookedWeight?: number;
      cookingLossWeight?: number;
      notes?: string;
    }
  ): Promise<Recipe> {
    const db = await getDatabase();
    const recipe = await db.get('recipes', recipeId);
    if (!recipe) throw new Error(`ไม่พบสูตรอาหาร ID: ${recipeId}`);

    const newVersionNumber = recipe.versions.length + 1;
    const versionId = `rv_${Date.now()}_${newVersionNumber}`;
    const now = new Date().toISOString();

    const newVersion: RecipeVersion = {
      id: versionId,
      recipeId,
      versionNumber: newVersionNumber,
      versionLabel: data.versionLabel || `v${newVersionNumber}.0 (${now.split('T')[0]})`,
      effectiveDate: now.split('T')[0],
      ingredients: data.ingredients,
      preparationLossPercent: data.preparationLossPercent || 0,
      portionYield: Math.max(1, data.portionYield || 1),
      preCookWeight: data.preCookWeight,
      cookedWeight: data.cookedWeight,
      cookingLossWeight: data.cookingLossWeight,
      notes: data.notes || `อัปเดตสูตรใหม่ v${newVersionNumber}`,
    };

    recipe.versions.push(newVersion);
    recipe.currentVersionId = versionId;
    recipe.updatedAt = now;

    await db.put('recipes', recipe);
    return recipe;
  },

  async duplicate(recipeId: string, customName?: string): Promise<Recipe> {
    const db = await getDatabase();
    const source = await db.get('recipes', recipeId);
    if (!source) throw new Error(`ไม่พบสูตรอาหาร ID: ${recipeId}`);

    const activeVersion =
      source.versions.find((v) => v.id === source.currentVersionId) || source.versions[0];
    const newRecipeId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVersionId = `rv_${Date.now()}_1`;
    const now = new Date().toISOString();

    const initialVersion: RecipeVersion = {
      id: newVersionId,
      recipeId: newRecipeId,
      versionNumber: 1,
      versionLabel: 'v1.0 (คัดลอกมา)',
      effectiveDate: now.split('T')[0],
      ingredients: (activeVersion?.ingredients || []).map((i) => ({
        ...i,
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
      preparationLossPercent: activeVersion?.preparationLossPercent || 0,
      portionYield: activeVersion?.portionYield || 1,
      preCookWeight: activeVersion?.preCookWeight,
      cookedWeight: activeVersion?.cookedWeight,
      cookingLossWeight: activeVersion?.cookingLossWeight,
      notes: activeVersion?.notes ? `คัดลอกจาก: ${activeVersion.notes}` : undefined,
    };

    const duplicateRecipe: Recipe = {
      id: newRecipeId,
      name: customName || `${source.name} (สำเนา)`,
      category: source.category,
      recipeType: source.recipeType || 'FOOD',
      currentVersionId: newVersionId,
      versions: [initialVersion],
      notes: source.notes ? `สำเนาจาก ${source.name}` : undefined,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('recipes', duplicateRecipe);
    return duplicateRecipe;
  },

  async switchActiveVersion(recipeId: string, versionId: string): Promise<Recipe> {
    const db = await getDatabase();
    const recipe = await db.get('recipes', recipeId);
    if (!recipe) throw new Error(`ไม่พบสูตรอาหาร ID: ${recipeId}`);

    const exists = recipe.versions.some((v) => v.id === versionId);
    if (!exists) throw new Error(`ไม่พบเวอร์ชันสูตร ID: ${versionId}`);

    recipe.currentVersionId = versionId;
    recipe.updatedAt = new Date().toISOString();
    await db.put('recipes', recipe);
    return recipe;
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('recipes', id);
  },
};

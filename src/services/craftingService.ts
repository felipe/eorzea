/**
 * Crafting Service
 *
 * Provides comprehensive crafting and recipe functionality including:
 * - Recipe lookup and search
 * - Ingredient tracking with full item details
 * - Recursive material tree generation
 * - Complete crafting guides
 * - Crafted item tracking per character
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  Recipe,
  RecipeComplete,
  RecipeIngredient,
  RecipeIngredientWithDetails,
  RecipeSearchOptions,
  RecipeSearchResult,
  CraftedItem,
  CraftingStats,
  CraftTypeName,
  CraftingMaterialTree,
  CraftingGuide,
} from '../types/crafting.js';

export class CraftingService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'game.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get recipe by ID with complete information
   */
  getRecipeById(id: number): RecipeComplete | null {
    const recipe = this.db
      .prepare(
        `
      SELECT
        r.*,
        i.name as result_item_name,
        i.icon as result_item_icon,
        ct.name as craft_type_name,
        rlt.class_job_level,
        rlt.stars,
        rlt.suggestedCraftsmanship as suggested_craftsmanship,
        rlt.suggestedControl as suggested_control,
        rlt.difficulty,
        rlt.quality,
        rlt.durability
      FROM recipes r
      JOIN items i ON r.item_result_id = i.id
      JOIN craft_types ct ON r.craft_type_id = ct.id
      LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
      WHERE r.id = ?
    `
      )
      .get(id) as RecipeComplete | undefined;

    if (!recipe) {
      return null;
    }

    // Get ingredients with details
    recipe.ingredients = this.getRecipeIngredients(id);

    return recipe;
  }

  /**
   * Get recipe ingredients with full item details
   */
  getRecipeIngredients(recipeId: number): RecipeIngredientWithDetails[] {
    const ingredients = this.db
      .prepare(
        `
      SELECT
        ri.*,
        i.name as item_name,
        i.icon as item_icon,
        i.level_item as item_level,
        i.can_be_hq
      FROM recipe_ingredients ri
      JOIN items i ON ri.item_id = i.id
      WHERE ri.recipe_id = ?
      ORDER BY ri.position
    `
      )
      .all(recipeId) as RecipeIngredientWithDetails[];

    // Get sources for each ingredient
    ingredients.forEach((ingredient) => {
      const sources = this.db
        .prepare(
          `
        SELECT source_type, source_name, source_details
        FROM item_sources
        WHERE item_id = ?
        ORDER BY source_type
      `
        )
        .all(ingredient.item_id) as Array<{
        source_type: string;
        source_name: string;
        source_details: string;
      }>;

      ingredient.sources = sources.map((s) => ({
        type: s.source_type,
        name: s.source_name || s.source_type,
        details: s.source_details,
      }));
    });

    return ingredients;
  }

  /**
   * Search recipes with filters
   */
  searchRecipes(options: RecipeSearchOptions): RecipeSearchResult {
    const {
      craft_type,
      result_item_name,
      ingredient_item_name,
      ingredient_item_id,
      level_min,
      level_max,
      stars,
      is_specialist,
      is_expert,
      can_hq,
      craftsmanship_min,
      control_min,
      limit = 50,
      offset = 0,
    } = options;

    let query = `
      SELECT
        r.*,
        i.name as result_item_name,
        i.icon as result_item_icon,
        ct.name as craft_type_name,
        rlt.class_job_level,
        rlt.stars,
        rlt.suggestedCraftsmanship as suggested_craftsmanship,
        rlt.suggestedControl as suggested_control,
        rlt.difficulty,
        rlt.quality,
        rlt.durability
      FROM recipes r
      JOIN items i ON r.item_result_id = i.id
      JOIN craft_types ct ON r.craft_type_id = ct.id
      LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by craft type
    if (craft_type !== undefined) {
      if (typeof craft_type === 'string') {
        query += ` AND ct.name = ?`;
        params.push(craft_type);
      } else {
        query += ` AND r.craft_type_id = ?`;
        params.push(craft_type);
      }
    }

    // Filter by result item name
    if (result_item_name) {
      query += ` AND i.name LIKE ?`;
      params.push(`%${result_item_name}%`);
    }

    // Filter by ingredient name
    if (ingredient_item_name) {
      query += `
        AND r.id IN (
          SELECT ri.recipe_id
          FROM recipe_ingredients ri
          JOIN items i ON ri.item_id = i.id
          WHERE i.name LIKE ?
        )
      `;
      params.push(`%${ingredient_item_name}%`);
    }

    // Filter by ingredient ID
    if (ingredient_item_id !== undefined) {
      query += `
        AND r.id IN (
          SELECT recipe_id
          FROM recipe_ingredients
          WHERE item_id = ?
        )
      `;
      params.push(ingredient_item_id);
    }

    // Filter by level range
    if (level_min !== undefined) {
      query += ` AND rlt.class_job_level >= ?`;
      params.push(level_min);
    }

    if (level_max !== undefined) {
      query += ` AND rlt.class_job_level <= ?`;
      params.push(level_max);
    }

    // Filter by stars
    if (stars !== undefined) {
      query += ` AND rlt.stars = ?`;
      params.push(stars);
    }

    // Filter by specialist
    if (is_specialist !== undefined) {
      query += ` AND r.is_specialist = ?`;
      params.push(is_specialist ? 1 : 0);
    }

    // Filter by expert
    if (is_expert !== undefined) {
      query += ` AND r.is_expert = ?`;
      params.push(is_expert ? 1 : 0);
    }

    // Filter by can HQ
    if (can_hq !== undefined) {
      query += ` AND r.can_hq = ?`;
      params.push(can_hq ? 1 : 0);
    }

    // Filter by craftsmanship requirement
    if (craftsmanship_min !== undefined) {
      query += ` AND rlt.suggestedCraftsmanship >= ?`;
      params.push(craftsmanship_min);
    }

    // Filter by control requirement
    if (control_min !== undefined) {
      query += ` AND rlt.suggestedControl >= ?`;
      params.push(control_min);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*FROM recipes r/s,
      'SELECT COUNT(DISTINCT r.id) as count FROM recipes r'
    );
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY rlt.class_job_level DESC, ct.name ASC, i.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const recipes = this.db.prepare(query).all(...params) as RecipeComplete[];

    return {
      recipes,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Get material tree (recursive for crafted ingredients)
   */
  getMaterialTree(recipeId: number, visitedRecipes: Set<number> = new Set()): CraftingMaterialTree[] {
    // Prevent infinite recursion
    if (visitedRecipes.has(recipeId)) {
      return [];
    }
    visitedRecipes.add(recipeId);

    const ingredients = this.getRecipeIngredients(recipeId);
    const materialTree: CraftingMaterialTree[] = [];

    for (const ingredient of ingredients) {
      const tree: CraftingMaterialTree = {
        item_id: ingredient.item_id,
        item_name: ingredient.item_name || 'Unknown',
        quantity: ingredient.quantity,
        can_be_hq: ingredient.can_be_hq || false,
        sources: ingredient.sources?.map((s) => ({
          type: s.type as 'crafting' | 'gathering' | 'shop' | 'other',
          details: s.name,
        })) || [],
      };

      // Check if this ingredient can be crafted
      const craftingRecipe = this.db
        .prepare(
          `
        SELECT id FROM recipes
        WHERE item_result_id = ?
        LIMIT 1
      `
        )
        .get(ingredient.item_id) as { id: number } | undefined;

      if (craftingRecipe && !visitedRecipes.has(craftingRecipe.id)) {
        // Recursively get sub-materials
        tree.sub_materials = this.getMaterialTree(craftingRecipe.id, new Set(visitedRecipes));
      }

      materialTree.push(tree);
    }

    return materialTree;
  }

  /**
   * Get complete crafting guide for a recipe
   */
  getCraftingGuide(recipeId: number): CraftingGuide | null {
    const recipe = this.getRecipeById(recipeId);
    if (!recipe) {
      return null;
    }

    const materialTree = this.getMaterialTree(recipeId);

    // Flatten material tree to get total materials needed
    const totalMaterials = this.flattenMaterialTree(materialTree);

    // Get intermediate crafts (recipes needed for ingredients)
    const intermediateCrafts = this.getIntermediateCrafts(recipeId);

    // Estimate cost (placeholder - would need market data)
    const estimatedCost = 0;

    // Estimate time (placeholder - based on number of steps)
    const estimatedTime = (intermediateCrafts.length + 1) * 5; // 5 minutes per craft

    return {
      recipe,
      total_materials: totalMaterials,
      intermediate_crafts: intermediateCrafts,
      estimated_cost: estimatedCost,
      estimated_time_minutes: estimatedTime,
      requirements: {
        level: recipe.class_job_level || 1,
        craftsmanship: recipe.suggested_craftsmanship || 0,
        control: recipe.suggested_control || 0,
        specialist: recipe.is_specialist,
        special_item: recipe.item_required_id
          ? this.getItemName(recipe.item_required_id)
          : undefined,
      },
    };
  }

  /**
   * Flatten material tree to get total quantities needed
   */
  private flattenMaterialTree(
    tree: CraftingMaterialTree[],
    multiplier: number = 1
  ): Array<{
    item_id: number;
    item_name: string;
    quantity_needed: number;
    can_be_hq: boolean;
    sources: Array<{
      type: string;
      description: string;
      location?: string;
    }>;
  }> {
    const materials = new Map<
      number,
      {
        item_id: number;
        item_name: string;
        quantity_needed: number;
        can_be_hq: boolean;
        sources: Array<{
          type: string;
          description: string;
          location?: string;
        }>;
      }
    >();

    const processNode = (node: CraftingMaterialTree, mult: number) => {
      if (node.sub_materials && node.sub_materials.length > 0) {
        // Has sub-materials, recurse
        node.sub_materials.forEach((sub) => processNode(sub, mult * node.quantity));
      } else {
        // Leaf node, add to materials
        const existing = materials.get(node.item_id);
        const quantity = node.quantity * mult;

        if (existing) {
          existing.quantity_needed += quantity;
        } else {
          materials.set(node.item_id, {
            item_id: node.item_id,
            item_name: node.item_name,
            quantity_needed: quantity,
            can_be_hq: node.can_be_hq,
            sources: node.sources.map((s) => ({
              type: s.type,
              description: s.details,
            })),
          });
        }
      }
    };

    tree.forEach((node) => processNode(node, multiplier));

    return Array.from(materials.values());
  }

  /**
   * Get all intermediate crafts needed for a recipe
   */
  private getIntermediateCrafts(
    recipeId: number,
    visitedRecipes: Set<number> = new Set()
  ): RecipeComplete[] {
    if (visitedRecipes.has(recipeId)) {
      return [];
    }
    visitedRecipes.add(recipeId);

    const ingredients = this.getRecipeIngredients(recipeId);
    const intermediateCrafts: RecipeComplete[] = [];

    for (const ingredient of ingredients) {
      // Check if this ingredient can be crafted
      const craftingRecipes = this.db
        .prepare(
          `
        SELECT
          r.*,
          i.name as result_item_name,
          i.icon as result_item_icon,
          ct.name as craft_type_name,
          rlt.class_job_level,
          rlt.stars
        FROM recipes r
        JOIN items i ON r.item_result_id = i.id
        JOIN craft_types ct ON r.craft_type_id = ct.id
        LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
        WHERE r.item_result_id = ?
      `
        )
        .all(ingredient.item_id) as RecipeComplete[];

      for (const recipe of craftingRecipes) {
        if (!visitedRecipes.has(recipe.id)) {
          intermediateCrafts.push(recipe);
          // Recurse
          const subCrafts = this.getIntermediateCrafts(recipe.id, new Set(visitedRecipes));
          intermediateCrafts.push(...subCrafts);
        }
      }
    }

    return intermediateCrafts;
  }

  /**
   * Track crafted item for a character
   */
  trackCraftedItem(
    characterId: number,
    recipeId: number,
    itemId: number,
    isHq: boolean = false,
    isCollectible: boolean = false,
    collectibility?: number,
    notes?: string
  ): void {
    const writeDb = new Database(join(process.cwd(), 'data', 'game.db'));

    try {
      writeDb
        .prepare(
          `
        INSERT INTO crafted_items (character_id, recipe_id, item_id, crafted_at, is_hq, is_collectible, collectibility, notes)
        VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?)
        ON CONFLICT(character_id, recipe_id) DO UPDATE SET
          crafted_at = datetime('now'),
          is_hq = excluded.is_hq,
          is_collectible = excluded.is_collectible,
          collectibility = excluded.collectibility,
          notes = excluded.notes
      `
        )
        .run(
          characterId,
          recipeId,
          itemId,
          isHq ? 1 : 0,
          isCollectible ? 1 : 0,
          collectibility,
          notes
        );
    } finally {
      writeDb.close();
    }
  }

  /**
   * Get crafted items for a character
   */
  getCraftedItems(characterId: number, craftType?: CraftTypeName): CraftedItem[] {
    let query = `
      SELECT
        ci.*,
        i.name as item_name,
        r.craft_type_id
      FROM crafted_items ci
      JOIN items i ON ci.item_id = i.id
      JOIN recipes r ON ci.recipe_id = r.id
      WHERE ci.character_id = ?
    `;

    const params: any[] = [characterId];

    if (craftType) {
      query += `
        AND r.craft_type_id = (
          SELECT id FROM craft_types WHERE name = ?
        )
      `;
      params.push(craftType);
    }

    query += ` ORDER BY ci.crafted_at DESC`;

    return this.db.prepare(query).all(...params) as CraftedItem[];
  }

  /**
   * Get crafting statistics for a character
   */
  getCraftingStats(characterId: number, craftType?: CraftTypeName): CraftingStats[] {
    if (craftType) {
      // Get stats for specific craft type
      const result = this.db
        .prepare(
          `
        SELECT
          ? as character_id,
          ct.name as craft_type,
          COUNT(*) as total_recipes,
          COUNT(DISTINCT ci.recipe_id) as recipes_crafted,
          SUM(CASE WHEN ci.is_hq = 1 THEN 1 ELSE 0 END) as hq_items_crafted,
          SUM(CASE WHEN ci.is_collectible = 1 THEN 1 ELSE 0 END) as collectibles_crafted,
          SUM(r.exp_reward) as total_exp_earned
        FROM crafted_items ci
        JOIN recipes r ON ci.recipe_id = r.id
        JOIN craft_types ct ON r.craft_type_id = ct.id
        WHERE ci.character_id = ? AND ct.name = ?
        GROUP BY ct.name
      `
        )
        .get(characterId, characterId, craftType) as any;

      if (!result || result.total_recipes === 0) {
        return [];
      }

      // Calculate progress percentage
      const totalPossibleRecipes = this.getTotalRecipes(craftType);
      const progress = totalPossibleRecipes > 0
        ? (result.recipes_crafted / totalPossibleRecipes) * 100
        : 0;

      return [
        {
          character_id: characterId,
          craft_type: result.craft_type as CraftTypeName,
          total_recipes: result.total_recipes,
          recipes_crafted: result.recipes_crafted,
          hq_items_crafted: result.hq_items_crafted,
          collectibles_crafted: result.collectibles_crafted,
          total_exp_earned: result.total_exp_earned,
          progress_percentage: Math.round(progress * 100) / 100,
        },
      ];
    } else {
      // Get stats for all craft types
      const results = this.db
        .prepare(
          `
        SELECT
          ? as character_id,
          ct.name as craft_type,
          COUNT(*) as total_recipes,
          COUNT(DISTINCT ci.recipe_id) as recipes_crafted,
          SUM(CASE WHEN ci.is_hq = 1 THEN 1 ELSE 0 END) as hq_items_crafted,
          SUM(CASE WHEN ci.is_collectible = 1 THEN 1 ELSE 0 END) as collectibles_crafted,
          SUM(r.exp_reward) as total_exp_earned
        FROM crafted_items ci
        JOIN recipes r ON ci.recipe_id = r.id
        JOIN craft_types ct ON r.craft_type_id = ct.id
        WHERE ci.character_id = ?
        GROUP BY ct.name
      `
        )
        .all(characterId, characterId) as any[];

      return results.map((result) => {
        const totalPossibleRecipes = this.getTotalRecipes(result.craft_type as CraftTypeName);
        const progress = totalPossibleRecipes > 0
          ? (result.recipes_crafted / totalPossibleRecipes) * 100
          : 0;

        return {
          character_id: characterId,
          craft_type: result.craft_type as CraftTypeName,
          total_recipes: result.total_recipes,
          recipes_crafted: result.recipes_crafted,
          hq_items_crafted: result.hq_items_crafted,
          collectibles_crafted: result.collectibles_crafted,
          total_exp_earned: result.total_exp_earned,
          progress_percentage: Math.round(progress * 100) / 100,
        };
      });
    }
  }

  /**
   * Get total number of recipes for a craft type
   */
  private getTotalRecipes(craftType: CraftTypeName): number {
    const result = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM recipes r
      JOIN craft_types ct ON r.craft_type_id = ct.id
      WHERE ct.name = ?
    `
      )
      .get(craftType) as any;

    return result?.count || 0;
  }

  /**
   * Get all craft types
   */
  getCraftTypes(): Array<{ id: number; name: CraftTypeName }> {
    return this.db
      .prepare('SELECT id, name FROM craft_types ORDER BY id')
      .all() as Array<{ id: number; name: CraftTypeName }>;
  }

  /**
   * Get recipes by craft type
   */
  getRecipesByCraftType(craftType: CraftTypeName, limit: number = 100): RecipeComplete[] {
    const recipes = this.db
      .prepare(
        `
      SELECT
        r.*,
        i.name as result_item_name,
        i.icon as result_item_icon,
        ct.name as craft_type_name,
        rlt.class_job_level,
        rlt.stars
      FROM recipes r
      JOIN items i ON r.item_result_id = i.id
      JOIN craft_types ct ON r.craft_type_id = ct.id
      LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
      WHERE ct.name = ?
      ORDER BY rlt.class_job_level DESC, i.name ASC
      LIMIT ?
    `
      )
      .all(craftType, limit) as RecipeComplete[];

    return recipes;
  }

  /**
   * Get item name by ID
   */
  private getItemName(itemId: number): string {
    const result = this.db.prepare('SELECT name FROM items WHERE id = ?').get(itemId) as any;
    return result?.name || 'Unknown';
  }

  /**
   * Get recipes that produce a specific item
   */
  getRecipesByResultItem(itemId: number): RecipeComplete[] {
    const recipes = this.db
      .prepare(
        `
      SELECT
        r.*,
        i.name as result_item_name,
        i.icon as result_item_icon,
        ct.name as craft_type_name,
        rlt.class_job_level,
        rlt.stars
      FROM recipes r
      JOIN items i ON r.item_result_id = i.id
      JOIN craft_types ct ON r.craft_type_id = ct.id
      LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
      WHERE r.item_result_id = ?
      ORDER BY rlt.class_job_level DESC
    `
      )
      .all(itemId) as RecipeComplete[];

    return recipes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let craftingServiceInstance: CraftingService | null = null;

export function getCraftingService(): CraftingService {
  if (!craftingServiceInstance) {
    craftingServiceInstance = new CraftingService();
  }
  return craftingServiceInstance;
}

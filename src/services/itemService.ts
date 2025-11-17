/**
 * Item Service
 *
 * Provides comprehensive item lookup functionality including:
 * - Item search and retrieval
 * - Source tracking (where to get items)
 * - Use tracking (what items are used for)
 * - Cross-references to recipes, quests, gathering
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  Item,
  ItemComplete,
  ItemSearchOptions,
  ItemSearchResult,
  ItemSource,
  ItemUse,
  ItemSourceDetails,
  ItemUseDetails,
} from '../types/item.js';

export class ItemService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'gameData.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get item by ID
   */
  getItemById(id: number): ItemComplete | null {
    const item = this.db
      .prepare(
        `
      SELECT
        i.*,
        uic.name as ui_category_name,
        sc.name as search_category_name
      FROM items i
      LEFT JOIN item_ui_categories uic ON i.item_ui_category_id = uic.id
      LEFT JOIN item_search_categories sc ON i.item_search_category_id = sc.id
      WHERE i.id = ?
    `
      )
      .get(id) as ItemComplete | undefined;

    if (!item) {
      return null;
    }

    // Enrich with sources and uses
    item.sources = this.getItemSources(id);
    item.uses = this.getItemUses(id);

    // Get related recipes
    item.recipes = this.getRecipesThatProduceItem(id);
    item.ingredients_in = this.getRecipesThatUseItem(id);

    // Get gathering points
    item.gathering_points = this.getGatheringPointsForItem(id);

    return item;
  }

  /**
   * Search for items
   */
  searchItems(options: ItemSearchOptions): ItemSearchResult {
    const {
      name,
      level_min,
      level_max,
      rarity,
      category,
      search_category,
      can_be_hq,
      is_tradable,
      is_collectible,
      source_type,
      limit = 50,
      offset = 0,
    } = options;

    let query = `
      SELECT
        i.*,
        uic.name as ui_category_name,
        sc.name as search_category_name
      FROM items i
      LEFT JOIN item_ui_categories uic ON i.item_ui_category_id = uic.id
      LEFT JOIN item_search_categories sc ON i.item_search_category_id = sc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (name) {
      query += ` AND i.name LIKE ?`;
      params.push(`%${name}%`);
    }

    if (level_min !== undefined) {
      query += ` AND i.level_item >= ?`;
      params.push(level_min);
    }

    if (level_max !== undefined) {
      query += ` AND i.level_item <= ?`;
      params.push(level_max);
    }

    if (rarity !== undefined) {
      query += ` AND i.rarity = ?`;
      params.push(rarity);
    }

    if (category !== undefined) {
      query += ` AND i.item_ui_category_id = ?`;
      params.push(category);
    }

    if (search_category !== undefined) {
      query += ` AND i.item_search_category_id = ?`;
      params.push(search_category);
    }

    if (can_be_hq !== undefined) {
      query += ` AND i.can_be_hq = ?`;
      params.push(can_be_hq ? 1 : 0);
    }

    if (is_tradable !== undefined) {
      query += ` AND i.is_untradable = ?`;
      params.push(is_tradable ? 0 : 1);
    }

    if (is_collectible !== undefined) {
      query += ` AND i.is_collectible = ?`;
      params.push(is_collectible ? 1 : 0);
    }

    if (source_type) {
      query += ` AND i.id IN (SELECT item_id FROM item_sources WHERE source_type = ?)`;
      params.push(source_type);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*FROM items i/,
      'SELECT COUNT(*) as count FROM items i'
    );
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY i.level_item DESC, i.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const items = this.db.prepare(query).all(...params) as ItemComplete[];

    // Optionally enrich with sources for search results (can be expensive)
    // Uncomment if needed:
    // items.forEach(item => {
    //   item.sources = this.getItemSources(item.id);
    // });

    return {
      items,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Get all sources for an item (where to obtain it)
   */
  getItemSources(itemId: number): ItemSource[] {
    const sources = this.db
      .prepare(
        `
      SELECT * FROM item_sources
      WHERE item_id = ?
      ORDER BY source_type, source_name
    `
      )
      .all(itemId) as ItemSource[];

    return sources;
  }

  /**
   * Get all uses for an item (what it's used for)
   */
  getItemUses(itemId: number): ItemUse[] {
    const uses = this.db
      .prepare(
        `
      SELECT * FROM item_uses
      WHERE item_id = ?
      ORDER BY use_type, use_name
    `
      )
      .all(itemId) as ItemUse[];

    return uses;
  }

  /**
   * Add a source for an item
   */
  addItemSource(
    itemId: number,
    sourceType: string,
    sourceId?: number,
    sourceName?: string,
    sourceDetails?: ItemSourceDetails
  ): void {
    const insertDb = new Database(join(process.cwd(), 'data', 'gameData.db'));

    insertDb
      .prepare(
        `
      INSERT INTO item_sources (item_id, source_type, source_id, source_name, source_details)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(itemId, sourceType, sourceId, sourceName, JSON.stringify(sourceDetails));

    insertDb.close();
  }

  /**
   * Add a use for an item
   */
  addItemUse(
    itemId: number,
    useType: string,
    useId?: number,
    useName?: string,
    quantityRequired?: number,
    useDetails?: ItemUseDetails
  ): void {
    const insertDb = new Database(join(process.cwd(), 'data', 'gameData.db'));

    insertDb
      .prepare(
        `
      INSERT INTO item_uses (item_id, use_type, use_id, use_name, quantity_required, use_details)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(itemId, useType, useId, useName, quantityRequired, JSON.stringify(useDetails));

    insertDb.close();
  }

  /**
   * Get recipes that produce this item
   */
  private getRecipesThatProduceItem(itemId: number): number[] {
    const recipes = this.db
      .prepare(
        `
      SELECT id FROM recipes
      WHERE item_result_id = ?
    `
      )
      .all(itemId) as Array<{ id: number }>;

    return recipes.map((r) => r.id);
  }

  /**
   * Get recipes that use this item as an ingredient
   */
  private getRecipesThatUseItem(itemId: number): number[] {
    const recipes = this.db
      .prepare(
        `
      SELECT DISTINCT recipe_id FROM recipe_ingredients
      WHERE item_id = ?
    `
      )
      .all(itemId) as Array<{ recipe_id: number }>;

    return recipes.map((r) => r.recipe_id);
  }

  /**
   * Get gathering points where this item can be gathered
   */
  private getGatheringPointsForItem(itemId: number): number[] {
    const points = this.db
      .prepare(
        `
      SELECT DISTINCT gp.gathering_point_id
      FROM gathering_item_points gp
      JOIN gathering_items gi ON gp.gathering_item_id = gi.id
      WHERE gi.item_id = ?
    `
      )
      .all(itemId) as Array<{ gathering_point_id: number }>;

    return points.map((p) => p.gathering_point_id);
  }

  /**
   * Get item by name (exact match)
   */
  getItemByName(name: string): ItemComplete | null {
    const item = this.db
      .prepare(
        `
      SELECT
        i.*,
        uic.name as ui_category_name,
        sc.name as search_category_name
      FROM items i
      LEFT JOIN item_ui_categories uic ON i.item_ui_category_id = uic.id
      LEFT JOIN item_search_categories sc ON i.item_search_category_id = sc.id
      WHERE i.name = ?
      LIMIT 1
    `
      )
      .get(name) as ItemComplete | undefined;

    if (!item) {
      return null;
    }

    // Enrich with sources and uses
    item.sources = this.getItemSources(item.id);
    item.uses = this.getItemUses(item.id);
    item.recipes = this.getRecipesThatProduceItem(item.id);
    item.ingredients_in = this.getRecipesThatUseItem(item.id);
    item.gathering_points = this.getGatheringPointsForItem(item.id);

    return item;
  }

  /**
   * Get all item categories
   */
  getItemCategories(): Array<{ id: number; name: string }> {
    return this.db
      .prepare(
        `
      SELECT id, name FROM item_ui_categories
      ORDER BY order_major, order_minor, name
    `
      )
      .all() as Array<{ id: number; name: string }>;
  }

  /**
   * Get all search categories
   */
  getSearchCategories(): Array<{ id: number; name: string }> {
    return this.db
      .prepare(
        `
      SELECT id, name FROM item_search_categories
      ORDER BY order_major, order_minor, name
    `
      )
      .all() as Array<{ id: number; name: string }>;
  }

  /**
   * Get comprehensive item guide
   * Returns everything about an item in one call
   */
  getItemGuide(itemId: number): {
    item: ItemComplete;
    sources_detailed: Array<{
      type: string;
      name: string;
      description: string;
      details?: any;
    }>;
    uses_detailed: Array<{
      type: string;
      name: string;
      description: string;
      quantity: number;
      details?: any;
    }>;
    recipes: Array<{
      id: number;
      name: string;
      craft_type: string;
      level: number;
    }>;
    used_in_recipes: Array<{
      id: number;
      name: string;
      craft_type: string;
      quantity: number;
    }>;
    gathering_locations: Array<{
      id: number;
      location: string;
      type: string;
      level: number;
    }>;
  } | null {
    const item = this.getItemById(itemId);
    if (!item) {
      return null;
    }

    // Get detailed recipe information
    const recipes =
      item.recipes && item.recipes.length > 0
        ? this.db
            .prepare(
              `
        SELECT
          r.id,
          i.name as name,
          ct.name as craft_type,
          rlt.class_job_level as level
        FROM recipes r
        JOIN items i ON r.item_result_id = i.id
        JOIN craft_types ct ON r.craft_type_id = ct.id
        LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id
        WHERE r.id IN (${item.recipes.map(() => '?').join(',')})
      `
            )
            .all(...item.recipes) as Array<{
            id: number;
            name: string;
            craft_type: string;
            level: number;
          }>
        : [];

    // Get recipes this item is used in
    const usedInRecipes =
      item.ingredients_in && item.ingredients_in.length > 0
        ? this.db
            .prepare(
              `
        SELECT
          r.id,
          i.name as name,
          ct.name as craft_type,
          ri.quantity
        FROM recipes r
        JOIN items i ON r.item_result_id = i.id
        JOIN craft_types ct ON r.craft_type_id = ct.id
        JOIN recipe_ingredients ri ON r.id = ri.recipe_id
        WHERE r.id IN (${item.ingredients_in.map(() => '?').join(',')})
          AND ri.item_id = ?
      `
            )
            .all(...item.ingredients_in, itemId) as Array<{
            id: number;
            name: string;
            craft_type: string;
            quantity: number;
          }>
        : [];

    // Get gathering locations
    const gatheringLocations =
      item.gathering_points && item.gathering_points.length > 0
        ? this.db
            .prepare(
              `
        SELECT
          gp.id,
          COALESCE(pn.name, 'Unknown') as location,
          gt.name as type,
          gpb.gathering_level as level
        FROM gathering_points gp
        JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
        JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
        LEFT JOIN place_names pn ON gp.place_name_id = pn.id
        WHERE gp.id IN (${item.gathering_points.map(() => '?').join(',')})
      `
            )
            .all(...item.gathering_points) as Array<{
            id: number;
            location: string;
            type: string;
            level: number;
          }>
        : [];

    // Format sources
    const sources_detailed =
      item.sources?.map((source) => {
        let details;
        try {
          details = source.source_details ? JSON.parse(source.source_details) : undefined;
        } catch {
          details = undefined;
        }

        return {
          type: source.source_type,
          name: source.source_name || source.source_type,
          description: this.getSourceDescription(source),
          details,
        };
      }) || [];

    // Format uses
    const uses_detailed =
      item.uses?.map((use) => {
        let details;
        try {
          details = use.use_details ? JSON.parse(use.use_details) : undefined;
        } catch {
          details = undefined;
        }

        return {
          type: use.use_type,
          name: use.use_name || use.use_type,
          description: this.getUseDescription(use),
          quantity: use.quantity_required || 1,
          details,
        };
      }) || [];

    return {
      item,
      sources_detailed,
      uses_detailed,
      recipes,
      used_in_recipes: usedInRecipes,
      gathering_locations: gatheringLocations,
    };
  }

  /**
   * Get human-readable source description
   */
  private getSourceDescription(source: ItemSource): string {
    switch (source.source_type) {
      case 'crafting':
        return `Crafted using ${source.source_name || 'a recipe'}`;
      case 'gathering':
        return `Gathered from ${source.source_name || 'a node'}`;
      case 'quest':
        return `Reward from quest: ${source.source_name || 'Unknown'}`;
      case 'shop':
      case 'vendor':
        return `Purchased from ${source.source_name || 'a vendor'}`;
      case 'monster':
        return `Dropped by ${source.source_name || 'enemies'}`;
      case 'dungeon':
      case 'trial':
      case 'raid':
        return `Obtained from ${source.source_name || source.source_type}`;
      default:
        return source.source_name || source.source_type;
    }
  }

  /**
   * Get human-readable use description
   */
  private getUseDescription(use: ItemUse): string {
    switch (use.use_type) {
      case 'recipe_ingredient':
        return `Used in recipe: ${use.use_name || 'Unknown'}`;
      case 'quest_required':
        return `Required for quest: ${use.use_name || 'Unknown'}`;
      case 'leve_required':
        return `Required for levequest: ${use.use_name || 'Unknown'}`;
      case 'gc_supply':
        return `Grand Company supply mission: ${use.use_name || 'Unknown'}`;
      case 'desynth':
        return `Can be desynthesized`;
      default:
        return use.use_name || use.use_type;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let itemServiceInstance: ItemService | null = null;

export function getItemService(): ItemService {
  if (!itemServiceInstance) {
    itemServiceInstance = new ItemService();
  }
  return itemServiceInstance;
}

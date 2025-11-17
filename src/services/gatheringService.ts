/**
 * Gathering Service
 *
 * Provides comprehensive gathering functionality for Mining and Botany including:
 * - Gathering point lookup and search
 * - Time-aware node availability (timed/ephemeral nodes)
 * - Item gathering tracking per character
 * - Location-based gathering point discovery
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  GatheringPoint,
  GatheringPointComplete,
  GatheringItem,
  GatheringItemWithDetails,
  GatheringSearchOptions,
  GatheringSearchResult,
  GatheredItem,
  GatheringStats,
  GatheringTypeName,
  GatheringAvailability,
  GatheringTimeWindow,
} from '../types/gathering.js';

export class GatheringService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'gameData.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get gathering point by ID with complete information
   */
  getGatheringPointById(id: number): GatheringPointComplete | null {
    const point = this.db
      .prepare(
        `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE gp.id = ?
    `
      )
      .get(id) as GatheringPointComplete | undefined;

    if (!point) {
      return null;
    }

    // Get items at this gathering point
    point.items = this.getItemsAtPoint(id);

    return point;
  }

  /**
   * Search gathering points with filters
   */
  searchGatheringPoints(options: GatheringSearchOptions): GatheringSearchResult {
    const {
      gathering_type,
      item_name,
      level_min,
      level_max,
      territory,
      place_name,
      is_limited,
      is_hidden,
      limit = 50,
      offset = 0,
    } = options;

    let query = `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by gathering type
    if (gathering_type !== undefined) {
      if (typeof gathering_type === 'string') {
        query += ` AND gt.name = ?`;
        params.push(gathering_type);
      } else {
        query += ` AND gpb.gathering_type_id = ?`;
        params.push(gathering_type);
      }
    }

    // Filter by level range
    if (level_min !== undefined) {
      query += ` AND gpb.gathering_level >= ?`;
      params.push(level_min);
    }

    if (level_max !== undefined) {
      query += ` AND gpb.gathering_level <= ?`;
      params.push(level_max);
    }

    // Filter by timed/limited nodes
    if (is_limited !== undefined) {
      query += ` AND gpb.is_limited = ?`;
      params.push(is_limited ? 1 : 0);
    }

    // Filter by territory
    if (territory) {
      query += ` AND tt.name LIKE ?`;
      params.push(`%${territory}%`);
    }

    // Filter by place name
    if (place_name) {
      query += ` AND pn.name LIKE ?`;
      params.push(`%${place_name}%`);
    }

    // Filter by item name (requires subquery)
    if (item_name) {
      query += `
        AND gp.id IN (
          SELECT gip.gathering_point_id
          FROM gathering_item_points gip
          JOIN gathering_items gi ON gip.gathering_item_id = gi.id
          JOIN items i ON gi.item_id = i.id
          WHERE i.name LIKE ?
        )
      `;
      params.push(`%${item_name}%`);
    }

    // Filter by hidden items
    if (is_hidden !== undefined) {
      query += `
        AND gp.id IN (
          SELECT gip.gathering_point_id
          FROM gathering_item_points gip
          JOIN gathering_items gi ON gip.gathering_item_id = gi.id
          WHERE gi.is_hidden = ?
        )
      `;
      params.push(is_hidden ? 1 : 0);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*FROM gathering_points gp/s,
      'SELECT COUNT(DISTINCT gp.id) as count FROM gathering_points gp'
    );
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY gpb.gathering_level DESC, pn.name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const points = this.db.prepare(query).all(...params) as GatheringPointComplete[];

    // Enrich with items (can be expensive, so optional)
    points.forEach((point) => {
      point.items = this.getItemsAtPoint(point.id);
    });

    return {
      points,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Get all items available at a gathering point
   */
  getItemsAtPoint(gatheringPointId: number): GatheringItemWithDetails[] {
    const items = this.db
      .prepare(
        `
      SELECT
        gi.*,
        i.name as item_name,
        i.icon as item_icon,
        i.level_item as item_level
      FROM gathering_item_points gip
      JOIN gathering_items gi ON gip.gathering_item_id = gi.id
      JOIN items i ON gi.item_id = i.id
      WHERE gip.gathering_point_id = ?
      ORDER BY gi.is_hidden, i.level_item DESC
    `
      )
      .all(gatheringPointId) as GatheringItemWithDetails[];

    return items;
  }

  /**
   * Get gathering item by ID
   */
  getGatheringItemById(id: number): GatheringItemWithDetails | null {
    const item = this.db
      .prepare(
        `
      SELECT
        gi.*,
        i.name as item_name,
        i.icon as item_icon,
        i.level_item as item_level
      FROM gathering_items gi
      JOIN items i ON gi.item_id = i.id
      WHERE gi.id = ?
    `
      )
      .get(id) as GatheringItemWithDetails | undefined;

    if (!item) {
      return null;
    }

    // Get all gathering points where this item is available
    item.gathering_points = this.getGatheringPointsForItem(item.item_id);

    return item;
  }

  /**
   * Get all gathering points where an item can be gathered
   */
  getGatheringPointsForItem(itemId: number): GatheringPointComplete[] {
    const points = this.db
      .prepare(
        `
      SELECT DISTINCT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      JOIN gathering_item_points gip ON gp.id = gip.gathering_point_id
      JOIN gathering_items gi ON gip.gathering_item_id = gi.id
      WHERE gi.item_id = ?
      ORDER BY gpb.gathering_level DESC
    `
      )
      .all(itemId) as GatheringPointComplete[];

    return points;
  }

  /**
   * Get available nodes (time-aware for timed nodes)
   * Note: Full time/weather support requires additional data not in schema
   * This is a placeholder for future implementation
   */
  getAvailableNodes(currentTime: Date = new Date()): GatheringPointComplete[] {
    // For now, return all non-limited nodes
    // In future, parse time windows from data and filter
    const query = `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE gpb.is_limited = 0
      ORDER BY gpb.gathering_level DESC
      LIMIT 100
    `;

    return this.db.prepare(query).all() as GatheringPointComplete[];
  }

  /**
   * Track gathered item for a character
   */
  trackGatheredItem(
    characterId: number,
    itemId: number,
    gatheringPointId?: number,
    isHq: boolean = false,
    notes?: string
  ): void {
    const writeDb = new Database(join(process.cwd(), 'data', 'gameData.db'));

    try {
      writeDb
        .prepare(
          `
        INSERT INTO gathered_items (character_id, item_id, gathering_point_id, gathered_at, is_hq, notes)
        VALUES (?, ?, ?, datetime('now'), ?, ?)
        ON CONFLICT(character_id, item_id, gathering_point_id) DO UPDATE SET
          gathered_at = datetime('now'),
          is_hq = excluded.is_hq,
          notes = excluded.notes
      `
        )
        .run(characterId, itemId, gatheringPointId, isHq ? 1 : 0, notes);
    } finally {
      writeDb.close();
    }
  }

  /**
   * Get gathered items for a character
   */
  getGatheredItems(characterId: number, gatheringType?: GatheringTypeName): GatheredItem[] {
    let query = `
      SELECT
        gi.*,
        i.name as item_name
      FROM gathered_items gi
      JOIN items i ON gi.item_id = i.id
      WHERE gi.character_id = ?
    `;

    const params: any[] = [characterId];

    if (gatheringType) {
      query += `
        AND gi.gathering_point_id IN (
          SELECT gp.id
          FROM gathering_points gp
          JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
          JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
          WHERE gt.name = ?
        )
      `;
      params.push(gatheringType);
    }

    query += ` ORDER BY gi.gathered_at DESC`;

    return this.db.prepare(query).all(...params) as GatheredItem[];
  }

  /**
   * Get gathering statistics for a character
   */
  getGatheringStats(characterId: number, gatheringType?: GatheringTypeName): GatheringStats[] {
    if (gatheringType) {
      // Get stats for specific gathering type
      const result = this.db
        .prepare(
          `
        SELECT
          ? as character_id,
          gt.name as gathering_type,
          COUNT(*) as total_items,
          COUNT(DISTINCT gi.item_id) as unique_items_gathered,
          COUNT(DISTINCT gi.gathering_point_id) as unique_nodes_visited,
          SUM(CASE WHEN gi.is_hq = 1 THEN 1 ELSE 0 END) as hq_items_gathered
        FROM gathered_items gi
        JOIN gathering_points gp ON gi.gathering_point_id = gp.id
        JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
        JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
        WHERE gi.character_id = ? AND gt.name = ?
        GROUP BY gt.name
      `
        )
        .get(characterId, characterId, gatheringType) as any;

      if (!result || result.total_items === 0) {
        return [];
      }

      // Calculate progress percentage (placeholder - requires total items count)
      const totalPossibleItems = this.getTotalGatherableItems(gatheringType);
      const progress = totalPossibleItems > 0
        ? (result.unique_items_gathered / totalPossibleItems) * 100
        : 0;

      return [
        {
          character_id: characterId,
          gathering_type: result.gathering_type as GatheringTypeName,
          total_items: result.total_items,
          unique_items_gathered: result.unique_items_gathered,
          unique_nodes_visited: result.unique_nodes_visited,
          hq_items_gathered: result.hq_items_gathered,
          progress_percentage: Math.round(progress * 100) / 100,
        },
      ];
    } else {
      // Get stats for all gathering types
      const results = this.db
        .prepare(
          `
        SELECT
          ? as character_id,
          gt.name as gathering_type,
          COUNT(*) as total_items,
          COUNT(DISTINCT gi.item_id) as unique_items_gathered,
          COUNT(DISTINCT gi.gathering_point_id) as unique_nodes_visited,
          SUM(CASE WHEN gi.is_hq = 1 THEN 1 ELSE 0 END) as hq_items_gathered
        FROM gathered_items gi
        JOIN gathering_points gp ON gi.gathering_point_id = gp.id
        JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
        JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
        WHERE gi.character_id = ?
        GROUP BY gt.name
      `
        )
        .all(characterId, characterId) as any[];

      return results.map((result) => {
        const totalPossibleItems = this.getTotalGatherableItems(
          result.gathering_type as GatheringTypeName
        );
        const progress = totalPossibleItems > 0
          ? (result.unique_items_gathered / totalPossibleItems) * 100
          : 0;

        return {
          character_id: characterId,
          gathering_type: result.gathering_type as GatheringTypeName,
          total_items: result.total_items,
          unique_items_gathered: result.unique_items_gathered,
          unique_nodes_visited: result.unique_nodes_visited,
          hq_items_gathered: result.hq_items_gathered,
          progress_percentage: Math.round(progress * 100) / 100,
        };
      });
    }
  }

  /**
   * Get total number of gatherable items for a gathering type
   */
  private getTotalGatherableItems(gatheringType: GatheringTypeName): number {
    const result = this.db
      .prepare(
        `
      SELECT COUNT(DISTINCT gi.item_id) as count
      FROM gathering_items gi
      JOIN gathering_item_points gip ON gi.id = gip.gathering_item_id
      JOIN gathering_points gp ON gip.gathering_point_id = gp.id
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      WHERE gt.name = ?
    `
      )
      .get(gatheringType) as any;

    return result?.count || 0;
  }

  /**
   * Get all gathering types
   */
  getGatheringTypes(): Array<{ id: number; name: GatheringTypeName }> {
    return this.db
      .prepare('SELECT id, name FROM gathering_types ORDER BY id')
      .all() as Array<{ id: number; name: GatheringTypeName }>;
  }

  /**
   * Search gathering points by location name
   */
  searchByLocation(locationName: string, limit: number = 50): GatheringPointComplete[] {
    const points = this.db
      .prepare(
        `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE pn.name LIKE ? OR tt.name LIKE ?
      ORDER BY gpb.gathering_level DESC
      LIMIT ?
    `
      )
      .all(`%${locationName}%`, `%${locationName}%`, limit) as GatheringPointComplete[];

    return points;
  }

  /**
   * Get gathering points by type (Mining, Botany, etc.)
   */
  getPointsByType(
    gatheringType: GatheringTypeName,
    limit: number = 100
  ): GatheringPointComplete[] {
    const points = this.db
      .prepare(
        `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE gt.name = ?
      ORDER BY gpb.gathering_level DESC, pn.name ASC
      LIMIT ?
    `
      )
      .all(gatheringType, limit) as GatheringPointComplete[];

    return points;
  }

  /**
   * Get timed/limited nodes
   */
  getTimedNodes(): GatheringPointComplete[] {
    const points = this.db
      .prepare(
        `
      SELECT
        gp.*,
        gpb.gathering_type_id,
        gpb.gathering_level,
        gpb.is_limited,
        gt.name as gathering_type_name,
        pn.name as place_name,
        tt.name as territory_name
      FROM gathering_points gp
      JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
      JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
      LEFT JOIN place_names pn ON gp.place_name_id = pn.id
      LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id
      WHERE gpb.is_limited = 1
      ORDER BY gpb.gathering_level DESC
    `
      )
      .all() as GatheringPointComplete[];

    return points;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let gatheringServiceInstance: GatheringService | null = null;

export function getGatheringService(): GatheringService {
  if (!gatheringServiceInstance) {
    gatheringServiceInstance = new GatheringService();
  }
  return gatheringServiceInstance;
}

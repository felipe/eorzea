/**
 * Gathering Tracker Service
 *
 * Provides query methods for gathering node data from SQLite database
 * Handles mining, logging, and other gathering activities
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  GatheringNode,
  GatheringItem,
  GatheringSearchOptions,
  GatheringWindow,
  GatheringType,
  GatheringStats,
} from '../types/gathering.js';
import { getEorzeanTime, isInTimeWindow } from '../utils/eorzeanTime.js';

// Default database path (relative to project root)
const DB_PATH = join(process.cwd(), 'data', 'gathering.db');

export class GatheringTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get gathering node by ID
   */
  getNodeById(id: number): GatheringNode | null {
    const row = this.db
      .prepare(
        `
        SELECT 
          n.id, n.name, n.type, n.level, n.location_id,
          n.x, n.y, n.start_hour, n.end_hour,
          n.folklore, n.ephemeral, n.legendary, n.patch,
          n.gathering_point_base_id,
          z.name as zone_name
        FROM gathering_nodes n
        LEFT JOIN gathering_zones z ON n.location_id = z.id
        WHERE n.id = ?
      `
      )
      .get(id) as any;

    return row ? this.mapRowToNode(row) : null;
  }

  /**
   * Get items available at a specific node
   */
  getNodeItems(nodeId: number): GatheringItem[] {
    const rows = this.db
      .prepare(
        `
        SELECT 
          gi.*, i.name as item_name
        FROM gathering_items gi
        LEFT JOIN items i ON gi.item_id = i.id
        WHERE gi.node_id = ?
        ORDER BY gi.slot
      `
      )
      .all(nodeId) as any[];

    return rows.map(this.mapRowToItem);
  }

  /**
   * Search gathering nodes with optional filters
   */
  searchNodes(options: GatheringSearchOptions = {}): GatheringNode[] {
    let query = `
      SELECT 
        n.id, n.name, n.type, n.level, n.location_id,
        n.x, n.y, n.start_hour, n.end_hour,
        n.folklore, n.ephemeral, n.legendary, n.patch,
        n.gathering_point_base_id,
        z.name as zone_name
      FROM gathering_nodes n
      LEFT JOIN gathering_zones z ON n.location_id = z.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by type(s)
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      const placeholders = types.map(() => '?').join(',');
      query += ` AND n.type IN (${placeholders})`;
      params.push(...types);
    }

    // Filter by level range
    if (options.minLevel !== undefined) {
      query += ' AND n.level >= ?';
      params.push(options.minLevel);
    }
    if (options.maxLevel !== undefined) {
      query += ' AND n.level <= ?';
      params.push(options.maxLevel);
    }

    // Filter by location
    if (options.location !== undefined) {
      query += ' AND n.location_id = ?';
      params.push(options.location);
    }

    // Filter by special node types
    if (options.ephemeral === true) {
      query += ' AND n.ephemeral = 1';
    }
    if (options.legendary === true) {
      query += ' AND n.legendary = 1';
    }
    if (options.folklore === true) {
      query += ' AND n.folklore = 1';
    }

    // Add ordering - level and then id
    query += ' ORDER BY n.level ASC, n.id ASC';

    // Add pagination
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    const nodes = rows.map((row) => this.mapRowToNode(row));

    // Filter by availability if requested
    if (options.availableNow) {
      const eorzeaTime = getEorzeanTime();
      return nodes.filter((node) => isInTimeWindow(eorzeaTime.hours, node.startHour, node.endHour));
    }

    return nodes;
  }

  /**
   * Get all nodes available at current Eorzean time
   */
  getAvailableNodes(currentTime: Date = new Date()): GatheringNode[] {
    const eorzeaTime = getEorzeanTime(currentTime);
    const allNodes = this.searchNodes();

    return allNodes.filter((node) =>
      isInTimeWindow(eorzeaTime.hours, node.startHour, node.endHour)
    );
  }

  /**
   * Get timed nodes (not always available)
   */
  getTimedNodes(type?: GatheringType): GatheringNode[] {
    let query = `
      SELECT 
        n.id, n.name, n.type, n.level, n.location_id,
        n.x, n.y, n.start_hour, n.end_hour,
        n.folklore, n.ephemeral, n.legendary, n.patch,
        n.gathering_point_base_id,
        z.name as zone_name
      FROM gathering_nodes n
      LEFT JOIN gathering_zones z ON n.location_id = z.id
      WHERE n.start_hour < 24
    `;
    const params: any[] = [];

    if (type) {
      query += ' AND n.type = ?';
      params.push(type);
    }

    query += ' ORDER BY n.start_hour ASC, n.level ASC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToNode(row));
  }

  /**
   * Get legendary nodes
   */
  getLegendaryNodes(type?: GatheringType): GatheringNode[] {
    return this.searchNodes({ legendary: true, type });
  }

  /**
   * Get ephemeral nodes
   */
  getEphemeralNodes(type?: GatheringType): GatheringNode[] {
    return this.searchNodes({ ephemeral: true, type });
  }

  /**
   * Get node availability window information
   */
  getNodeWindow(node: GatheringNode, from: Date = new Date()): GatheringWindow {
    const eorzeaTime = getEorzeanTime(from);

    // Check if always available (startHour = 24 means always available)
    const isAlwaysAvailable =
      node.startHour === 24 || (node.startHour === node.endHour && node.endHour === 24);
    const isAvailable =
      isAlwaysAvailable || isInTimeWindow(eorzeaTime.hours, node.startHour, node.endHour);

    const window: GatheringWindow = {
      node,
      isAvailableNow: isAvailable,
      items: this.getNodeItems(node._id),
    };

    // Calculate next window for timed nodes
    if (!isAlwaysAvailable && node.startHour < 24) {
      // Node has time restrictions
      if (!isAvailable) {
        // Calculate when it will be available next
        let hoursUntilStart: number;
        if (node.startHour > eorzeaTime.hours) {
          hoursUntilStart = node.startHour - eorzeaTime.hours;
        } else {
          hoursUntilStart = 24 - eorzeaTime.hours + node.startHour;
        }

        const millisUntilStart = hoursUntilStart * 175 * 1000; // 1 Eorzean hour = 175 seconds
        window.nextWindowStart = new Date(from.getTime() + millisUntilStart);
        window.minutesUntilAvailable = Math.ceil(millisUntilStart / 60000);

        // Calculate window end
        const windowDuration =
          node.endHour >= node.startHour
            ? node.endHour - node.startHour
            : 24 - node.startHour + node.endHour;
        const windowDurationMillis = windowDuration * 175 * 1000;
        window.nextWindowEnd = new Date(window.nextWindowStart.getTime() + windowDurationMillis);
      } else {
        // Currently available - calculate when window ends
        let hoursUntilEnd: number;
        if (node.endHour > eorzeaTime.hours) {
          hoursUntilEnd = node.endHour - eorzeaTime.hours;
        } else if (node.endHour < node.startHour && eorzeaTime.hours >= node.startHour) {
          // Window wraps around midnight and we're in the first part
          hoursUntilEnd = 24 - eorzeaTime.hours + node.endHour;
        } else {
          hoursUntilEnd = node.endHour - eorzeaTime.hours;
        }

        const millisUntilEnd = hoursUntilEnd * 175 * 1000;
        window.nextWindowEnd = new Date(from.getTime() + millisUntilEnd);
      }
    }

    return window;
  }

  /**
   * Get statistics about gathering nodes
   */
  getStats(): GatheringStats {
    const totalResult = this.db
      .prepare('SELECT COUNT(*) as count FROM gathering_nodes')
      .get() as any;

    const typeResults = this.db
      .prepare(
        `
        SELECT type, COUNT(*) as count 
        FROM gathering_nodes 
        GROUP BY type
      `
      )
      .all() as any[];

    const specialResults = this.db
      .prepare(
        `
        SELECT 
          SUM(CASE WHEN legendary = 1 THEN 1 ELSE 0 END) as legendary,
          SUM(CASE WHEN ephemeral = 1 THEN 1 ELSE 0 END) as ephemeral,
          SUM(CASE WHEN start_hour < 24 THEN 1 ELSE 0 END) as timed,
          SUM(CASE WHEN start_hour = 24 THEN 1 ELSE 0 END) as always
        FROM gathering_nodes
      `
      )
      .get() as any;

    const nodesByType: Record<GatheringType, number> = {
      mining: 0,
      logging: 0,
      quarrying: 0,
      harvesting: 0,
    };

    typeResults.forEach((row) => {
      if (row.type in nodesByType) {
        nodesByType[row.type as GatheringType] = row.count;
      }
    });

    return {
      totalNodes: totalResult.count,
      nodesByType,
      legendaryNodes: specialResults.legendary || 0,
      ephemeralNodes: specialResults.ephemeral || 0,
      timedNodes: specialResults.timed || 0,
      alwaysAvailable: specialResults.always || 0,
    };
  }

  /**
   * Get zone name by ID
   */
  getZoneName(zoneId: number): string | null {
    const row = this.db.prepare('SELECT name FROM gathering_zones WHERE id = ?').get(zoneId) as any;
    return row ? row.name : null;
  }

  /**
   * Get item name by ID
   */
  getItemName(itemId: number): string | null {
    const row = this.db.prepare('SELECT name FROM items WHERE id = ?').get(itemId) as any;
    return row ? row.name : null;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Map database row to GatheringNode object
   */
  private mapRowToNode(row: any): GatheringNode {
    return {
      _id: row.id,
      name:
        row.name || row.zone_name
          ? `${row.type === 'mining' ? 'Mineral Deposit' : 'Mature Tree'} (${row.zone_name})`
          : undefined,
      type: row.type as GatheringType,
      level: row.level,
      location: row.location_id,
      x: row.x,
      y: row.y,
      startHour: row.start_hour,
      endHour: row.end_hour,
      folklore: row.folklore === 1,
      ephemeral: row.ephemeral === 1,
      legendary: row.legendary === 1,
      patch: row.patch,
      gatheringPointBaseId: row.gathering_point_base_id,
    };
  }

  /**
   * Map database row to GatheringItem object
   */
  private mapRowToItem(row: any): GatheringItem {
    return {
      _id: row.id,
      nodeId: row.node_id,
      itemId: row.item_id,
      name: row.item_name,
      slot: row.slot,
      hidden: row.hidden === 1,
      requiredGathering: row.required_gathering,
      requiredPerception: row.required_perception,
      chance: row.base_chance,
      quantity: {
        min: row.min_quantity || 1,
        max: row.max_quantity || 1,
      },
      isCollectable: row.is_collectable === 1,
      reduceId: row.reduce_id,
    };
  }
}

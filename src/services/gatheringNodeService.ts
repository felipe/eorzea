/**
 * Gathering Node Service
 *
 * Provides gathering functionality with time-aware node availability for Mining and Botany
 * Uses gathering.db which contains time window data for ephemeral and unspoiled nodes
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import {
  getEorzeanTime,
  isInTimeWindow,
  getNextWindowStart,
  getCurrentWindowEnd,
  formatTimeWindow,
} from '../utils/eorzeanTime.js';

interface GatheringNode {
  id: number;
  name: string | null;
  type: string; // 'mining', 'logging', 'quarrying', 'harvesting'
  level: number;
  location_id: number | null;
  location_name?: string;
  x: number | null;
  y: number | null;
  start_hour: number; // 24 means always available
  end_hour: number;
  folklore: boolean;
  ephemeral: boolean;
  legendary: boolean;
  patch: number | null;
  gathering_point_base_id: number | null;
}

interface GatheringNodeWithAvailability extends GatheringNode {
  is_available: boolean;
  next_available?: Date;
  window_closes?: Date;
  time_window_display: string;
}

interface GatheringNodeItem {
  id: number;
  node_id: number;
  item_id: number;
  item_name?: string;
  slot: number;
  hidden: boolean;
  required_gathering: number | null;
  required_perception: number | null;
}

export class GatheringNodeService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'gathering.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Get gathering node by ID
   */
  getNodeById(id: number): GatheringNode | null {
    const node = this.db
      .prepare(
        `
      SELECT 
        gn.*,
        gz.name as location_name
      FROM gathering_nodes gn
      LEFT JOIN gathering_zones gz ON gn.location_id = gz.id
      WHERE gn.id = ?
    `
      )
      .get(id) as GatheringNode | undefined;

    return node || null;
  }

  /**
   * Get items available at a gathering node
   */
  getItemsAtNode(nodeId: number): GatheringNodeItem[] {
    const items = this.db
      .prepare(
        `
      SELECT 
        gi.*,
        i.name as item_name
      FROM gathering_items gi
      LEFT JOIN items i ON gi.item_id = i.id
      WHERE gi.node_id = ?
      ORDER BY gi.slot
    `
      )
      .all(nodeId) as GatheringNodeItem[];

    return items;
  }

  /**
   * Get currently available gathering nodes based on Eorzean time
   */
  getAvailableNodes(
    currentTime: Date = new Date(),
    type?: string
  ): GatheringNodeWithAvailability[] {
    const et = getEorzeanTime(currentTime);
    const currentHour = et.hours;

    let query = `
      SELECT 
        gn.*,
        gz.name as location_name
      FROM gathering_nodes gn
      LEFT JOIN gathering_zones gz ON gn.location_id = gz.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by gathering type if specified
    if (type) {
      query += ` AND gn.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY gn.level DESC, gn.name ASC`;

    const nodes = this.db.prepare(query).all(...params) as GatheringNode[];

    // Filter and enhance with availability info
    return nodes
      .map((node) => {
        const isAvailable = isInTimeWindow(currentHour, node.start_hour, node.end_hour);
        const nodeWithAvailability: GatheringNodeWithAvailability = {
          ...node,
          is_available: isAvailable,
          time_window_display: formatTimeWindow(node.start_hour, node.end_hour),
        };

        if (isAvailable && node.start_hour !== 0 && node.end_hour !== 24) {
          const windowEnd = getCurrentWindowEnd(node.start_hour, node.end_hour, currentTime);
          if (windowEnd) {
            nodeWithAvailability.window_closes = windowEnd;
          }
        } else if (!isAvailable && node.start_hour !== 0) {
          const nextStart = getNextWindowStart(node.start_hour, node.end_hour, currentTime);
          nodeWithAvailability.next_available = nextStart;
        }

        return nodeWithAvailability;
      })
      .filter((node) => node.is_available);
  }

  /**
   * Get all timed nodes (ephemeral, unspoiled, legendary)
   */
  getTimedNodes(type?: string): GatheringNodeWithAvailability[] {
    const currentTime = new Date();
    const et = getEorzeanTime(currentTime);
    const currentHour = et.hours;

    let query = `
      SELECT 
        gn.*,
        gz.name as location_name
      FROM gathering_nodes gn
      LEFT JOIN gathering_zones gz ON gn.location_id = gz.id
      WHERE gn.start_hour < 24
    `;

    const params: any[] = [];

    if (type) {
      query += ` AND gn.type = ?`;
      params.push(type);
    }

    query += ` ORDER BY gn.level DESC, gn.start_hour ASC`;

    const nodes = this.db.prepare(query).all(...params) as GatheringNode[];

    return nodes.map((node) => {
      const isAvailable = isInTimeWindow(currentHour, node.start_hour, node.end_hour);
      const nodeWithAvailability: GatheringNodeWithAvailability = {
        ...node,
        is_available: isAvailable,
        time_window_display: formatTimeWindow(node.start_hour, node.end_hour),
      };

      if (isAvailable) {
        const windowEnd = getCurrentWindowEnd(node.start_hour, node.end_hour, currentTime);
        if (windowEnd) {
          nodeWithAvailability.window_closes = windowEnd;
        }
      } else {
        const nextStart = getNextWindowStart(node.start_hour, node.end_hour, currentTime);
        nodeWithAvailability.next_available = nextStart;
      }

      return nodeWithAvailability;
    });
  }

  /**
   * Search gathering nodes
   */
  searchNodes(options: {
    type?: string;
    minLevel?: number;
    maxLevel?: number;
    location?: string;
    itemName?: string;
    onlyTimed?: boolean;
    limit?: number;
  }): GatheringNode[] {
    const { type, minLevel, maxLevel, location, itemName, onlyTimed, limit = 50 } = options;

    let query = `
      SELECT DISTINCT
        gn.*,
        gz.name as location_name
      FROM gathering_nodes gn
      LEFT JOIN gathering_zones gz ON gn.location_id = gz.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (type) {
      query += ` AND gn.type = ?`;
      params.push(type);
    }

    if (minLevel !== undefined) {
      query += ` AND gn.level >= ?`;
      params.push(minLevel);
    }

    if (maxLevel !== undefined) {
      query += ` AND gn.level <= ?`;
      params.push(maxLevel);
    }

    if (location) {
      query += ` AND gz.name LIKE ?`;
      params.push(`%${location}%`);
    }

    if (onlyTimed) {
      query += ` AND gn.start_hour < 24`;
    }

    if (itemName) {
      query += `
        AND gn.id IN (
          SELECT gi.node_id
          FROM gathering_items gi
          JOIN items i ON gi.item_id = i.id
          WHERE i.name LIKE ?
        )
      `;
      params.push(`%${itemName}%`);
    }

    query += ` ORDER BY gn.level DESC, gn.name ASC LIMIT ?`;
    params.push(limit);

    return this.db.prepare(query).all(...params) as GatheringNode[];
  }

  /**
   * Get nodes by gathering type
   */
  getNodesByType(type: string, limit: number = 100): GatheringNode[] {
    const nodes = this.db
      .prepare(
        `
      SELECT 
        gn.*,
        gz.name as location_name
      FROM gathering_nodes gn
      LEFT JOIN gathering_zones gz ON gn.location_id = gz.id
      WHERE gn.type = ?
      ORDER BY gn.level DESC, gn.name ASC
      LIMIT ?
    `
      )
      .all(type, limit) as GatheringNode[];

    return nodes;
  }

  /**
   * Get gathering statistics
   */
  getStats(): {
    total_nodes: number;
    timed_nodes: number;
    by_type: Record<string, number>;
  } {
    const totalNodes = this.db.prepare('SELECT COUNT(*) as count FROM gathering_nodes').get() as {
      count: number;
    };

    const timedNodes = this.db
      .prepare('SELECT COUNT(*) as count FROM gathering_nodes WHERE start_hour < 24')
      .get() as { count: number };

    const byType = this.db
      .prepare(
        `
      SELECT type, COUNT(*) as count 
      FROM gathering_nodes 
      GROUP BY type
    `
      )
      .all() as Array<{ type: string; count: number }>;

    const byTypeMap: Record<string, number> = {};
    byType.forEach((item) => {
      byTypeMap[item.type] = item.count;
    });

    return {
      total_nodes: totalNodes.count,
      timed_nodes: timedNodes.count,
      by_type: byTypeMap,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let gatheringNodeServiceInstance: GatheringNodeService | null = null;

export function getGatheringNodeService(): GatheringNodeService {
  if (!gatheringNodeServiceInstance) {
    gatheringNodeServiceInstance = new GatheringNodeService();
  }
  return gatheringNodeServiceInstance;
}

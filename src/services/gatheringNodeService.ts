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

/**
 * Represents a gathering node (mining, botany, etc.)
 */
interface GatheringNode {
  /** Unique identifier for the gathering node */
  id: number;
  /** Display name of the node (may be null for unnamed nodes) */
  name: string | null;
  /** Type of gathering: 'mining', 'logging', 'quarrying', or 'harvesting' */
  type: string;
  /** Required level to gather from this node */
  level: number;
  /** Foreign key to gathering_zones table */
  location_id: number | null;
  /** Name of the zone/location where this node is found */
  location_name?: string;
  /** X coordinate on the map */
  x: number | null;
  /** Y coordinate on the map */
  y: number | null;
  /** Starting hour in Eorzean time (0-23, or 24 for always available) */
  start_hour: number;
  /** Ending hour in Eorzean time (0-23, or 24 for always available) */
  end_hour: number;
  /** Whether this node requires folklore books to access */
  folklore: boolean;
  /** Whether this is an ephemeral node (special timed node type) */
  ephemeral: boolean;
  /** Whether this is a legendary node (highest tier timed node) */
  legendary: boolean;
  /** Game patch when this node was added */
  patch: number | null;
  /** Reference ID to the base gathering point data */
  gathering_point_base_id: number | null;
}

/**
 * Gathering node with additional availability information
 */
interface GatheringNodeWithAvailability extends GatheringNode {
  /** Whether the node is currently available based on Eorzean time */
  is_available: boolean;
  /** Real-world Date when the node will next become available (if not currently available) */
  next_available?: Date;
  /** Real-world Date when the current availability window will close (if currently available) */
  window_closes?: Date;
  /** Formatted time window string (e.g., "04:00 - 08:00 ET") */
  time_window_display: string;
}

/**
 * Represents an item that can be gathered from a node
 */
interface GatheringNodeItem {
  /** Unique identifier for this gathering item entry */
  id: number;
  /** Foreign key to the gathering node */
  node_id: number;
  /** Foreign key to the items table */
  item_id: number;
  /** Display name of the item */
  item_name?: string;
  /** Slot number where this item appears in the gathering menu (1-8) */
  slot: number;
  /** Whether this item is hidden (requires special conditions to reveal) */
  hidden: boolean;
  /** Minimum gathering stat required to gather this item */
  required_gathering: number | null;
  /** Minimum perception stat required to gather this item */
  required_perception: number | null;
}

/**
 * Service for managing gathering nodes with time-aware availability tracking.
 *
 * This service uses gathering.db which contains comprehensive data about
 * gathering nodes including time windows for ephemeral and unspoiled nodes.
 *
 * @example
 * ```typescript
 * const service = new GatheringNodeService();
 * const availableNodes = service.getAvailableNodes(new Date(), 'mining');
 * console.log(`Found ${availableNodes.length} available mining nodes`);
 * ```
 */
export class GatheringNodeService {
  private db: Database.Database;

  /**
   * Creates a new GatheringNodeService instance.
   *
   * @param dbPath - Optional path to the gathering database. Defaults to 'data/gathering.db'
   */
  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'gathering.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Retrieves a gathering node by its ID.
   *
   * @param id - The unique identifier of the gathering node
   * @returns The gathering node if found, null otherwise
   *
   * @example
   * ```typescript
   * const node = service.getNodeById(10);
   * if (node) {
   *   console.log(`${node.name} - Level ${node.level} ${node.type}`);
   * }
   * ```
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
   * Retrieves all items that can be gathered from a specific node.
   *
   * @param nodeId - The ID of the gathering node
   * @returns Array of items available at this node, ordered by slot number
   *
   * @example
   * ```typescript
   * const items = service.getItemsAtNode(10);
   * items.forEach(item => {
   *   console.log(`Slot ${item.slot}: ${item.item_name}${item.hidden ? ' (Hidden)' : ''}`);
   * });
   * ```
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
   * Retrieves all gathering nodes that are currently available based on Eorzean time.
   *
   * This method filters nodes by their time windows and returns only those that can
   * be gathered from right now. It also calculates when the current window will close
   * and when unavailable nodes will next become available.
   *
   * @param currentTime - The real-world time to check availability against. Defaults to current time.
   * @param type - Optional filter for gathering type ('mining', 'logging', 'harvesting', 'quarrying')
   * @returns Array of available nodes with additional availability metadata
   *
   * @example
   * ```typescript
   * // Get all currently available mining nodes
   * const availableMiners = service.getAvailableNodes(new Date(), 'mining');
   *
   * availableMiners.forEach(node => {
   *   console.log(`${node.name} - Available for ${node.window_closes ?
   *     `${(node.window_closes.getTime() - Date.now()) / 60000} more minutes` :
   *     'always'}`);
   * });
   * ```
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
   * Retrieves all timed gathering nodes (ephemeral, unspoiled, and legendary).
   *
   * Timed nodes are those that only appear during specific Eorzean time windows.
   * This includes all nodes where start_hour is not 24 (not always available).
   *
   * @param type - Optional filter for gathering type ('mining', 'logging', 'harvesting', 'quarrying')
   * @returns Array of timed nodes with availability status and next window information
   *
   * @example
   * ```typescript
   * const timedMiners = service.getTimedNodes('mining');
   * const currentlyAvailable = timedMiners.filter(n => n.is_available);
   * const upcoming = timedMiners.filter(n => !n.is_available && n.next_available);
   *
   * console.log(`${currentlyAvailable.length} available now`);
   * console.log(`${upcoming.length} coming soon`);
   * ```
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
   * Searches for gathering nodes based on various criteria.
   *
   * Supports filtering by gathering type, level range, location name,
   * item name, and whether the node is timed or always available.
   *
   * @param options - Search criteria
   * @param options.type - Filter by gathering type
   * @param options.minLevel - Minimum required level
   * @param options.maxLevel - Maximum level
   * @param options.location - Location name to search (partial match)
   * @param options.itemName - Item name to search (partial match)
   * @param options.onlyTimed - If true, only return timed nodes
   * @param options.limit - Maximum number of results (default: 50)
   * @returns Array of matching gathering nodes
   *
   * @example
   * ```typescript
   * // Find level 80+ mining nodes in Thanalan
   * const nodes = service.searchNodes({
   *   type: 'mining',
   *   minLevel: 80,
   *   location: 'Thanalan'
   * });
   *
   * // Find nodes that drop a specific item
   * const darkMatterNodes = service.searchNodes({
   *   itemName: 'Dark Matter'
   * });
   * ```
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
   * Retrieves all gathering nodes of a specific type.
   *
   * @param type - The gathering type ('mining', 'logging', 'harvesting', 'quarrying')
   * @param limit - Maximum number of results (default: 100)
   * @returns Array of gathering nodes of the specified type, ordered by level (descending)
   *
   * @example
   * ```typescript
   * const miningNodes = service.getNodesByType('mining', 50);
   * console.log(`Found ${miningNodes.length} mining nodes`);
   * ```
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
   * Retrieves statistics about gathering nodes in the database.
   *
   * @returns Object containing total nodes, timed nodes, and counts by type
   *
   * @example
   * ```typescript
   * const stats = service.getStats();
   * console.log(`Total nodes: ${stats.total_nodes}`);
   * console.log(`Timed nodes: ${stats.timed_nodes}`);
   * console.log(`Mining nodes: ${stats.by_type.mining}`);
   * ```
   */
  getStats(): {
    /** Total number of gathering nodes in the database */
    total_nodes: number;
    /** Number of timed/limited nodes (not always available) */
    timed_nodes: number;
    /** Count of nodes grouped by gathering type */
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
   * Closes the database connection.
   *
   * Should be called when the service is no longer needed to free up resources.
   *
   * @example
   * ```typescript
   * const service = new GatheringNodeService();
   * // ... use service ...
   * service.close();
   * ```
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance for shared use across the application
let gatheringNodeServiceInstance: GatheringNodeService | null = null;

/**
 * Returns a singleton instance of GatheringNodeService.
 *
 * This function ensures only one instance of the service is created and reused
 * throughout the application lifecycle, which is more efficient for database connections.
 *
 * @returns The singleton GatheringNodeService instance
 *
 * @example
 * ```typescript
 * import { getGatheringNodeService } from './services/gatheringNodeService.js';
 *
 * const service = getGatheringNodeService();
 * const nodes = service.getAvailableNodes();
 * ```
 */
export function getGatheringNodeService(): GatheringNodeService {
  if (!gatheringNodeServiceInstance) {
    gatheringNodeServiceInstance = new GatheringNodeService();
  }
  return gatheringNodeServiceInstance;
}

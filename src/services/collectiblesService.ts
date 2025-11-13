/**
 * Collectibles Service
 *
 * Provides comprehensive collectibles functionality including:
 * - Mount lookup and tracking
 * - Companion/minion lookup and tracking
 * - Orchestrion roll lookup and tracking
 * - Collection statistics per character
 * - Source information for obtaining collectibles
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type {
  Mount,
  MountComplete,
  MountSearchOptions,
  MountSearchResult,
  Companion,
  CompanionComplete,
  CompanionSearchOptions,
  CompanionSearchResult,
  OrchestrionRoll,
  OrchestrionComplete,
  OrchestrionSearchOptions,
  OrchestrionSearchResult,
  ObtainedMount,
  ObtainedCompanion,
  ObtainedOrchestrion,
  CollectionStats,
  CollectibleGuide,
  CollectibleType,
  CollectibleSource,
  CollectibleSourceType,
} from '../types/collectibles.js';

export class CollectiblesService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(process.cwd(), 'data', 'game.db');
    this.db = new Database(path, { readonly: true });
    this.db.pragma('foreign_keys = ON');
  }

  // ============================================================================
  // MOUNTS
  // ============================================================================

  /**
   * Get mount by ID
   */
  getMountById(id: number, characterId?: number): MountComplete | null {
    const mount = this.db
      .prepare(
        `
      SELECT * FROM mounts
      WHERE id = ?
    `
      )
      .get(id) as MountComplete | undefined;

    if (!mount) {
      return null;
    }

    // Get sources
    mount.sources = this.getCollectibleSources('mount', id);

    // Check if obtained by character
    if (characterId !== undefined) {
      const obtained = this.db
        .prepare(
          `
        SELECT obtained_at, obtained_from
        FROM obtained_mounts
        WHERE character_id = ? AND mount_id = ?
      `
        )
        .get(characterId, id) as { obtained_at: string; obtained_from: string } | undefined;

      mount.obtained = !!obtained;
      mount.obtained_at = obtained?.obtained_at;
      mount.obtained_from = obtained?.obtained_from;
    }

    return mount;
  }

  /**
   * Search mounts with filters
   */
  searchMounts(options: MountSearchOptions, characterId?: number): MountSearchResult {
    const {
      name,
      is_flying,
      is_aquatic,
      multi_seat,
      source_type,
      obtained,
      limit = 50,
      offset = 0,
    } = options;

    let query = `
      SELECT m.*
      FROM mounts m
      WHERE 1=1
    `;

    const params: any[] = [];

    if (name) {
      query += ` AND (m.singular LIKE ? OR m.name LIKE ?)`;
      params.push(`%${name}%`, `%${name}%`);
    }

    if (is_flying !== undefined) {
      query += ` AND m.is_flying = ?`;
      params.push(is_flying ? 1 : 0);
    }

    if (is_aquatic !== undefined) {
      query += ` AND m.is_aquatic = ?`;
      params.push(is_aquatic ? 1 : 0);
    }

    if (multi_seat !== undefined) {
      query += ` AND m.is_seats > 1`;
    }

    if (source_type) {
      query += `
        AND m.id IN (
          SELECT collectible_id
          FROM collectible_sources
          WHERE collectible_type = 'mount' AND source_type = ?
        )
      `;
      params.push(source_type);
    }

    // Filter by obtained status
    if (obtained !== undefined && characterId !== undefined) {
      if (obtained) {
        query += `
          AND m.id IN (
            SELECT mount_id
            FROM obtained_mounts
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      } else {
        query += `
          AND m.id NOT IN (
            SELECT mount_id
            FROM obtained_mounts
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      }
    }

    // Get total count
    const countQuery = query.replace(/SELECT m\.\* FROM/, 'SELECT COUNT(*) as count FROM');
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY m.order_major, m.order_minor, m.singular LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const mounts = this.db.prepare(query).all(...params) as MountComplete[];

    // Enrich with sources and obtained status
    mounts.forEach((mount) => {
      mount.sources = this.getCollectibleSources('mount', mount.id);

      if (characterId !== undefined) {
        const obtained = this.db
          .prepare(
            `
          SELECT obtained_at, obtained_from
          FROM obtained_mounts
          WHERE character_id = ? AND mount_id = ?
        `
          )
          .get(characterId, mount.id) as { obtained_at: string; obtained_from: string } | undefined;

        mount.obtained = !!obtained;
        mount.obtained_at = obtained?.obtained_at;
        mount.obtained_from = obtained?.obtained_from;
      }
    });

    return {
      mounts,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Track obtained mount for a character
   */
  trackObtainedMount(
    characterId: number,
    mountId: number,
    obtainedFrom?: string,
    notes?: string
  ): void {
    const writeDb = new Database(join(process.cwd(), 'data', 'game.db'));

    try {
      writeDb
        .prepare(
          `
        INSERT INTO obtained_mounts (character_id, mount_id, obtained_at, obtained_from, notes)
        VALUES (?, ?, datetime('now'), ?, ?)
        ON CONFLICT(character_id, mount_id) DO UPDATE SET
          obtained_at = datetime('now'),
          obtained_from = excluded.obtained_from,
          notes = excluded.notes
      `
        )
        .run(characterId, mountId, obtainedFrom, notes);
    } finally {
      writeDb.close();
    }
  }

  // ============================================================================
  // COMPANIONS (MINIONS)
  // ============================================================================

  /**
   * Get companion by ID
   */
  getCompanionById(id: number, characterId?: number): CompanionComplete | null {
    const companion = this.db
      .prepare(
        `
      SELECT * FROM companions
      WHERE id = ?
    `
      )
      .get(id) as CompanionComplete | undefined;

    if (!companion) {
      return null;
    }

    // Get sources
    companion.sources = this.getCollectibleSources('companion', id);

    // Check if obtained by character
    if (characterId !== undefined) {
      const obtained = this.db
        .prepare(
          `
        SELECT obtained_at, obtained_from
        FROM obtained_companions
        WHERE character_id = ? AND companion_id = ?
      `
        )
        .get(characterId, id) as { obtained_at: string; obtained_from: string } | undefined;

      companion.obtained = !!obtained;
      companion.obtained_at = obtained?.obtained_at;
      companion.obtained_from = obtained?.obtained_from;
    }

    return companion;
  }

  /**
   * Search companions with filters
   */
  searchCompanions(options: CompanionSearchOptions, characterId?: number): CompanionSearchResult {
    const { name, is_battle, source_type, obtained, limit = 50, offset = 0 } = options;

    let query = `
      SELECT c.*
      FROM companions c
      WHERE 1=1
    `;

    const params: any[] = [];

    if (name) {
      query += ` AND (c.singular LIKE ? OR c.name LIKE ?)`;
      params.push(`%${name}%`, `%${name}%`);
    }

    if (is_battle !== undefined) {
      query += ` AND c.is_battle = ?`;
      params.push(is_battle ? 1 : 0);
    }

    if (source_type) {
      query += `
        AND c.id IN (
          SELECT collectible_id
          FROM collectible_sources
          WHERE collectible_type = 'companion' AND source_type = ?
        )
      `;
      params.push(source_type);
    }

    // Filter by obtained status
    if (obtained !== undefined && characterId !== undefined) {
      if (obtained) {
        query += `
          AND c.id IN (
            SELECT companion_id
            FROM obtained_companions
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      } else {
        query += `
          AND c.id NOT IN (
            SELECT companion_id
            FROM obtained_companions
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      }
    }

    // Get total count
    const countQuery = query.replace(/SELECT c\.\* FROM/, 'SELECT COUNT(*) as count FROM');
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY c.order_major, c.order_minor, c.singular LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const companions = this.db.prepare(query).all(...params) as CompanionComplete[];

    // Enrich with sources and obtained status
    companions.forEach((companion) => {
      companion.sources = this.getCollectibleSources('companion', companion.id);

      if (characterId !== undefined) {
        const obtained = this.db
          .prepare(
            `
          SELECT obtained_at, obtained_from
          FROM obtained_companions
          WHERE character_id = ? AND companion_id = ?
        `
          )
          .get(characterId, companion.id) as
          | { obtained_at: string; obtained_from: string }
          | undefined;

        companion.obtained = !!obtained;
        companion.obtained_at = obtained?.obtained_at;
        companion.obtained_from = obtained?.obtained_from;
      }
    });

    return {
      companions,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Track obtained companion for a character
   */
  trackObtainedCompanion(
    characterId: number,
    companionId: number,
    obtainedFrom?: string,
    notes?: string
  ): void {
    const writeDb = new Database(join(process.cwd(), 'data', 'game.db'));

    try {
      writeDb
        .prepare(
          `
        INSERT INTO obtained_companions (character_id, companion_id, obtained_at, obtained_from, notes)
        VALUES (?, ?, datetime('now'), ?, ?)
        ON CONFLICT(character_id, companion_id) DO UPDATE SET
          obtained_at = datetime('now'),
          obtained_from = excluded.obtained_from,
          notes = excluded.notes
      `
        )
        .run(characterId, companionId, obtainedFrom, notes);
    } finally {
      writeDb.close();
    }
  }

  // ============================================================================
  // ORCHESTRION ROLLS
  // ============================================================================

  /**
   * Get orchestrion roll by ID
   */
  getOrchestrionById(id: number, characterId?: number): OrchestrionComplete | null {
    const orchestrion = this.db
      .prepare(
        `
      SELECT
        o.*,
        oc.name as category_name
      FROM orchestrion_rolls o
      LEFT JOIN orchestrion_categories oc ON o.orchestrion_category_id = oc.id
      WHERE o.id = ?
    `
      )
      .get(id) as OrchestrionComplete | undefined;

    if (!orchestrion) {
      return null;
    }

    // Get sources
    orchestrion.sources = this.getCollectibleSources('orchestrion', id);

    // Check if obtained by character
    if (characterId !== undefined) {
      const obtained = this.db
        .prepare(
          `
        SELECT obtained_at, obtained_from
        FROM obtained_orchestrion
        WHERE character_id = ? AND orchestrion_id = ?
      `
        )
        .get(characterId, id) as { obtained_at: string; obtained_from: string } | undefined;

      orchestrion.obtained = !!obtained;
      orchestrion.obtained_at = obtained?.obtained_at;
      orchestrion.obtained_from = obtained?.obtained_from;
    }

    return orchestrion;
  }

  /**
   * Search orchestrion rolls with filters
   */
  searchOrchestrion(
    options: OrchestrionSearchOptions,
    characterId?: number
  ): OrchestrionSearchResult {
    const { name, category_id, category_name, source_type, obtained, limit = 50, offset = 0 } = options;

    let query = `
      SELECT
        o.*,
        oc.name as category_name
      FROM orchestrion_rolls o
      LEFT JOIN orchestrion_categories oc ON o.orchestrion_category_id = oc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (name) {
      query += ` AND o.name LIKE ?`;
      params.push(`%${name}%`);
    }

    if (category_id !== undefined) {
      query += ` AND o.orchestrion_category_id = ?`;
      params.push(category_id);
    }

    if (category_name) {
      query += ` AND oc.name LIKE ?`;
      params.push(`%${category_name}%`);
    }

    if (source_type) {
      query += `
        AND o.id IN (
          SELECT collectible_id
          FROM collectible_sources
          WHERE collectible_type = 'orchestrion' AND source_type = ?
        )
      `;
      params.push(source_type);
    }

    // Filter by obtained status
    if (obtained !== undefined && characterId !== undefined) {
      if (obtained) {
        query += `
          AND o.id IN (
            SELECT orchestrion_id
            FROM obtained_orchestrion
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      } else {
        query += `
          AND o.id NOT IN (
            SELECT orchestrion_id
            FROM obtained_orchestrion
            WHERE character_id = ?
          )
        `;
        params.push(characterId);
      }
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT.*FROM orchestrion_rolls o/s,
      'SELECT COUNT(*) as count FROM orchestrion_rolls o'
    );
    const { count } = this.db.prepare(countQuery).get(...params) as { count: number };

    // Add ordering and pagination
    query += ` ORDER BY o.order_major, o.order_minor, o.name LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orchestrion_rolls = this.db.prepare(query).all(...params) as OrchestrionComplete[];

    // Enrich with sources and obtained status
    orchestrion_rolls.forEach((roll) => {
      roll.sources = this.getCollectibleSources('orchestrion', roll.id);

      if (characterId !== undefined) {
        const obtained = this.db
          .prepare(
            `
          SELECT obtained_at, obtained_from
          FROM obtained_orchestrion
          WHERE character_id = ? AND orchestrion_id = ?
        `
          )
          .get(characterId, roll.id) as { obtained_at: string; obtained_from: string } | undefined;

        roll.obtained = !!obtained;
        roll.obtained_at = obtained?.obtained_at;
        roll.obtained_from = obtained?.obtained_from;
      }
    });

    return {
      orchestrion_rolls,
      total: count,
      limit,
      offset,
    };
  }

  /**
   * Track obtained orchestrion roll for a character
   */
  trackObtainedOrchestrion(
    characterId: number,
    orchestrionId: number,
    obtainedFrom?: string,
    notes?: string
  ): void {
    const writeDb = new Database(join(process.cwd(), 'data', 'game.db'));

    try {
      writeDb
        .prepare(
          `
        INSERT INTO obtained_orchestrion (character_id, orchestrion_id, obtained_at, obtained_from, notes)
        VALUES (?, ?, datetime('now'), ?, ?)
        ON CONFLICT(character_id, orchestrion_id) DO UPDATE SET
          obtained_at = datetime('now'),
          obtained_from = excluded.obtained_from,
          notes = excluded.notes
      `
        )
        .run(characterId, orchestrionId, obtainedFrom, notes);
    } finally {
      writeDb.close();
    }
  }

  // ============================================================================
  // COLLECTION STATS
  // ============================================================================

  /**
   * Get collection statistics for a character
   */
  getCollectionStats(characterId: number): CollectionStats {
    // Mount stats
    const mountStats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        (SELECT COUNT(*) FROM obtained_mounts WHERE character_id = ?) as obtained,
        SUM(CASE WHEN is_flying = 1 THEN 1 ELSE 0 END) as total_flying,
        SUM(CASE WHEN is_seats > 1 THEN 1 ELSE 0 END) as total_multi_seat
      FROM mounts
    `
      )
      .get(characterId) as any;

    const mountsFlyingObtained = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM obtained_mounts om
      JOIN mounts m ON om.mount_id = m.id
      WHERE om.character_id = ? AND m.is_flying = 1
    `
      )
      .get(characterId) as any;

    const mountsMultiSeatObtained = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM obtained_mounts om
      JOIN mounts m ON om.mount_id = m.id
      WHERE om.character_id = ? AND m.is_seats > 1
    `
      )
      .get(characterId) as any;

    // Companion stats
    const companionStats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        (SELECT COUNT(*) FROM obtained_companions WHERE character_id = ?) as obtained,
        SUM(CASE WHEN is_battle = 1 THEN 1 ELSE 0 END) as total_battle
      FROM companions
    `
      )
      .get(characterId) as any;

    const companionsBattleObtained = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM obtained_companions oc
      JOIN companions c ON oc.companion_id = c.id
      WHERE oc.character_id = ? AND c.is_battle = 1
    `
      )
      .get(characterId) as any;

    // Orchestrion stats
    const orchestrionStats = this.db
      .prepare(
        `
      SELECT
        COUNT(*) as total,
        (SELECT COUNT(*) FROM obtained_orchestrion WHERE character_id = ?) as obtained
      FROM orchestrion_rolls
    `
      )
      .get(characterId) as any;

    // Orchestrion by category
    const orchestrionByCategory = this.db
      .prepare(
        `
      SELECT
        oc.name as category,
        COUNT(DISTINCT oo.orchestrion_id) as count
      FROM orchestrion_categories oc
      LEFT JOIN orchestrion_rolls o ON oc.id = o.orchestrion_category_id
      LEFT JOIN obtained_orchestrion oo ON o.id = oo.orchestrion_id AND oo.character_id = ?
      GROUP BY oc.name
    `
      )
      .all(characterId) as any[];

    const byCategoryMap: Record<string, number> = {};
    orchestrionByCategory.forEach((row) => {
      byCategoryMap[row.category] = row.count || 0;
    });

    return {
      character_id: characterId,
      mounts: {
        total: mountStats.total,
        obtained: mountStats.obtained,
        flying: mountsFlyingObtained.count,
        multi_seat: mountsMultiSeatObtained.count,
        progress_percentage:
          mountStats.total > 0
            ? Math.round((mountStats.obtained / mountStats.total) * 10000) / 100
            : 0,
      },
      companions: {
        total: companionStats.total,
        obtained: companionStats.obtained,
        battle: companionsBattleObtained.count,
        progress_percentage:
          companionStats.total > 0
            ? Math.round((companionStats.obtained / companionStats.total) * 10000) / 100
            : 0,
      },
      orchestrion: {
        total: orchestrionStats.total,
        obtained: orchestrionStats.obtained,
        by_category: byCategoryMap,
        progress_percentage:
          orchestrionStats.total > 0
            ? Math.round((orchestrionStats.obtained / orchestrionStats.total) * 10000) / 100
            : 0,
      },
    };
  }

  // ============================================================================
  // COLLECTIBLE GUIDES
  // ============================================================================

  /**
   * Get collectible guide (how to obtain)
   */
  getCollectibleGuide(
    collectibleType: CollectibleType,
    collectibleId: number,
    characterId?: number
  ): CollectibleGuide | null {
    let collectible: any;
    let name: string;
    let description: string | undefined;
    let icon: number | undefined;

    // Get collectible details based on type
    if (collectibleType === 'mount') {
      collectible = this.getMountById(collectibleId, characterId);
      name = collectible?.singular || collectible?.name || 'Unknown Mount';
      description = collectible?.description;
      icon = collectible?.icon;
    } else if (collectibleType === 'companion') {
      collectible = this.getCompanionById(collectibleId, characterId);
      name = collectible?.singular || collectible?.name || 'Unknown Companion';
      description = collectible?.description;
      icon = collectible?.icon;
    } else if (collectibleType === 'orchestrion') {
      collectible = this.getOrchestrionById(collectibleId, characterId);
      name = collectible?.name || 'Unknown Orchestrion Roll';
      description = collectible?.description;
      icon = collectible?.icon;
    } else {
      return null;
    }

    if (!collectible) {
      return null;
    }

    // Get sources with details
    const sources = collectible.sources?.map((source: CollectibleSource) => {
      let details: any = {};
      try {
        details = source.source_details ? JSON.parse(source.source_details) : {};
      } catch {
        details = {};
      }

      return {
        type: source.source_type,
        name: source.source_name || source.source_type,
        description: this.getSourceDescription(source.source_type, source.source_name, details),
        requirements: details.requirements,
        location: details.location,
        difficulty: details.difficulty,
        estimated_time: details.estimated_time,
        drop_rate: details.drop_rate,
        cost: details.cost
          ? {
              amount: details.cost,
              currency: details.currency || 'Gil',
            }
          : undefined,
      };
    }) || [];

    return {
      collectible_type: collectibleType,
      collectible_id: collectibleId,
      name,
      description,
      icon,
      sources,
      obtained: collectible.obtained || false,
      tips: this.getCollectibleTips(collectibleType, sources),
    };
  }

  /**
   * Get human-readable source description
   */
  private getSourceDescription(
    sourceType: CollectibleSourceType,
    sourceName?: string,
    details?: any
  ): string {
    const name = sourceName || sourceType;

    switch (sourceType) {
      case 'quest':
        return `Complete the quest: ${name}`;
      case 'achievement':
        return `Unlock achievement: ${name}`;
      case 'shop':
      case 'vendor':
        return `Purchase from ${name}${details?.cost ? ` for ${details.cost} ${details.currency || 'Gil'}` : ''}`;
      case 'dungeon':
      case 'trial':
      case 'raid':
        return `Obtain from ${name}${details?.drop_rate ? ` (${details.drop_rate}% drop rate)` : ''}`;
      case 'crafting':
        return `Craft using ${name}`;
      case 'gathering':
        return `Gather from ${name}`;
      case 'event':
        return `Limited-time event: ${name}`;
      case 'mogstation':
        return `Available on Mog Station`;
      case 'pvp':
        return `PvP reward: ${name}`;
      case 'treasure_map':
        return `Obtain from treasure map: ${name}`;
      case 'fate':
        return `Complete FATE: ${name}`;
      case 'hunt':
        return `Hunt reward: ${name}`;
      case 'deep_dungeon':
        return `Deep dungeon reward: ${name}`;
      case 'eureka':
        return `Eureka reward: ${name}`;
      case 'bozja':
        return `Bozja/Zadnor reward: ${name}`;
      default:
        return name;
    }
  }

  /**
   * Get tips for obtaining a collectible
   */
  private getCollectibleTips(
    collectibleType: CollectibleType,
    sources: Array<{ type: CollectibleSourceType; [key: string]: any }>
  ): string[] {
    const tips: string[] = [];

    // General tips based on source types
    const sourceTypes = sources.map((s) => s.type);

    if (sourceTypes.includes('event')) {
      tips.push('This is a limited-time event item. Check if the event is currently active.');
    }

    if (sourceTypes.includes('mogstation')) {
      tips.push('This item is available for purchase on the Mog Station.');
    }

    if (sourceTypes.includes('achievement')) {
      tips.push('Complete the required achievement to unlock this collectible.');
    }

    if (sourceTypes.includes('raid') || sourceTypes.includes('trial')) {
      tips.push('Consider running this content multiple times to increase your chances.');
    }

    if (sourceTypes.includes('pvp')) {
      tips.push('Participate in PvP activities to earn the required currency or rewards.');
    }

    if (collectibleType === 'mount' && sourceTypes.includes('shop')) {
      tips.push('Save up gil or special currency to purchase this mount.');
    }

    return tips;
  }

  /**
   * Get collectible sources
   */
  private getCollectibleSources(
    collectibleType: CollectibleType,
    collectibleId: number
  ): CollectibleSource[] {
    return this.db
      .prepare(
        `
      SELECT * FROM collectible_sources
      WHERE collectible_type = ? AND collectible_id = ?
      ORDER BY source_type
    `
      )
      .all(collectibleType, collectibleId) as CollectibleSource[];
  }

  /**
   * Get orchestrion categories
   */
  getOrchestrionCategories(): Array<{ id: number; name: string }> {
    return this.db
      .prepare('SELECT id, name FROM orchestrion_categories ORDER BY order_major, order_minor')
      .all() as Array<{ id: number; name: string }>;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance
let collectiblesServiceInstance: CollectiblesService | null = null;

export function getCollectiblesService(): CollectiblesService {
  if (!collectiblesServiceInstance) {
    collectiblesServiceInstance = new CollectiblesService();
  }
  return collectiblesServiceInstance;
}

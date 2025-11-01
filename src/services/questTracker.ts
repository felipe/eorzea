/**
 * Quest Tracker Service
 *
 * Provides query methods for quest data from SQLite database
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type { Quest, QuestSearchOptions } from '../types/quest.js';

// Default database path (relative to project root)
const DB_PATH = join(process.cwd(), 'data', 'game.db');

export class QuestTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get quest by ID
   */
  getQuestById(id: number): Quest | null {
    const row = this.db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as any;

    return row ? this.mapRowToQuest(row) : null;
  }

  /**
   * Search quests with optional filters
   */
  searchQuests(options: QuestSearchOptions = {}): Quest[] {
    let query = 'SELECT * FROM quests WHERE 1=1';
    const params: any[] = [];

    // Name search (partial match)
    if (options.name !== undefined) {
      query += ' AND name LIKE ?';
      params.push(`%${options.name}%`);
    }

    // Exact level
    if (options.level !== undefined) {
      query += ' AND level = ?';
      params.push(options.level);
    }

    // Level range
    if (options.minLevel !== undefined) {
      query += ' AND level >= ?';
      params.push(options.minLevel);
    }

    if (options.maxLevel !== undefined) {
      query += ' AND level <= ?';
      params.push(options.maxLevel);
    }

    // Expansion filter
    if (options.expansionId !== undefined) {
      query += ' AND expansion_id = ?';
      params.push(options.expansionId);
    }

    // Journal genre filter (quest type)
    if (options.journalGenreId !== undefined) {
      query += ' AND journal_genre_id = ?';
      params.push(options.journalGenreId);
    }

    // Place name filter (location)
    if (options.placeNameId !== undefined) {
      query += ' AND place_name_id = ?';
      params.push(options.placeNameId);
    }

    // Repeatable filter
    if (options.isRepeatable !== undefined) {
      query += ' AND is_repeatable = ?';
      params.push(options.isRepeatable ? 1 : 0);
    }

    // Add ordering by sort_key and level
    query += ' ORDER BY sort_key ASC, level ASC, id ASC';

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
    return rows.map((row) => this.mapRowToQuest(row));
  }

  /**
   * Search quests by name (shorthand for searchQuests with name option)
   */
  searchByName(name: string, limit: number = 10): Quest[] {
    return this.searchQuests({ name, limit });
  }

  /**
   * Get quests by level
   */
  getQuestsByLevel(level: number): Quest[] {
    return this.searchQuests({ level });
  }

  /**
   * Get quests by level range
   */
  getQuestsByLevelRange(minLevel: number, maxLevel: number): Quest[] {
    return this.searchQuests({ minLevel, maxLevel });
  }

  /**
   * Get total quest count
   */
  getTotalCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM quests').get() as any;
    return result.count;
  }

  /**
   * Get repeatable quest count
   */
  getRepeatableQuestCount(): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM quests WHERE is_repeatable = 1')
      .get() as any;
    return result.count;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Map database row to Quest object
   */
  private mapRowToQuest(row: any): Quest {
    return {
      id: row.id,
      name: row.name,
      internalId: row.internal_id || undefined,
      level: row.level,
      levelOffset: row.level_offset || undefined,
      classJobCategoryId: row.class_job_category_id || null,
      classJobRequiredId: row.class_job_required_id || null,
      placeNameId: row.place_name_id || null,
      journalGenreId: row.journal_genre_id || null,
      expansionId: row.expansion_id || null,
      previousQuests: JSON.parse(row.previous_quests || '[]'),
      gilReward: row.gil_reward || undefined,
      expFactor: row.exp_factor || undefined,
      isRepeatable: row.is_repeatable === 1,
      canCancel: row.can_cancel === 1,
      issuerStartId: row.issuer_start_id || null,
      issuerLocationId: row.issuer_location_id || null,
      targetEndId: row.target_end_id || null,
      type: row.type || undefined,
      sortKey: row.sort_key || undefined,
    };
  }
}

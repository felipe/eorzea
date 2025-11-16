/**
 * Achievement Tracker Service
 *
 * Provides query methods for achievement data from SQLite database
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type { Achievement, AchievementSearchOptions } from '../types/title.js';

const DB_PATH = join(process.cwd(), 'data', 'gameData.db');

export class AchievementTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get achievement by ID
   */
  getAchievementById(id: number): Achievement | null {
    const row = this.db.prepare('SELECT * FROM achievements WHERE id = ?').get(id) as any;
    return row ? this.mapRowToAchievement(row) : null;
  }

  /**
   * Search achievements
   */
  searchAchievements(options: AchievementSearchOptions = {}): Achievement[] {
    let query = 'SELECT * FROM achievements WHERE 1=1';
    const params: any[] = [];

    if (options.query) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${options.query}%`, `%${options.query}%`);
    }

    if (options.categoryId !== undefined) {
      query += ' AND category_id = ?';
      params.push(options.categoryId);
    }

    if (options.rewardsTitles) {
      query += ' AND title_reward_id IS NOT NULL AND title_reward_id > 0';
    }

    query += ' ORDER BY id ASC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToAchievement(row));
  }

  /**
   * Get achievements that reward a specific title
   */
  getAchievementsByTitleReward(titleId: number): Achievement[] {
    const rows = this.db
      .prepare('SELECT * FROM achievements WHERE title_reward_id = ?')
      .all(titleId) as any[];
    return rows.map((row) => this.mapRowToAchievement(row));
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(categoryId: number): Achievement[] {
    const rows = this.db
      .prepare('SELECT * FROM achievements WHERE category_id = ? ORDER BY id ASC')
      .all(categoryId) as any[];
    return rows.map((row) => this.mapRowToAchievement(row));
  }

  /**
   * Get all achievements that reward titles
   */
  getTitleRewardingAchievements(): Achievement[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM achievements WHERE title_reward_id IS NOT NULL AND title_reward_id > 0 ORDER BY id ASC'
      )
      .all() as any[];
    return rows.map((row) => this.mapRowToAchievement(row));
  }

  /**
   * Get total achievement count
   */
  getTotalCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM achievements').get() as any;
    return result.count;
  }

  /**
   * Get count of achievements that reward titles
   */
  getTitleRewardCount(): number {
    const result = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM achievements WHERE title_reward_id IS NOT NULL AND title_reward_id > 0'
      )
      .get() as any;
    return result.count;
  }

  /**
   * Get achievement with title name joined
   */
  getAchievementWithTitle(id: number): any {
    const row = this.db
      .prepare(
        `SELECT a.*, t.name_masculine as title_name
         FROM achievements a
         LEFT JOIN titles t ON a.title_reward_id = t.id
         WHERE a.id = ?`
      )
      .get(id) as any;

    if (!row) return null;

    return {
      ...this.mapRowToAchievement(row),
      titleName: row.title_name || null,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Map database row to Achievement object
   */
  private mapRowToAchievement(row: any): Achievement {
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description || '',
      points: row.points || 0,
      titleRewardId: row.title_reward_id || undefined,
      itemRewardId: row.item_reward_id || undefined,
      icon: row.icon || 0,
      achievementType: row.achievement_type || 0,
    };
  }
}

// Export singleton instance
let achievementTrackerInstance: AchievementTrackerService | null = null;

export function getAchievementTrackerService(): AchievementTrackerService {
  if (!achievementTrackerInstance) {
    achievementTrackerInstance = new AchievementTrackerService();
  }
  return achievementTrackerInstance;
}

export function resetAchievementTrackerService(): void {
  if (achievementTrackerInstance) {
    achievementTrackerInstance.close();
    achievementTrackerInstance = null;
  }
}

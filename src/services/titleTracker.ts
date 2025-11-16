/**
 * Title Tracker Service
 *
 * Provides query methods for title data from SQLite database
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type { Title, TitleSearchOptions } from '../types/title.js';

const DB_PATH = join(process.cwd(), 'data', 'gameData.db');

export class TitleTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get title by ID
   */
  getTitleById(id: number): Title | null {
    const row = this.db.prepare('SELECT * FROM titles WHERE id = ?').get(id) as any;
    return row ? this.mapRowToTitle(row) : null;
  }

  /**
   * Get title by name (masculine)
   */
  getTitleByName(name: string): Title | null {
    const row = this.db
      .prepare('SELECT * FROM titles WHERE name_masculine = ? OR name_feminine = ?')
      .get(name, name) as any;
    return row ? this.mapRowToTitle(row) : null;
  }

  /**
   * Search titles
   */
  searchTitles(options: TitleSearchOptions = {}): Title[] {
    let query = 'SELECT * FROM titles WHERE 1=1';
    const params: any[] = [];

    if (options.query) {
      query += ' AND (name_masculine LIKE ? OR name_feminine LIKE ?)';
      params.push(`%${options.query}%`, `%${options.query}%`);
    }

    if (options.isPrefix !== undefined) {
      query += ' AND is_prefix = ?';
      params.push(options.isPrefix ? 1 : 0);
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToTitle(row));
  }

  /**
   * Get all titles
   */
  getAllTitles(): Title[] {
    const rows = this.db
      .prepare('SELECT * FROM titles ORDER BY sort_order ASC, id ASC')
      .all() as any[];
    return rows.map((row) => this.mapRowToTitle(row));
  }

  /**
   * Get total title count
   */
  getTotalCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM titles').get() as any;
    return result.count;
  }

  /**
   * Get titles by prefix/suffix
   */
  getTitlesByType(isPrefix: boolean): Title[] {
    const rows = this.db
      .prepare('SELECT * FROM titles WHERE is_prefix = ? ORDER BY sort_order ASC')
      .all(isPrefix ? 1 : 0) as any[];
    return rows.map((row) => this.mapRowToTitle(row));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Map database row to Title object
   */
  private mapRowToTitle(row: any): Title {
    return {
      id: row.id,
      nameMasculine: row.name_masculine,
      nameFeminine: row.name_feminine,
      isPrefix: row.is_prefix === 1,
      sortOrder: row.sort_order || 0,
    };
  }
}

// Export singleton instance
let titleTrackerInstance: TitleTrackerService | null = null;

export function getTitleTrackerService(): TitleTrackerService {
  if (!titleTrackerInstance) {
    titleTrackerInstance = new TitleTrackerService();
  }
  return titleTrackerInstance;
}

export function resetTitleTrackerService(): void {
  if (titleTrackerInstance) {
    titleTrackerInstance.close();
    titleTrackerInstance = null;
  }
}

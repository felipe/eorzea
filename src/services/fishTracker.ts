/**
 * Fish Tracker Service
 *
 * Provides query methods for fish data from SQLite database
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import type { Fish, FishSearchOptions } from '../types/fish.js';
import { getEorzeanTime, isInTimeWindow } from '../utils/eorzeanTime.js';

// Default database path (relative to project root)
const DB_PATH = join(process.cwd(), 'data', 'fish.db');

export class FishTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get fish by ID
   */
  getFishById(id: number): Fish | null {
    const row = this.db
      .prepare(
        `
        SELECT 
          f.id, f.patch, f.location_id, f.start_hour, f.end_hour,
          f.weather_set, f.previous_weather_set, f.best_catch_path,
          f.predators, f.intuition_length, f.folklore, f.collectable,
          f.fish_eyes, f.big_fish, f.snagging, f.lure, f.hookset,
          f.tug, f.gig, f.aquarium_water, f.aquarium_size, f.data_missing,
          i.name
        FROM fish f 
        LEFT JOIN items i ON f.id = i.id 
        WHERE f.id = ?
      `
      )
      .get(id) as any;

    return row ? this.mapRowToFish(row) : null;
  }

  /**
   * Search fish with optional filters
   */
  searchFish(options: FishSearchOptions = {}): Fish[] {
    let query = `
      SELECT 
        f.id, f.patch, f.location_id, f.start_hour, f.end_hour,
        f.weather_set, f.previous_weather_set, f.best_catch_path,
        f.predators, f.intuition_length, f.folklore, f.collectable,
        f.fish_eyes, f.big_fish, f.snagging, f.lure, f.hookset,
        f.tug, f.gig, f.aquarium_water, f.aquarium_size, f.data_missing,
        i.name
      FROM fish f 
      LEFT JOIN items i ON f.id = i.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options.bigFishOnly) {
      query += ' AND big_fish = 1';
    }

    if (options.patch !== undefined) {
      query += ' AND patch = ?';
      params.push(options.patch);
    }

    if (options.location !== undefined) {
      query += ' AND location_id = ?';
      params.push(options.location);
    }

    if (options.requiresFolklore === true) {
      query += ' AND folklore = 1';
    }

    if (options.aquariumOnly) {
      query += ' AND aquarium_water IS NOT NULL';
    }

    // Add ordering
    query += ' ORDER BY f.patch DESC, f.id ASC';

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
    return rows.map((row) => this.mapRowToFish(row));
  }

  /**
   * Get all big fish
   */
  getBigFish(): Fish[] {
    return this.searchFish({ bigFishOnly: true });
  }

  /**
   * Get fish available at current Eorzean time
   */
  getAvailableFish(currentTime: Date = new Date()): Fish[] {
    const eorzeaTime = getEorzeanTime(currentTime);
    const allFish = this.searchFish();

    return allFish.filter((fish) => isInTimeWindow(eorzeaTime.hours, fish.startHour, fish.endHour));
  }

  /**
   * Get fish by weather requirement
   */
  getFishByWeather(weatherId: number): Fish[] {
    const allFish = this.searchFish();

    return allFish.filter((fish) => {
      if (fish.weatherSet.length === 0) return false;
      return fish.weatherSet.includes(weatherId);
    });
  }

  /**
   * Get total fish count
   */
  getTotalCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM fish').get() as any;
    return result.count;
  }

  /**
   * Get big fish count
   */
  getBigFishCount(): number {
    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM fish WHERE big_fish = 1')
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
   * Get item name by ID
   */
  getItemName(itemId: number): string | null {
    const row = this.db.prepare('SELECT name FROM items WHERE id = ?').get(itemId) as any;
    return row ? row.name : null;
  }

  /**
   * Get weather name by ID
   */
  getWeatherName(weatherId: number): string | null {
    const row = this.db
      .prepare('SELECT name FROM weather_types WHERE id = ?')
      .get(weatherId) as any;
    return row ? row.name : null;
  }

  /**
   * Map database row to Fish object
   */
  private mapRowToFish(row: any): Fish {
    return {
      _id: row.id,
      name: row.name || undefined,
      previousWeatherSet: JSON.parse(row.previous_weather_set || '[]'),
      weatherSet: JSON.parse(row.weather_set || '[]'),
      startHour: row.start_hour,
      endHour: row.end_hour,
      location: row.location_id,
      bestCatchPath: JSON.parse(row.best_catch_path || '[]'),
      predators: JSON.parse(row.predators || '[]'),
      intuitionLength: row.intuition_length,
      patch: row.patch,
      folklore: row.folklore === 1 ? true : row.folklore === 0 ? false : null,
      collectable: row.collectable === 1 ? true : row.collectable === 0 ? false : null,
      fishEyes: row.fish_eyes === 1,
      bigFish: row.big_fish === 1,
      snagging: row.snagging === 1 ? true : row.snagging === 0 ? false : null,
      lure: row.lure,
      hookset: row.hookset,
      tug: row.tug,
      gig: row.gig,
      aquarium: row.aquarium_water
        ? {
            water: row.aquarium_water,
            size: row.aquarium_size,
          }
        : null,
      dataMissing: row.data_missing === 1 ? true : row.data_missing === 0 ? false : null,
    };
  }
}

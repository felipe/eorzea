/**
 * Player Profile Service
 *
 * Manages player character data, progress tracking, and offline-first storage
 * Only requires internet for initial character setup and optional syncs with Lodestone
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import {
  PlayerCharacter,
  JobProgress,
  CompletedQuest,
  CaughtFish,
  Bookmark,
  SessionHistory,
  Goal,
  ProgressStats,
  CharacterSyncResult,
} from '../types/profile.js';
import { getLodestoneClient } from './lodestone.js';

const PROFILE_DB_PATH = join(process.cwd(), 'data', 'profile.db');
const GAME_DB_PATH = join(process.cwd(), 'data', 'game.db');
const FISH_DB_PATH = join(process.cwd(), 'data', 'fish.db');

export class PlayerProfileService {
  private db: Database.Database;
  private gameDb: Database.Database;
  private fishDb: Database.Database;

  constructor(
    profileDbPath: string = PROFILE_DB_PATH,
    gameDbPath: string = GAME_DB_PATH,
    fishDbPath: string = FISH_DB_PATH
  ) {
    this.db = new Database(profileDbPath);
    this.gameDb = new Database(gameDbPath, { readonly: true });
    this.fishDb = new Database(fishDbPath, { readonly: true });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  // ==================== Character Management ====================

  /**
   * Create a new character by fetching from Lodestone
   * Requires internet connection
   */
  async createCharacter(name: string, server: string): Promise<PlayerCharacter> {
    const lodestone = getLodestoneClient();

    // Search for character on Lodestone
    const searchResults = await lodestone.searchCharacter(name, server);

    if (!searchResults.characters || searchResults.characters.length === 0) {
      throw new Error(`Character "${name}" not found on server "${server}"`);
    }

    // Find exact match
    const match = searchResults.characters.find(
      (c) =>
        c.name.toLowerCase() === name.toLowerCase() &&
        c.server.toLowerCase() === server.toLowerCase()
    );

    if (!match) {
      throw new Error(`Exact match for "${name}" on "${server}" not found`);
    }

    // Fetch full character details
    const characterData = await lodestone.getCharacter(match.id);

    if (!characterData) {
      throw new Error(`Failed to fetch character details for ID ${match.id}`);
    }

    // Check if character already exists
    const existing = this.db.prepare('SELECT id FROM characters WHERE id = ?').get(match.id);

    if (existing) {
      throw new Error(`Character "${name}" (ID: ${match.id}) already exists in your profile`);
    }

    // Deactivate all other characters if this is the first one
    const characterCount = this.db.prepare('SELECT COUNT(*) as count FROM characters').get() as any;
    const isActive = characterCount.count === 0;

    const now = Date.now();

    // Insert character
    this.db
      .prepare(
        `INSERT INTO characters 
        (id, name, server, data_center, last_synced_at, created_at, is_active, avatar_url, title, free_company)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        match.id,
        characterData.name,
        characterData.server,
        characterData.dataCenter || null,
        now,
        now,
        isActive ? 1 : 0,
        characterData.avatar || null,
        characterData.title || null,
        characterData.freeCompany || null
      );

    // Fetch and store job levels
    try {
      const classJobs = await lodestone.getCharacterClassJobs(match.id);

      if (classJobs) {
        const jobNames = [
          'Paladin',
          'Warrior',
          'DarkKnight',
          'Gunbreaker',
          'WhiteMage',
          'Scholar',
          'Astrologian',
          'Sage',
          'Monk',
          'Dragoon',
          'Ninja',
          'Samurai',
          'Reaper',
          'Bard',
          'Machinist',
          'Dancer',
          'BlackMage',
          'Summoner',
          'RedMage',
          'BlueMage',
          'Viper',
          'Pictomancer',
          'Carpenter',
          'Blacksmith',
          'Armorer',
          'Goldsmith',
          'Leatherworker',
          'Weaver',
          'Alchemist',
          'Culinarian',
          'Miner',
          'Botanist',
          'Fisher',
        ];

        const insertJob = this.db.prepare(
          `INSERT INTO job_progress (character_id, job_name, level, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(character_id, job_name) DO UPDATE SET level = ?, updated_at = ?`
        );

        for (const jobName of jobNames) {
          const jobData = classJobs[jobName];
          if (jobData && jobData.Level) {
            const level = parseInt(jobData.Level);
            if (level > 0) {
              insertJob.run(match.id, jobName, level, now, level, now);
            }
          }
        }
      }
    } catch (error) {
      // Job data is optional, continue even if it fails
      console.warn('Could not fetch job data:', error);
    }

    return this.getCharacterById(match.id)!;
  }

  /**
   * Get character by Lodestone ID
   */
  getCharacterById(id: string): PlayerCharacter | null {
    const row = this.db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as any;
    return row ? this.mapRowToCharacter(row) : null;
  }

  /**
   * Get the currently active character
   */
  getActiveCharacter(): PlayerCharacter | null {
    const row = this.db
      .prepare('SELECT * FROM characters WHERE is_active = 1 LIMIT 1')
      .get() as any;
    return row ? this.mapRowToCharacter(row) : null;
  }

  /**
   * Set a character as active (and deactivate all others)
   */
  setActiveCharacter(id: string): void {
    // Deactivate all characters
    this.db.prepare('UPDATE characters SET is_active = 0').run();

    // Activate the specified character
    const result = this.db.prepare('UPDATE characters SET is_active = 1 WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new Error(`Character with ID ${id} not found`);
    }
  }

  /**
   * List all characters
   */
  listCharacters(): PlayerCharacter[] {
    const rows = this.db
      .prepare('SELECT * FROM characters ORDER BY is_active DESC, name ASC')
      .all() as any[];
    return rows.map((row) => this.mapRowToCharacter(row));
  }

  /**
   * Remove a character and all associated data
   */
  removeCharacter(id: string): void {
    const result = this.db.prepare('DELETE FROM characters WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new Error(`Character with ID ${id} not found`);
    }

    // If we removed the active character, activate the first remaining one
    const activeChar = this.getActiveCharacter();
    if (!activeChar) {
      const firstChar = this.db.prepare('SELECT id FROM characters LIMIT 1').get() as any;
      if (firstChar) {
        this.setActiveCharacter(firstChar.id);
      }
    }
  }

  // ==================== Quest Tracking ====================

  /**
   * Mark a quest as complete for a character
   */
  markQuestComplete(characterId: string, questId: number, notes?: string): void {
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO completed_quests (character_id, quest_id, completed_at, notes)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(character_id, quest_id) DO UPDATE SET completed_at = ?, notes = ?`
      )
      .run(characterId, questId, now, notes || null, now, notes || null);
  }

  /**
   * Mark a quest as incomplete (remove completion record)
   */
  markQuestIncomplete(characterId: string, questId: number): void {
    this.db
      .prepare('DELETE FROM completed_quests WHERE character_id = ? AND quest_id = ?')
      .run(characterId, questId);
  }

  /**
   * Check if a quest is completed
   */
  isQuestComplete(characterId: string, questId: number): boolean {
    const row = this.db
      .prepare('SELECT id FROM completed_quests WHERE character_id = ? AND quest_id = ?')
      .get(characterId, questId);
    return !!row;
  }

  /**
   * Get all completed quests for a character
   */
  getCompletedQuests(characterId: string, limit?: number): CompletedQuest[] {
    let query = 'SELECT * FROM completed_quests WHERE character_id = ? ORDER BY completed_at DESC';
    const params: any[] = [characterId];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToCompletedQuest(row));
  }

  /**
   * Get completed quest count for a character
   */
  getCompletedQuestCount(characterId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM completed_quests WHERE character_id = ?')
      .get(characterId) as any;
    return row.count;
  }

  // ==================== Fish Tracking ====================

  /**
   * Mark a fish as caught
   */
  markFishCaught(characterId: string, fishId: number, locationId?: number, notes?: string): void {
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO caught_fish (character_id, fish_id, caught_at, location_id, notes)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(characterId, fishId, now, locationId || null, notes || null);
  }

  /**
   * Check if a fish has been caught
   */
  isFishCaught(characterId: string, fishId: number): boolean {
    const row = this.db
      .prepare('SELECT id FROM caught_fish WHERE character_id = ? AND fish_id = ?')
      .get(characterId, fishId);
    return !!row;
  }

  /**
   * Get all caught fish for a character
   */
  getCaughtFish(characterId: string, limit?: number): CaughtFish[] {
    let query = 'SELECT * FROM caught_fish WHERE character_id = ? ORDER BY caught_at DESC';
    const params: any[] = [characterId];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToCaughtFish(row));
  }

  /**
   * Get unique caught fish count for a character
   */
  getCaughtFishCount(characterId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(DISTINCT fish_id) as count FROM caught_fish WHERE character_id = ?')
      .get(characterId) as any;
    return row.count;
  }

  /**
   * Get count of big fish caught
   */
  getBigFishCaughtCount(characterId: string): number {
    const caughtFish = this.getCaughtFish(characterId);
    const uniqueFishIds = [...new Set(caughtFish.map((f) => f.fishId))];

    let bigFishCount = 0;
    for (const fishId of uniqueFishIds) {
      const fish = this.fishDb.prepare('SELECT big_fish FROM fish WHERE id = ?').get(fishId) as any;
      if (fish && fish.big_fish === 1) {
        bigFishCount++;
      }
    }

    return bigFishCount;
  }

  // ==================== Job Progress ====================

  /**
   * Update job level for a character
   */
  updateJobLevel(characterId: string, jobName: string, level: number): void {
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO job_progress (character_id, job_name, level, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(character_id, job_name) DO UPDATE SET level = ?, updated_at = ?`
      )
      .run(characterId, jobName, level, now, level, now);
  }

  /**
   * Get all job progress for a character
   */
  getJobProgress(characterId: string): JobProgress[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM job_progress WHERE character_id = ? ORDER BY level DESC, job_name ASC'
      )
      .all(characterId) as any[];
    return rows.map((row) => this.mapRowToJobProgress(row));
  }

  /**
   * Get top N jobs by level
   */
  getTopJobs(characterId: string, limit: number = 5): JobProgress[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM job_progress WHERE character_id = ? ORDER BY level DESC, job_name ASC LIMIT ?'
      )
      .all(characterId, limit) as any[];
    return rows.map((row) => this.mapRowToJobProgress(row));
  }

  // ==================== Bookmarks ====================

  /**
   * Add a bookmark
   */
  addBookmark(
    characterId: string,
    type: 'quest' | 'fish' | 'location',
    itemId: number,
    notes?: string,
    priority: number = 0
  ): void {
    const now = Date.now();

    this.db
      .prepare(
        `INSERT INTO bookmarks (character_id, type, item_id, notes, priority, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(character_id, type, item_id) DO UPDATE SET notes = ?, priority = ?`
      )
      .run(characterId, type, itemId, notes || null, priority, now, notes || null, priority);
  }

  /**
   * Get bookmarks for a character
   */
  getBookmarks(characterId: string, type?: 'quest' | 'fish' | 'location'): Bookmark[] {
    let query = 'SELECT * FROM bookmarks WHERE character_id = ?';
    const params: any[] = [characterId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => this.mapRowToBookmark(row));
  }

  /**
   * Remove a bookmark
   */
  removeBookmark(id: number): void {
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }

  /**
   * Remove all bookmarks of a type
   */
  clearBookmarks(characterId: string, type?: 'quest' | 'fish' | 'location'): void {
    if (type) {
      this.db
        .prepare('DELETE FROM bookmarks WHERE character_id = ? AND type = ?')
        .run(characterId, type);
    } else {
      this.db.prepare('DELETE FROM bookmarks WHERE character_id = ?').run(characterId);
    }
  }

  // ==================== Session History ====================

  /**
   * Log a command to session history
   */
  logCommand(command: string, args?: any, characterId?: string): void {
    const now = Date.now();
    const argsJson = args ? JSON.stringify(args) : null;

    this.db
      .prepare(
        'INSERT INTO session_history (character_id, command, args, timestamp) VALUES (?, ?, ?, ?)'
      )
      .run(characterId || null, command, argsJson, now);
  }

  /**
   * Get recent commands
   */
  getRecentCommands(limit: number = 20): SessionHistory[] {
    const rows = this.db
      .prepare('SELECT * FROM session_history ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map((row) => this.mapRowToSessionHistory(row));
  }

  // ==================== Goals ====================

  /**
   * Create a goal
   */
  createGoal(
    characterId: string,
    title: string,
    description?: string,
    type?: string,
    targetValue?: number
  ): Goal {
    const now = Date.now();

    const result = this.db
      .prepare(
        `INSERT INTO goals (character_id, title, description, type, target_value, current_value, completed, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(characterId, title, description || null, type || null, targetValue || null, 0, 0, now);

    const goal = this.db
      .prepare('SELECT * FROM goals WHERE id = ?')
      .get(result.lastInsertRowid) as any;
    return this.mapRowToGoal(goal);
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(id: number, currentValue: number): void {
    this.db.prepare('UPDATE goals SET current_value = ? WHERE id = ?').run(currentValue, id);

    // Auto-complete if target reached
    const goal = this.db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as any;
    if (goal && goal.target_value && currentValue >= goal.target_value && !goal.completed) {
      this.completeGoal(id);
    }
  }

  /**
   * Mark goal as complete
   */
  completeGoal(id: number): void {
    const now = Date.now();
    this.db.prepare('UPDATE goals SET completed = 1, completed_at = ? WHERE id = ?').run(now, id);
  }

  /**
   * Get active goals for a character
   */
  getActiveGoals(characterId: string): Goal[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM goals WHERE character_id = ? AND completed = 0 ORDER BY created_at DESC'
      )
      .all(characterId) as any[];
    return rows.map((row) => this.mapRowToGoal(row));
  }

  // ==================== Progress Stats ====================

  /**
   * Get comprehensive progress statistics
   */
  getProgressStats(characterId: string, recentLimit: number = 10): ProgressStats {
    const character = this.getCharacterById(characterId);
    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Quest stats
    const totalQuests = (this.gameDb.prepare('SELECT COUNT(*) as count FROM quests').get() as any)
      .count;
    const completedQuests = this.getCompletedQuestCount(characterId);
    const questCompletionPercentage = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

    // Fish stats
    const totalFish = (this.fishDb.prepare('SELECT COUNT(*) as count FROM fish').get() as any)
      .count;
    const caughtFish = this.getCaughtFishCount(characterId);
    const fishCompletionPercentage = totalFish > 0 ? (caughtFish / totalFish) * 100 : 0;

    const totalBigFish = (
      this.fishDb.prepare('SELECT COUNT(*) as count FROM fish WHERE big_fish = 1').get() as any
    ).count;
    const bigFishCaught = this.getBigFishCaughtCount(characterId);

    // Recent activity
    const recentQuests = this.getCompletedQuests(characterId, recentLimit);
    const recentFish = this.getCaughtFish(characterId, recentLimit);

    const recentActivity = [
      ...recentQuests.map((q) => {
        const questData = this.gameDb
          .prepare('SELECT name FROM quests WHERE id = ?')
          .get(q.questId) as any;
        return {
          type: 'quest' as const,
          id: q.questId,
          name: questData?.name,
          timestamp: q.completedAt,
          notes: q.notes,
        };
      }),
      ...recentFish.map((f) => {
        const fishData = this.fishDb
          .prepare('SELECT i.name FROM fish f LEFT JOIN items i ON f.id = i.id WHERE f.id = ?')
          .get(f.fishId) as any;
        return {
          type: 'fish' as const,
          id: f.fishId,
          name: fishData?.name,
          timestamp: f.caughtAt,
          notes: f.notes,
        };
      }),
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, recentLimit);

    // Top jobs
    const topJobs = this.getTopJobs(characterId, 5).map((j) => ({
      jobName: j.jobName,
      level: j.level,
    }));

    return {
      character,
      totalQuests,
      completedQuests,
      questCompletionPercentage,
      totalFish,
      caughtFish,
      fishCompletionPercentage,
      bigFishCaught,
      totalBigFish,
      recentActivity,
      topJobs,
    };
  }

  // ==================== Lodestone Sync ====================

  /**
   * Sync character data from Lodestone
   * Requires internet connection
   */
  async syncCharacterFromLodestone(characterId: string): Promise<CharacterSyncResult> {
    const lodestone = getLodestoneClient();
    const character = this.getCharacterById(characterId);

    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    // Fetch latest data from Lodestone
    const characterData = await lodestone.getCharacter(characterId);

    if (!characterData) {
      throw new Error(`Failed to fetch character data from Lodestone for ID ${characterId}`);
    }

    const now = Date.now();

    // Update character metadata
    this.db
      .prepare(
        `UPDATE characters 
         SET avatar_url = ?, title = ?, free_company = ?, last_synced_at = ?
         WHERE id = ?`
      )
      .run(
        characterData.avatar || null,
        characterData.title || null,
        characterData.freeCompany || null,
        now,
        characterId
      );

    // Fetch and update job levels
    const changes = {
      jobsUpdated: 0,
      newJobs: [] as string[],
      levelChanges: [] as Array<{ jobName: string; oldLevel: number; newLevel: number }>,
    };

    try {
      const classJobs = await lodestone.getCharacterClassJobs(characterId);

      if (classJobs) {
        const jobNames = [
          'Paladin',
          'Warrior',
          'DarkKnight',
          'Gunbreaker',
          'WhiteMage',
          'Scholar',
          'Astrologian',
          'Sage',
          'Monk',
          'Dragoon',
          'Ninja',
          'Samurai',
          'Reaper',
          'Bard',
          'Machinist',
          'Dancer',
          'BlackMage',
          'Summoner',
          'RedMage',
          'BlueMage',
          'Viper',
          'Pictomancer',
          'Carpenter',
          'Blacksmith',
          'Armorer',
          'Goldsmith',
          'Leatherworker',
          'Weaver',
          'Alchemist',
          'Culinarian',
          'Miner',
          'Botanist',
          'Fisher',
        ];

        for (const jobName of jobNames) {
          const jobData = classJobs[jobName];
          if (jobData && jobData.Level) {
            const newLevel = parseInt(jobData.Level);
            if (newLevel > 0) {
              // Check existing level
              const existing = this.db
                .prepare('SELECT level FROM job_progress WHERE character_id = ? AND job_name = ?')
                .get(characterId, jobName) as any;

              if (existing) {
                if (existing.level !== newLevel) {
                  changes.levelChanges.push({
                    jobName,
                    oldLevel: existing.level,
                    newLevel,
                  });
                  changes.jobsUpdated++;
                }
              } else {
                changes.newJobs.push(jobName);
                changes.jobsUpdated++;
              }

              this.updateJobLevel(characterId, jobName, newLevel);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not sync job data:', error);
    }

    return {
      success: true,
      characterId,
      changes,
      lastSyncedAt: new Date(now),
    };
  }

  // ==================== Utility Methods ====================

  /**
   * Close database connections
   */
  close(): void {
    this.db.close();
    this.gameDb.close();
    this.fishDb.close();
  }

  // ==================== Row Mapping ====================

  private mapRowToCharacter(row: any): PlayerCharacter {
    return {
      id: row.id,
      name: row.name,
      server: row.server,
      dataCenter: row.data_center || undefined,
      lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : undefined,
      createdAt: new Date(row.created_at),
      isActive: row.is_active === 1,
      notes: row.notes || undefined,
      avatarUrl: row.avatar_url || undefined,
      title: row.title || undefined,
      freeCompany: row.free_company || undefined,
    };
  }

  private mapRowToJobProgress(row: any): JobProgress {
    return {
      id: row.id,
      characterId: row.character_id,
      jobName: row.job_name,
      level: row.level,
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapRowToCompletedQuest(row: any): CompletedQuest {
    return {
      id: row.id,
      characterId: row.character_id,
      questId: row.quest_id,
      completedAt: new Date(row.completed_at),
      notes: row.notes || undefined,
    };
  }

  private mapRowToCaughtFish(row: any): CaughtFish {
    return {
      id: row.id,
      characterId: row.character_id,
      fishId: row.fish_id,
      caughtAt: new Date(row.caught_at),
      locationId: row.location_id || undefined,
      notes: row.notes || undefined,
    };
  }

  private mapRowToBookmark(row: any): Bookmark {
    return {
      id: row.id,
      characterId: row.character_id,
      type: row.type,
      itemId: row.item_id,
      notes: row.notes || undefined,
      priority: row.priority,
      createdAt: new Date(row.created_at),
    };
  }

  private mapRowToSessionHistory(row: any): SessionHistory {
    return {
      id: row.id,
      characterId: row.character_id || undefined,
      command: row.command,
      args: row.args ? JSON.parse(row.args) : undefined,
      timestamp: new Date(row.timestamp),
    };
  }

  private mapRowToGoal(row: any): Goal {
    return {
      id: row.id,
      characterId: row.character_id,
      title: row.title,
      description: row.description || undefined,
      type: row.type || undefined,
      targetValue: row.target_value || undefined,
      currentValue: row.current_value,
      completed: row.completed === 1,
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}

// Export singleton instance
let profileServiceInstance: PlayerProfileService | null = null;

export function getPlayerProfileService(): PlayerProfileService {
  if (!profileServiceInstance) {
    profileServiceInstance = new PlayerProfileService();
  }
  return profileServiceInstance;
}

export function resetPlayerProfileService(): void {
  if (profileServiceInstance) {
    profileServiceInstance.close();
    profileServiceInstance = null;
  }
}

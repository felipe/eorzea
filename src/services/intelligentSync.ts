/**
 * Intelligent Sync Service
 *
 * Analyzes achievements to infer quest completions with confidence scoring
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const GAME_DB_PATH = join(process.cwd(), 'data', 'game.db');

export interface QuestInference {
  questId: number;
  questName: string;
  source: 'sync_inferred' | 'sync_confirmed';
  confidence: number; // 0-100
  inferredFrom: number; // achievement ID
  reason: string;
}

export interface InferenceResult {
  achievements: Array<{
    achievementId: number;
    achievementName: string;
  }>;
  inferredQuests: QuestInference[];
  summary: {
    totalAchievements: number;
    totalQuestsInferred: number;
    highConfidence: number; // >= 90
    mediumConfidence: number; // 70-89
    lowConfidence: number; // < 70
  };
}

/**
 * Key MSQ achievement milestones
 * These represent major story completion points
 */
const MSQ_ACHIEVEMENTS: Record<
  number,
  {
    name: string;
    expansion: number;
    finalQuestName: string;
    confidence: number;
  }
> = {
  // A Realm Reborn (expansion 0)
  788: {
    name: 'Warrior of Light',
    expansion: 0,
    finalQuestName: 'The Ultimate Weapon',
    confidence: 95,
  },
  1001: {
    name: 'Eorzea Defended',
    expansion: 0,
    finalQuestName: 'Brave New Companions',
    confidence: 95,
  },

  // Heavensward (expansion 1)
  1139: {
    name: 'Heavensward',
    expansion: 1,
    finalQuestName: 'Heavensward',
    confidence: 95,
  },
  1691: {
    name: 'The Far Edge of Fate',
    expansion: 1,
    finalQuestName: 'The Far Edge of Fate',
    confidence: 95,
  },

  // Stormblood (expansion 2)
  1794: {
    name: 'Stormblood',
    expansion: 2,
    finalQuestName: 'Stormblood',
    confidence: 95,
  },
  2233: {
    name: 'A Requiem for Heroes',
    expansion: 2,
    finalQuestName: 'A Requiem for Heroes',
    confidence: 95,
  },

  // Shadowbringers (expansion 3)
  2298: {
    name: 'Shadowbringers',
    expansion: 3,
    finalQuestName: 'Shadowbringers',
    confidence: 95,
  },
  2714: {
    name: 'Futures Rewritten',
    expansion: 3,
    finalQuestName: 'Futures Rewritten',
    confidence: 95,
  },

  // Endwalker (expansion 4)
  2958: {
    name: 'Endwalker',
    expansion: 4,
    finalQuestName: 'Endwalker',
    confidence: 95,
  },
  3773: {
    name: 'In Memoriam',
    expansion: 4,
    finalQuestName: 'The Promise of Tomorrow',
    confidence: 95,
  },

  // Dawntrail (expansion 5)
  3496: {
    name: 'Dawntrail',
    expansion: 5,
    finalQuestName: 'Dawntrail',
    confidence: 95,
  },
  3633: {
    name: 'Seekers of Eternity',
    expansion: 5,
    finalQuestName: 'Seekers of Eternity',
    confidence: 95,
  },
};

/**
 * Job level achievements for inferring job quest completion
 */
const JOB_LEVEL_ACHIEVEMENTS: Record<
  string,
  Array<{ achievementId: number; level: number; confidence: number }>
> = {
  // Combat jobs
  Paladin: [
    { achievementId: 144, level: 50, confidence: 90 },
    { achievementId: 145, level: 60, confidence: 90 },
    { achievementId: 146, level: 70, confidence: 90 },
    { achievementId: 2563, level: 80, confidence: 90 },
    { achievementId: 3065, level: 90, confidence: 90 },
  ],
  Warrior: [
    { achievementId: 147, level: 50, confidence: 90 },
    { achievementId: 148, level: 60, confidence: 90 },
    { achievementId: 149, level: 70, confidence: 90 },
    { achievementId: 2564, level: 80, confidence: 90 },
    { achievementId: 3066, level: 90, confidence: 90 },
  ],
  // Add more jobs as needed
};

export class IntelligentSyncService {
  private gameDb: Database.Database;

  constructor(gameDbPath: string = GAME_DB_PATH) {
    this.gameDb = new Database(gameDbPath, { readonly: true });
  }

  /**
   * Analyze achievements and infer quest completions
   */
  analyzeAchievements(achievementIds: number[]): InferenceResult {
    const achievements: Array<{ achievementId: number; achievementName: string }> = [];
    const inferredQuests: QuestInference[] = [];

    // Check for MSQ achievements
    for (const achievementId of achievementIds) {
      const achievementData = this.gameDb
        .prepare('SELECT name FROM achievements WHERE id = ?')
        .get(achievementId) as any;

      if (achievementData) {
        achievements.push({
          achievementId,
          achievementName: achievementData.name,
        });
      }

      // Check if this is a key MSQ achievement
      const maqInfo = MSQ_ACHIEVEMENTS[achievementId];
      if (maqInfo) {
        const quests = this.inferMSQCompletion(achievementId, maqInfo);
        inferredQuests.push(...quests);
      }

      // Check for job achievements
      const jobQuests = this.inferJobQuestCompletion(achievementId);
      inferredQuests.push(...jobQuests);
    }

    // Calculate summary
    const summary = {
      totalAchievements: achievements.length,
      totalQuestsInferred: inferredQuests.length,
      highConfidence: inferredQuests.filter((q) => q.confidence >= 90).length,
      mediumConfidence: inferredQuests.filter((q) => q.confidence >= 70 && q.confidence < 90)
        .length,
      lowConfidence: inferredQuests.filter((q) => q.confidence < 70).length,
    };

    return {
      achievements,
      inferredQuests,
      summary,
    };
  }

  /**
   * Infer MSQ completion based on achievement
   */
  private inferMSQCompletion(
    achievementId: number,
    msqInfo: {
      name: string;
      expansion: number;
      finalQuestName: string;
      confidence: number;
    }
  ): QuestInference[] {
    const inferences: QuestInference[] = [];

    // Find the final quest by name and expansion
    const finalQuest = this.gameDb
      .prepare(
        `SELECT id, name FROM quests 
         WHERE name = ? 
         AND (expansion_id = ? OR expansion_id IS NULL)
         LIMIT 1`
      )
      .get(msqInfo.finalQuestName, msqInfo.expansion) as any;

    if (!finalQuest) {
      console.warn(
        `Could not find final quest "${msqInfo.finalQuestName}" for expansion ${msqInfo.expansion}`
      );
      return inferences;
    }

    // Get all MSQ quests for this expansion (up to and including the final quest)
    // We'll use a heuristic: quests in the same expansion with journal_genre_id matching MSQ patterns
    const msqQuests = this.gameDb
      .prepare(
        `SELECT id, name FROM quests 
         WHERE expansion_id = ?
         AND id <= ?
         ORDER BY id ASC`
      )
      .all(msqInfo.expansion, finalQuest.id) as any[];

    // Infer all these quests as complete
    for (const quest of msqQuests) {
      inferences.push({
        questId: quest.id,
        questName: quest.name,
        source: 'sync_inferred',
        confidence: msqInfo.confidence,
        inferredFrom: achievementId,
        reason: `Inferred from achievement: ${msqInfo.name}`,
      });
    }

    return inferences;
  }

  /**
   * Infer job quest completion based on level achievement
   */
  private inferJobQuestCompletion(achievementId: number): QuestInference[] {
    const inferences: QuestInference[] = [];

    // Check all job level achievements
    for (const [jobName, jobAchievements] of Object.entries(JOB_LEVEL_ACHIEVEMENTS)) {
      const jobAchievement = jobAchievements.find((ja) => ja.achievementId === achievementId);

      if (jobAchievement) {
        // Find job quests for this job up to this level
        const jobQuests = this.gameDb
          .prepare(
            `SELECT id, name, level FROM quests 
             WHERE name LIKE ?
             AND level <= ?
             ORDER BY level ASC`
          )
          .all(`%${jobName}%`, jobAchievement.level) as any[];

        for (const quest of jobQuests) {
          inferences.push({
            questId: quest.id,
            questName: quest.name,
            source: 'sync_inferred',
            confidence: jobAchievement.confidence,
            inferredFrom: achievementId,
            reason: `Inferred from ${jobName} level ${jobAchievement.level} achievement`,
          });
        }
      }
    }

    return inferences;
  }

  /**
   * Get quest chains for a specific expansion
   */
  getExpansionQuestChain(expansionId: number): Array<{ id: number; name: string }> {
    return this.gameDb
      .prepare(
        `SELECT id, name FROM quests 
         WHERE expansion_id = ?
         ORDER BY id ASC`
      )
      .all(expansionId) as any[];
  }

  /**
   * Close database connection
   */
  close(): void {
    this.gameDb.close();
  }
}

// Export singleton instance
let intelligentSyncInstance: IntelligentSyncService | null = null;

export function getIntelligentSyncService(): IntelligentSyncService {
  if (!intelligentSyncInstance) {
    intelligentSyncInstance = new IntelligentSyncService();
  }
  return intelligentSyncInstance;
}

export function resetIntelligentSyncService(): void {
  if (intelligentSyncInstance) {
    intelligentSyncInstance.close();
    intelligentSyncInstance = null;
  }
}

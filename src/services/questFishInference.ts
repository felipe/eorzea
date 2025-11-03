/**
 * Quest Fish Inference Service
 *
 * Infers fish catches from completed quest objectives
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const GAME_DB_PATH = join(process.cwd(), 'data', 'game.db');
const PROFILE_DB_PATH = join(process.cwd(), 'data', 'profile.db');

export interface FishInference {
  fishId: number;
  fishName: string;
  questId: number;
  questName: string;
  confidence: number;
}

export interface FishInferenceResult {
  totalFish: number;
  fishToMark: FishInference[];
  alreadyCaught: number;
}

/**
 * Infer fish catches from completed quests
 */
export function inferFishFromCompletedQuests(characterId: string): FishInferenceResult {
  const gameDb = new Database(GAME_DB_PATH, { readonly: true });
  const profileDb = new Database(PROFILE_DB_PATH);

  const fishToMark: FishInference[] = [];
  let alreadyCaught = 0;

  try {
    // Get all completed quests for this character
    const completedQuests = profileDb
      .prepare('SELECT quest_id FROM completed_quests WHERE character_id = ?')
      .all(characterId) as any[];

    const completedQuestIds = completedQuests.map((q) => q.quest_id);

    if (completedQuestIds.length === 0) {
      return { totalFish: 0, fishToMark: [], alreadyCaught: 0 };
    }

    // Get all quests with fish objectives
    const questsWithFish = gameDb
      .prepare(
        `SELECT id, name, objectives FROM quests 
         WHERE id IN (${completedQuestIds.join(',')})
         AND objectives LIKE '%"type":"fish"%'`
      )
      .all() as any[];

    // Parse fish objectives from each quest
    for (const quest of questsWithFish) {
      const objectives = JSON.parse(quest.objectives);

      for (const objective of objectives) {
        if (objective.type === 'fish' && objective.details?.fish) {
          const fishId = objective.details.fish.fishId;
          const fishName = objective.details.fish.fishName;

          // Check if already caught
          const existing = profileDb
            .prepare('SELECT id FROM caught_fish WHERE character_id = ? AND fish_id = ?')
            .get(characterId, fishId);

          if (existing) {
            alreadyCaught++;
          } else {
            fishToMark.push({
              fishId,
              fishName,
              questId: quest.id,
              questName: quest.name,
              confidence: 100, // 100% confidence - quest requires this fish
            });
          }
        }
      }
    }
  } finally {
    gameDb.close();
    profileDb.close();
  }

  return {
    totalFish: fishToMark.length + alreadyCaught,
    fishToMark,
    alreadyCaught,
  };
}

/**
 * Mark inferred fish as caught
 */
export function markInferredFish(characterId: string, fishInferences: FishInference[]): void {
  const profileDb = new Database(PROFILE_DB_PATH);

  try {
    const now = Date.now();
    const checkStmt = profileDb.prepare(
      'SELECT id FROM caught_fish WHERE character_id = ? AND fish_id = ?'
    );
    const insertStmt = profileDb.prepare(
      `INSERT INTO caught_fish (character_id, fish_id, caught_at, notes)
       VALUES (?, ?, ?, ?)`
    );

    const transaction = profileDb.transaction((inferences: FishInference[]) => {
      for (const inference of inferences) {
        // Check if already caught
        const existing = checkStmt.get(characterId, inference.fishId);
        if (!existing) {
          const notes = `Inferred from quest: ${inference.questName}`;
          insertStmt.run(characterId, inference.fishId, now, notes);
        }
      }
    });

    transaction(fishInferences);
  } finally {
    profileDb.close();
  }
}

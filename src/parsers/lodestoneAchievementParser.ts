/**
 * Lodestone Achievement Parser
 *
 * Parses Lodestone achievement text data and matches to database
 */

import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { join } from 'path';

export interface ParsedAchievement {
  date: string;
  category: string;
  name: string;
  achievementId?: number;
}

export interface ParseResult {
  total: number;
  matched: number;
  unmatched: number;
  achievements: ParsedAchievement[];
  unmatchedNames: string[];
}

const GAME_DB_PATH = join(process.cwd(), 'data', 'game.db');

/**
 * Parse Lodestone achievement text format
 *
 * Format can be either:
 * 1. Single line: MM/DD/YYYYCategory achievement "Achievement Name" earned!
 * 2. Multi-line: MM/DD/YYYY\nCategory achievement "Achievement Name" earned!
 *
 * Example: 11/01/2025\nQuests achievement "On Wings of Hope" earned!
 */
export function parseLodestoneAchievementText(text: string): ParsedAchievement[] {
  const achievements: ParsedAchievement[] = [];

  // Split by lines to handle multi-line format
  const lines = text.split('\n');

  let currentDate: string | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if line is a date
    const dateMatch = trimmedLine.match(/^(\d{2}\/\d{2}\/\d{4})$/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }

    // Check if line contains an achievement
    const achievementMatch = trimmedLine.match(
      /^([A-Za-z &]+)\s+achievement\s+"([^"]+)"\s+earned!$/
    );
    if (achievementMatch && currentDate) {
      achievements.push({
        date: currentDate,
        category: achievementMatch[1].trim(),
        name: achievementMatch[2].trim(),
      });
      continue;
    }

    // Also handle single-line format for backward compatibility
    const singleLineMatch = trimmedLine.match(
      /^(\d{2}\/\d{2}\/\d{4})([A-Za-z &]+)\s+achievement\s+"([^"]+)"\s+earned!$/
    );
    if (singleLineMatch) {
      achievements.push({
        date: singleLineMatch[1],
        category: singleLineMatch[2].trim(),
        name: singleLineMatch[3].trim(),
      });
    }
  }

  return achievements;
}

/**
 * Match achievement names to database IDs
 */
export function matchAchievementsToDatabase(
  achievements: ParsedAchievement[],
  dbPath: string = GAME_DB_PATH
): ParseResult {
  const db = new Database(dbPath, { readonly: true });

  const matched: ParsedAchievement[] = [];
  const unmatched: ParsedAchievement[] = [];
  const unmatchedNames: string[] = [];

  try {
    const stmt = db.prepare('SELECT id FROM achievements WHERE name = ?');

    for (const achievement of achievements) {
      const result = stmt.get(achievement.name) as any;

      if (result) {
        matched.push({
          ...achievement,
          achievementId: result.id,
        });
      } else {
        unmatched.push(achievement);
        unmatchedNames.push(achievement.name);
      }
    }
  } finally {
    db.close();
  }

  return {
    total: achievements.length,
    matched: matched.length,
    unmatched: unmatched.length,
    achievements: matched,
    unmatchedNames,
  };
}

/**
 * Parse achievements from file
 */
export function parseAchievementsFromFile(filePath: string): ParseResult {
  const text = readFileSync(filePath, 'utf-8');
  const parsed = parseLodestoneAchievementText(text);
  return matchAchievementsToDatabase(parsed);
}

/**
 * Get MSQ achievement count from parsed results
 */
export function getMSQAchievementCount(result: ParseResult): number {
  // Known MSQ achievement names
  const msqNames = [
    'Warrior of Light',
    'Eorzea Defended',
    'Heavensward',
    'The Far Edge of Fate',
    'Stormblood',
    'A Requiem for Heroes',
    'Shadowbringers',
    'Futures Rewritten',
    'Endwalker',
    'In Memoriam',
    'Dawntrail',
    'Seekers of Eternity',
  ];

  return result.achievements.filter((a) => msqNames.includes(a.name)).length;
}

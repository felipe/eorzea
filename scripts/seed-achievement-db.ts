/**
 * Seed Achievement Data
 *
 * Parses Achievement.csv and inserts achievement data into game.db
 */

import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const CSV_PATH = join(process.cwd(), 'data', 'ffxiv-datamining', 'csv', 'Achievement.csv');
const DB_PATH = join(process.cwd(), 'data', 'gameData.db');

interface AchievementRow {
  key: string;
  [key: string]: string;
}

async function seedAchievements() {
  console.log('🏆 Seeding achievement data...\n');

  const db = new Database(DB_PATH);

  try {
    // Read and parse CSV
    const csvContent = readFileSync(CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as AchievementRow[];

    console.log(`Found ${records.length} achievements in CSV`);

    // Clear existing data
    db.prepare('DELETE FROM achievements').run();
    console.log('✓ Cleared existing achievement data');

    // Prepare insert statement
    const insert = db.prepare(
      `INSERT INTO achievements (id, category_id, name, description, points, title_reward_id, item_reward_id, icon, achievement_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    let inserted = 0;
    let withTitles = 0;

    const insertMany = db.transaction((achievements: AchievementRow[]) => {
      for (const achievement of achievements) {
        // Skip header/empty rows
        if (achievement.key === '#' || achievement.key === 'int32' || !achievement.key) {
          continue;
        }

        const id = parseInt(achievement.key);
        if (isNaN(id)) continue;

        const name = achievement['1'];
        const description = achievement['2'];

        // Skip empty achievements
        if (!name) {
          continue;
        }

        // Based on actual CSV parsing (verified with achievement 6):
        // '0' = category
        // '1' = name
        // '2' = description
        // '3' = achievement target
        // '4' = empty
        // '5' = Points
        // '6' = Title
        // '7' = Item
        // '11' = Icon
        // '13' = Type

        const categoryId = parseInt(achievement['0']) || 0;
        const points = parseInt(achievement['5']) || 0;
        const titleRewardIdRaw = parseInt(achievement['6']);
        const titleRewardId =
          !isNaN(titleRewardIdRaw) && titleRewardIdRaw > 0 ? titleRewardIdRaw : null;
        const itemRewardIdRaw = parseInt(achievement['7']);
        const itemRewardId =
          !isNaN(itemRewardIdRaw) && itemRewardIdRaw > 0 ? itemRewardIdRaw : null;
        const icon = parseInt(achievement['11']) || 0;
        const achievementType = parseInt(achievement['13']) || 0;

        // Verify title exists if referenced
        let finalTitleRewardId = titleRewardId;
        if (titleRewardId) {
          const titleExists = db.prepare('SELECT 1 FROM titles WHERE id = ?').get(titleRewardId);
          if (!titleExists) {
            finalTitleRewardId = null; // Title doesn't exist, set to null
          }
        }

        insert.run(
          id,
          categoryId,
          name,
          description,
          points,
          finalTitleRewardId,
          itemRewardId,
          icon,
          achievementType
        );

        inserted++;
        if (finalTitleRewardId && finalTitleRewardId > 0) {
          withTitles++;
        }
      }
    });

    // Execute transaction
    insertMany(records);

    console.log(`✓ Inserted ${inserted} achievements into database`);
    console.log(`  → ${withTitles} achievements reward titles\n`);

    // Show some examples of achievements that reward titles
    console.log('Sample achievements with title rewards:');
    const samples = db
      .prepare(
        `SELECT a.id, a.name, a.title_reward_id, t.name_masculine 
         FROM achievements a 
         LEFT JOIN titles t ON a.title_reward_id = t.id
         WHERE a.title_reward_id IS NOT NULL AND a.title_reward_id > 0
         LIMIT 10`
      )
      .all() as any[];

    samples.forEach((achievement) => {
      console.log(`  ${achievement.id}: ${achievement.name}`);
      if (achievement.name_masculine) {
        console.log(`     → Rewards: "${achievement.name_masculine}"`);
      }
    });

    console.log('\n✓ Achievement seeding complete!');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding achievements:', error);
    db.close();
    process.exit(1);
  }
}

seedAchievements();

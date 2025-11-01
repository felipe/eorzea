#!/usr/bin/env tsx

/**
 * Seed quest database from parsed JSON data
 *
 * This script creates a SQLite database and populates it with quest data.
 *
 * Usage:
 *   yarn tsx scripts/seed-quest-db.ts
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const INPUT_FILE = join(DATA_DIR, 'quest-data.json');
const DB_FILE = join(DATA_DIR, 'game.db');

interface QuestData {
  id: number;
  name: string;
  internalId: string;
  level: number;
  levelOffset: number;
  classJobCategory: number | null;
  classJobRequired: number | null;
  placeNameId: number | null;
  journalGenreId: number | null;
  expansionId: number | null;
  previousQuests: number[];
  gilReward: number;
  expFactor: number;
  isRepeatable: boolean;
  canCancel: boolean;
  issuerStart: number | null;
  issuerLocation: number | null;
  targetEnd: number | null;
  type: number;
  sortKey: number;
}

function createSchema(db: Database.Database): void {
  console.log('📐 Creating database schema...');

  // Quests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      internal_id TEXT,
      level INTEGER NOT NULL,
      level_offset INTEGER,
      class_job_category_id INTEGER,
      class_job_required_id INTEGER,
      place_name_id INTEGER,
      journal_genre_id INTEGER,
      expansion_id INTEGER,
      previous_quests TEXT, -- JSON array of quest IDs
      gil_reward INTEGER,
      exp_factor INTEGER,
      is_repeatable BOOLEAN,
      can_cancel BOOLEAN,
      issuer_start_id INTEGER,
      issuer_location_id INTEGER,
      target_end_id INTEGER,
      type INTEGER,
      sort_key INTEGER
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_quests_name ON quests(name);
    CREATE INDEX IF NOT EXISTS idx_quests_level ON quests(level);
    CREATE INDEX IF NOT EXISTS idx_quests_place_name ON quests(place_name_id);
    CREATE INDEX IF NOT EXISTS idx_quests_journal_genre ON quests(journal_genre_id);
    CREATE INDEX IF NOT EXISTS idx_quests_expansion ON quests(expansion_id);
  `);

  console.log('   ✅ Schema created');
}

function seedQuests(db: Database.Database, quests: QuestData[]): void {
  console.log(`\n📥 Inserting ${quests.length} quests...`);

  const insert = db.prepare(`
    INSERT OR REPLACE INTO quests (
      id, name, internal_id, level, level_offset,
      class_job_category_id, class_job_required_id,
      place_name_id, journal_genre_id, expansion_id,
      previous_quests, gil_reward, exp_factor,
      is_repeatable, can_cancel,
      issuer_start_id, issuer_location_id, target_end_id,
      type, sort_key
    ) VALUES (
      @id, @name, @internalId, @level, @levelOffset,
      @classJobCategory, @classJobRequired,
      @placeNameId, @journalGenreId, @expansionId,
      @previousQuests, @gilReward, @expFactor,
      @isRepeatable, @canCancel,
      @issuerStart, @issuerLocation, @targetEnd,
      @type, @sortKey
    )
  `);

  const insertMany = db.transaction((quests: QuestData[]) => {
    for (const quest of quests) {
      insert.run({
        id: quest.id,
        name: quest.name,
        internalId: quest.internalId,
        level: quest.level,
        levelOffset: quest.levelOffset,
        classJobCategory: quest.classJobCategory,
        classJobRequired: quest.classJobRequired,
        placeNameId: quest.placeNameId,
        journalGenreId: quest.journalGenreId,
        expansionId: quest.expansionId,
        previousQuests: JSON.stringify(quest.previousQuests || []),
        gilReward: quest.gilReward,
        expFactor: quest.expFactor,
        isRepeatable: quest.isRepeatable ? 1 : 0,
        canCancel: quest.canCancel ? 1 : 0,
        issuerStart: quest.issuerStart,
        issuerLocation: quest.issuerLocation,
        targetEnd: quest.targetEnd,
        type: quest.type,
        sortKey: quest.sortKey,
      });
    }
  });

  insertMany(quests);
  console.log('   ✅ Quests inserted');
}

async function seedQuestDatabase(): Promise<void> {
  console.log('🎮 Seeding Quest Database\n');

  try {
    // Read quest data
    console.log(`📖 Reading quest data from ${INPUT_FILE}...`);
    const data = await readFile(INPUT_FILE, 'utf-8');
    const quests: QuestData[] = JSON.parse(data);
    console.log(`   ✅ Loaded ${quests.length} quests`);

    // Create/open database
    console.log(`\n💾 Opening database: ${DB_FILE}`);
    const db = new Database(DB_FILE);

    try {
      // Create schema
      createSchema(db);

      // Seed data
      seedQuests(db, quests);

      // Verify
      const count = db.prepare('SELECT COUNT(*) as count FROM quests').get() as any;
      console.log(`\n✅ Database seeded successfully`);
      console.log(`   Total quests in database: ${count.count}`);

      // Sample query
      const sampleQuest = db
        .prepare('SELECT * FROM quests WHERE name LIKE ? LIMIT 1')
        .get('%Sylph%') as any;

      if (sampleQuest) {
        console.log(`\n🔍 Sample quest: "${sampleQuest.name}"`);
        console.log(`   ID: ${sampleQuest.id}`);
        console.log(`   Level: ${sampleQuest.level}`);
        console.log(`   Prerequisites: ${JSON.parse(sampleQuest.previous_quests || '[]').length}`);
      }

      console.log('\n');
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('\n❌ Failed to seed database:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestDatabase();
}

export { seedQuestDatabase };

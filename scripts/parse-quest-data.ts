#!/usr/bin/env tsx

/**
 * Parse quest data from CSV files using schema definitions
 *
 * This script uses the CSVParser to read Quest.csv and related files,
 * then outputs a clean JSON format for database seeding.
 *
 * Usage:
 *   yarn tsx scripts/parse-quest-data.ts
 */

import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CSVParser } from '../src/parsers/csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const CSV_DIR = join(DATA_DIR, 'game-csv');
const SCHEMA_DIR = join(DATA_DIR, 'game-schemas');
const OUTPUT_FILE = join(DATA_DIR, 'quest-data.json');

async function parseQuestData(): Promise<void> {
  console.log('🎮 Parsing quest data from CSV files...\n');

  try {
    // Create parser with foreign key resolution disabled (to avoid memory issues)
    // We'll just store the IDs and resolve them later in the service layer
    const parser = new CSVParser(SCHEMA_DIR, CSV_DIR, { resolveForeignKeys: false });

    // Parse Quest sheet
    console.log('📥 Parsing Quest.csv...');
    const quests = parser.parseSheet('Quest');
    console.log(`   ✅ Parsed ${quests.size} quests`);

    // Convert Map to array of simplified quest objects
    const questArray: any[] = [];
    let processedCount = 0;
    let skippedCount = 0;

    for (const [id, quest] of quests) {
      // Skip quests with no name (likely invalid/placeholder entries)
      if (!quest.Name || quest.Name.trim() === '') {
        skippedCount++;
        continue;
      }

      questArray.push({
        id: id,
        name: quest.Name || '',
        internalId: quest.Id || '',
        level: quest['ClassJobLevel[0]'] || 0,
        levelOffset: quest.QuestLevelOffset || 0,

        // Class/Job requirements
        classJobCategory:
          typeof quest['ClassJobCategory[0]'] === 'number' ? quest['ClassJobCategory[0]'] : null,
        classJobRequired:
          typeof quest['ClassJob{Required}'] === 'number' ? quest['ClassJob{Required}'] : null,

        // Location
        placeNameId: typeof quest.PlaceName === 'number' ? quest.PlaceName : null,

        // Type and genre
        journalGenreId: typeof quest.JournalGenre === 'number' ? quest.JournalGenre : null,

        // Expansion
        expansionId: typeof quest.Expansion === 'number' ? quest.Expansion : null,

        // Prerequisites - handle arrays of foreign keys
        previousQuests: Array.isArray(quest.PreviousQuest)
          ? quest.PreviousQuest.filter((q: any) => typeof q === 'number' && q > 0)
          : [],

        // Rewards
        gilReward: quest.GilReward || 0,
        expFactor: quest.ExpFactor || 0,

        // Flags
        isRepeatable: quest.IsRepeatable === true,
        canCancel: quest.CanCancel === true,

        // Quest giver/target
        issuerStart: typeof quest['Issuer{Start}'] === 'number' ? quest['Issuer{Start}'] : null,
        issuerLocation:
          typeof quest['Issuer{Location}'] === 'number' ? quest['Issuer{Location}'] : null,
        targetEnd: typeof quest['Target{End}'] === 'number' ? quest['Target{End}'] : null,

        // Type
        type: quest.Type || 0,

        // Sort key for ordering
        sortKey: quest.SortKey || 0,
      });

      processedCount++;
    }

    // Write output
    console.log('\n💾 Writing quest data to JSON...');
    await writeFile(OUTPUT_FILE, JSON.stringify(questArray, null, 2), 'utf-8');

    // Stats
    console.log('\n✅ Successfully parsed quest data');
    console.log(`   Output: ${OUTPUT_FILE}`);
    console.log(`   Size: ${(JSON.stringify(questArray).length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n📊 Statistics:`);
    console.log(`   Total quests processed: ${processedCount}`);
    console.log(`   Skipped (no name): ${skippedCount}`);
    console.log(`   Final quest count: ${questArray.length}`);

    // Sample quest
    const sampleQuest = questArray.find((q) => q.name.includes('Sylph'));
    if (sampleQuest) {
      console.log(`\n🔍 Sample quest: "${sampleQuest.name}"`);
      console.log(`   ID: ${sampleQuest.id}`);
      console.log(`   Level: ${sampleQuest.level}`);
      console.log(`   Prerequisites: ${sampleQuest.previousQuests.length}`);
    }

    console.log('\n');
  } catch (error) {
    console.error('\n❌ Failed to parse quest data:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  parseQuestData();
}

export { parseQuestData };

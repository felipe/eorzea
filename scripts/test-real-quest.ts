#!/usr/bin/env tsx
/**
 * Test parsing real Quest data from ffxiv-datamining
 * This proves our CSV parser works with actual game data
 */

import { CSVParser } from '../src/parsers/csvParser.js';
import { join } from 'path';

const schemaDir = join(process.cwd(), 'data', 'game-schemas');
const csvDir = join(process.cwd(), 'data', 'ffxiv-datamining', 'csv');

console.log('\n🎮 Testing CSV Parser with Real FFXIV Quest Data\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

try {
  // Create parser
  const parser = new CSVParser(schemaDir, csvDir);

  console.log('📥 Parsing Quest.csv (30MB, ~5,420 quests)...\n');

  // Parse the Quest sheet
  const quests = parser.parseSheet('Quest');

  console.log(`✅ Successfully parsed ${quests.size} quests!\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test with the "Sylph Says" quest (ID 66256)
  const questId = 66256;
  const quest = quests.get(questId);

  if (!quest) {
    console.error(`❌ Quest ${questId} not found!`);
    process.exit(1);
  }

  console.log('📋 Quest Details (from local CSV parsing):\n');
  console.log(`   ID: ${questId}`);
  console.log(`   Name: ${quest.Name}`);
  console.log(`   Level: ${quest['ClassJobLevel[0]'] || 'N/A'}`);
  console.log(`   Internal ID: ${quest.Id || 'N/A'}`);

  // Check if we have prerequisite data
  if (quest.PreviousQuest) {
    console.log(
      `\n   Prerequisites Found: ${Array.isArray(quest.PreviousQuest) ? quest.PreviousQuest.length : 1}`
    );
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ SUCCESS! CSV Parser works with real FFXIV data!\n');

  // Test searching for "Feast of Famine" quest
  console.log('🔍 Searching for "Feast of Famine" quest...\n');

  let feastOfFamineId: number | null = null;
  for (const [id, q] of quests) {
    if (q.Name === 'Feast of Famine') {
      feastOfFamineId = id;
      console.log(`   ✅ Found: ID ${id}`);
      console.log(`   Name: ${q.Name}`);
      console.log(`   Level: ${q['ClassJobLevel[0]'] || 'N/A'}`);
      console.log(`   Internal ID: ${q.Id || 'N/A'}`);
      break;
    }
  }

  if (!feastOfFamineId) {
    console.log('   ❌ Quest "Feast of Famine" not found');
  }

  // Show a few more quests as examples
  console.log('\n📊 Sample of other quests:\n');
  let count = 0;
  for (const [id, q] of quests) {
    if (q.Name && q.Name.trim() !== '' && count < 5) {
      console.log(`   ${id}: ${q.Name}`);
      count++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} catch (error) {
  console.error('\n❌ Error:', error);
  if (error instanceof Error) {
    console.error(error.stack);
  }
  process.exit(1);
}

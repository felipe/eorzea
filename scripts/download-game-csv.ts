#!/usr/bin/env tsx
/**
 * Downloads FFXIV game data CSV files from the xivapi/ffxiv-datamining repository
 *
 * This script downloads the necessary CSV files for:
 * - Items (Item.csv, ItemSearchCategory.csv, etc.)
 * - Recipes/Crafting (Recipe.csv, RecipeLevelTable.csv, etc.)
 * - Gathering (GatheringPoint.csv, GatheringItem.csv, etc.)
 * - Mounts (Mount.csv)
 * - Minions/Companions (Companion.csv)
 * - Orchestrion Rolls (Orchestrion.csv)
 * - Quests (Quest.csv)
 *
 * Usage: tsx scripts/download-game-csv.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv';
const OUTPUT_DIR = path.join(__dirname, '../data/game-csv');

// List of CSV files to download
const CSV_FILES = [
  // Core Item Files
  'Item.csv',
  'ItemAction.csv',
  'ItemSearchCategory.csv',
  'ItemUICategory.csv',

  // Crafting & Recipes
  'Recipe.csv',
  'RecipeLevelTable.csv',
  'CraftType.csv',

  // Gathering
  'GatheringPoint.csv',
  'GatheringPointBase.csv',
  'GatheringItem.csv',
  'GatheringItemPoint.csv',
  'GatheringType.csv',
  'GatheringSubCategory.csv',

  // Collectibles
  'Mount.csv',
  'Companion.csv',
  'Orchestrion.csv',
  'OrchestrionCategory.csv',

  // Additional Data
  'ClassJob.csv',
  'PlaceName.csv',
  'Map.csv',
  'TerritoryType.csv',
  'Level.csv',
];

/**
 * Download a file from a URL
 */
function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destination);
          downloadFile(redirectUrl, destination).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destination);
        reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(destination);
      reject(err);
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('📦 FFXIV Game Data CSV Downloader');
  console.log('==================================\n');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}\n`);
  }

  console.log(`📥 Downloading ${CSV_FILES.length} CSV files...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const csvFile of CSV_FILES) {
    const url = `${GITHUB_RAW_BASE}/${csvFile}`;
    const destination = path.join(OUTPUT_DIR, csvFile);

    try {
      process.stdout.write(`  ${csvFile.padEnd(40)} ... `);
      await downloadFile(url, destination);

      const stats = fs.statSync(destination);
      const sizeKB = (stats.size / 1024).toFixed(2);

      console.log(`✅ ${sizeKB} KB`);
      successCount++;
    } catch (error) {
      console.log(`❌ FAILED`);
      console.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
      failCount++;
    }
  }

  console.log('\n==================================');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed:  ${failCount}`);
  console.log(`📁 Output:  ${OUTPUT_DIR}`);
  console.log('==================================\n');

  if (failCount > 0) {
    console.error('⚠️  Some files failed to download. Please check the errors above.');
    process.exit(1);
  }

  console.log('🎉 All CSV files downloaded successfully!');
}

// Run main function
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env tsx

/**
 * Download quest-related game data from FFXIV Datamining GitHub repositories
 *
 * This script downloads CSV files and their corresponding schema definitions
 * from the xivapi organization's repositories.
 *
 * CSV Source: https://github.com/xivapi/ffxiv-datamining
 * Schema Source: https://github.com/xivapi/SaintCoinach
 * License: Public domain (game data)
 *
 * Usage:
 *   yarn tsx scripts/download-quest-data.ts
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GitHub raw content URLs
const CSV_BASE_URL = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv';
const SCHEMA_BASE_URL =
  'https://raw.githubusercontent.com/xivapi/SaintCoinach/master/SaintCoinach/Definitions';

const OUTPUT_CSV_DIR = join(__dirname, '..', 'data', 'game-csv');
const OUTPUT_SCHEMA_DIR = join(__dirname, '..', 'data', 'game-schemas');

// Files we need to download for quest functionality
const FILES_TO_DOWNLOAD = [
  'Quest',
  'ClassJob',
  'ClassJobCategory',
  'PlaceName',
  'ExVersion',
  'JournalGenre',
  'Level',
  'ENpcResident',
  'Item',
];

interface DownloadResult {
  file: string;
  type: 'csv' | 'schema';
  success: boolean;
  size?: number;
  error?: string;
}

async function downloadFile(url: string, outputPath: string): Promise<DownloadResult> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        file: outputPath,
        type: url.includes('.csv') ? 'csv' : 'schema',
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.text();
    await writeFile(outputPath, data, 'utf-8');

    return {
      file: outputPath,
      type: url.includes('.csv') ? 'csv' : 'schema',
      success: true,
      size: data.length,
    };
  } catch (error) {
    return {
      file: outputPath,
      type: url.includes('.csv') ? 'csv' : 'schema',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function downloadQuestData(): Promise<void> {
  console.log('🎮 Downloading FFXIV Quest Data from GitHub...\n');

  // Ensure output directories exist
  await mkdir(OUTPUT_CSV_DIR, { recursive: true });
  await mkdir(OUTPUT_SCHEMA_DIR, { recursive: true });

  const results: DownloadResult[] = [];

  // Download all files
  for (const fileName of FILES_TO_DOWNLOAD) {
    // Download CSV
    console.log(`📥 Downloading ${fileName}.csv...`);
    const csvUrl = `${CSV_BASE_URL}/${fileName}.csv`;
    const csvPath = join(OUTPUT_CSV_DIR, `${fileName}.csv`);
    const csvResult = await downloadFile(csvUrl, csvPath);
    results.push(csvResult);

    if (csvResult.success) {
      console.log(`   ✅ CSV saved (${(csvResult.size! / 1024).toFixed(2)} KB)`);
    } else {
      console.log(`   ❌ CSV failed: ${csvResult.error}`);
    }

    // Download schema
    console.log(`📥 Downloading ${fileName}.json schema...`);
    const schemaUrl = `${SCHEMA_BASE_URL}/${fileName}.json`;
    const schemaPath = join(OUTPUT_SCHEMA_DIR, `${fileName}.json`);
    const schemaResult = await downloadFile(schemaUrl, schemaPath);
    results.push(schemaResult);

    if (schemaResult.success) {
      console.log(`   ✅ Schema saved (${(schemaResult.size! / 1024).toFixed(2)} KB)\n`);
    } else {
      console.log(`   ❌ Schema failed: ${schemaResult.error}\n`);
    }
  }

  // Summary
  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const totalSize = results.filter((r) => r.success).reduce((sum, r) => sum + (r.size || 0), 0);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Download Summary:\n');
  console.log(`   Total files: ${successCount}/${totalCount} successful`);
  console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

  if (successCount < totalCount) {
    console.log('\n⚠️  Some files failed to download. Check the output above for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All quest data downloaded successfully!');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadQuestData();
}

export { downloadQuestData };

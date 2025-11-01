#!/usr/bin/env tsx

/**
 * Download fish data from Carbuncle Plushy Fish Tracker
 *
 * This script downloads the latest compiled fish data from the
 * Carbuncle Plushy Fish Tracker web app.
 *
 * Source: https://ff14fish.carbuncleplushy.com
 * Repository: https://github.com/icykoneko/ff14-fish-tracker-app
 * License: MIT
 *
 * Usage:
 *   yarn tsx scripts/download-fish-data.ts
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_URL = 'https://ff14fish.carbuncleplushy.com/js/app/data.js';
const OUTPUT_DIR = join(__dirname, '..', 'data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'fish-data-raw.js');

async function downloadFishData(): Promise<void> {
  console.log('🐟 Downloading fish data from Carbuncle Plushy...');
  console.log(`   Source: ${DATA_URL}`);

  try {
    // Fetch the data
    const response = await fetch(DATA_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();

    // Ensure output directory exists
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Write to file
    await writeFile(OUTPUT_FILE, data, 'utf-8');

    console.log(`✅ Successfully downloaded fish data`);
    console.log(`   Saved to: ${OUTPUT_FILE}`);
    console.log(`   Size: ${(data.length / 1024).toFixed(2)} KB`);

    // Extract some stats
    const fishCount = (data.match(/"_id":/g) || []).length;
    console.log(`   Approximate fish count: ${fishCount}`);
  } catch (error) {
    console.error('❌ Failed to download fish data:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadFishData();
}

export { downloadFishData };

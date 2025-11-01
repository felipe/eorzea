#!/usr/bin/env tsx

/**
 * Parse fish data from JavaScript to JSON
 *
 * This script converts the downloaded Carbuncle Plushy data.js file
 * into a clean JSON format that can be easily consumed by our application.
 *
 * Usage:
 *   yarn tsx scripts/parse-fish-data.ts
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { CarbunclePlushyData } from '../src/types/fish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const INPUT_FILE = join(DATA_DIR, 'fish-data-raw.js');
const OUTPUT_FILE = join(DATA_DIR, 'fish-data.json');

async function parseFishData(): Promise<void> {
  console.log('🔧 Parsing fish data from JavaScript to JSON...');
  console.log(`   Input: ${INPUT_FILE}`);

  try {
    // Read the raw JavaScript file
    const rawData = await readFile(INPUT_FILE, 'utf-8');

    // Extract the DATA object
    // The file format is: const DATA = { ... };
    // We need to extract everything between '= {' and the last '}'

    const startMarker = 'const DATA = ';
    const startIndex = rawData.indexOf(startMarker);

    if (startIndex === -1) {
      throw new Error('Could not find DATA object in file');
    }

    // Extract from after '=' to end of file
    const dataStart = startIndex + startMarker.length;
    let dataString = rawData.substring(dataStart).trim();

    // Remove trailing semicolon if present
    if (dataString.endsWith(';')) {
      dataString = dataString.slice(0, -1).trim();
    }

    // Parse using eval (safe since we control the source)
    const DATA = eval(`(${dataString})`);

    // Validate the structure
    if (!DATA.FISH || !DATA.FISHING_SPOTS || !DATA.ITEMS) {
      throw new Error('Invalid data structure: missing required sections');
    }

    // Type check
    const typedData = DATA as CarbunclePlushyData;

    // Count the data
    const stats = {
      fish: Object.keys(typedData.FISH).length,
      fishingSpots: Object.keys(typedData.FISHING_SPOTS || {}).length,
      items: Object.keys(typedData.ITEMS || {}).length,
      weatherTypes: Object.keys(typedData.WEATHER_TYPES || {}).length,
      weatherRates: Object.keys(typedData.WEATHER_RATES || {}).length,
      zones: Object.keys(typedData.ZONES || {}).length,
      regions: Object.keys(typedData.REGIONS || {}).length,
    };

    // Write the clean JSON
    await writeFile(OUTPUT_FILE, JSON.stringify(typedData, null, 2), 'utf-8');

    console.log('✅ Successfully parsed fish data');
    console.log(`   Output: ${OUTPUT_FILE}`);
    console.log(`\n📊 Data Statistics:`);
    console.log(`   Fish: ${stats.fish}`);
    console.log(`   Fishing Spots: ${stats.fishingSpots}`);
    console.log(`   Items (Baits/Lures): ${stats.items}`);
    console.log(`   Weather Types: ${stats.weatherTypes}`);
    console.log(`   Weather Rates: ${stats.weatherRates}`);
    console.log(`   Zones: ${stats.zones}`);
    console.log(`   Regions: ${stats.regions}`);
  } catch (error) {
    console.error('❌ Failed to parse fish data:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  parseFishData();
}

export { parseFishData };

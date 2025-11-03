#!/usr/bin/env node

/**
 * Download and parse gathering data from ffxiv-datamining repository
 * This fetches CSVs for gathering nodes and items
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import Papa from 'papaparse';

const DATA_DIR = join(process.cwd(), 'data', 'raw');
const BASE_URL = 'https://raw.githubusercontent.com/xivapi/ffxiv-datamining/master/csv';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Download a CSV file from the repository
 */
async function downloadCSV(filename: string): Promise<string> {
  const url = `${BASE_URL}/${filename}`;
  console.log(`Downloading ${filename}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${filename}: ${response.statusText}`);
    }
    const content = await response.text();

    // Save to local file
    const localPath = join(DATA_DIR, filename);
    writeFileSync(localPath, content);
    console.log(`  ✓ Saved to ${localPath}`);

    return content;
  } catch (error) {
    console.error(`  ✗ Error downloading ${filename}:`, error);
    throw error;
  }
}

/**
 * Parse CSV content into JavaScript objects
 */
function parseCSV(content: string): any[] {
  const result = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    console.error('CSV parsing errors:', result.errors);
  }

  // First three rows are metadata
  // Row 0: indices
  // Row 1: column names
  // Row 2: data types
  const headers = result.data[1] as string[];
  const dataRows = result.data.slice(3) as any[][];

  // Convert to objects using headers
  return dataRows.map((row) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      if (header && header !== '#') {
        obj[header] = row[index];
      }
    });
    return obj;
  });
}

/**
 * Main function to download and process gathering data
 */
async function main() {
  console.log('Starting gathering data download...\n');

  try {
    // Download required CSV files
    const files = [
      'GatheringPoint.csv',
      'GatheringPointBase.csv',
      'GatheringItem.csv',
      'GatheringItemPoint.csv',
      'GatheringPointBonus.csv',
      'GatheringPointBonusType.csv',
      'GatheringType.csv',
      'GatheringPointTransient.csv',
      'PlaceName.csv',
      'TerritoryType.csv',
      'Map.csv',
      'Item.csv',
    ];

    const downloadedData: Record<string, any[]> = {};

    for (const file of files) {
      try {
        const content = await downloadCSV(file);
        const parsed = parseCSV(content);
        downloadedData[file.replace('.csv', '')] = parsed;
        console.log(`  Parsed ${parsed.length} rows from ${file}\n`);
      } catch (error) {
        console.error(`Failed to process ${file}, skipping...`);
      }
    }

    // Create summary of what we downloaded
    console.log('\n=== Download Summary ===');
    console.log(`GatheringPoints: ${downloadedData.GatheringPoint?.length || 0} nodes`);
    console.log(
      `GatheringPointBase: ${downloadedData.GatheringPointBase?.length || 0} base entries`
    );
    console.log(`GatheringItems: ${downloadedData.GatheringItem?.length || 0} gathering items`);
    console.log(`Items: ${downloadedData.Item?.length || 0} item definitions`);
    console.log(`PlaceNames: ${downloadedData.PlaceName?.length || 0} locations`);

    // Save parsed data as JSON for inspection
    const jsonPath = join(DATA_DIR, 'gathering-data.json');
    writeFileSync(jsonPath, JSON.stringify(downloadedData, null, 2));
    console.log(`\nSaved parsed data to ${jsonPath}`);

    // Show sample of gathering point data structure
    if (downloadedData.GatheringPoint && downloadedData.GatheringPoint.length > 0) {
      console.log('\n=== Sample GatheringPoint Structure ===');
      const sample = downloadedData.GatheringPoint.find((p) => p.key && p.Type > 0);
      if (sample) {
        console.log(JSON.stringify(sample, null, 2));
      }
    }

    if (downloadedData.GatheringPointBase && downloadedData.GatheringPointBase.length > 0) {
      console.log('\n=== Sample GatheringPointBase Structure ===');
      const sample = downloadedData.GatheringPointBase.find((p) => p.key && p.GatheringLevel > 0);
      if (sample) {
        console.log(JSON.stringify(sample, null, 2));
      }
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

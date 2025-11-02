#!/usr/bin/env tsx

/**
 * Add weather names to fish database
 *
 * Reads fish-data.json and updates weather_types table with names
 *
 * Usage:
 *   yarn tsx scripts/seed-weather-names.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'fish.db');
const FISH_DATA_FILE = join(DATA_DIR, 'fish-data.json');

function main() {
  console.log('🌤️  Seeding weather names into fish database...\n');

  // Open database
  const db = new Database(DB_FILE);

  // Add name column if it doesn't exist
  console.log('📐 Adding name column to weather_types...');
  try {
    db.exec('ALTER TABLE weather_types ADD COLUMN name TEXT');
  } catch (error) {
    // Column might already exist
    console.log('   Column already exists, updating values...');
  }

  // Load fish data
  console.log('📖 Reading fish-data.json...');
  const content = readFileSync(FISH_DATA_FILE, 'utf-8');
  const fishData = JSON.parse(content);

  const weatherTypes = fishData.WEATHER_TYPES;
  console.log(`   Found ${Object.keys(weatherTypes).length} weather types`);

  // Prepare update statement
  const update = db.prepare('UPDATE weather_types SET name = ? WHERE id = ?');

  // Start transaction
  const updateMany = db.transaction((weathers) => {
    for (const weather of weathers) {
      update.run(weather.name, weather.id);
    }
  });

  // Parse and update weather types
  const weathers: Array<{ id: number; name: string }> = [];

  Object.entries(weatherTypes).forEach(([id, data]: [string, any]) => {
    weathers.push({
      id: parseInt(id),
      name: data.name_en,
    });
  });

  console.log(`💾 Updating ${weathers.length} weather types...`);
  updateMany(weathers);

  // Verify
  const count = db
    .prepare('SELECT COUNT(*) as count FROM weather_types WHERE name IS NOT NULL')
    .get() as {
    count: number;
  };
  console.log(`\n✅ Database now has ${count.count} weather types with names`);

  // Show some examples
  console.log('\n📋 Sample weather types:');
  const samples = db.prepare('SELECT id, name FROM weather_types LIMIT 5').all() as Array<{
    id: number;
    name: string;
  }>;

  samples.forEach((weather) => {
    console.log(`   ${weather.id}: ${weather.name}`);
  });

  db.close();
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

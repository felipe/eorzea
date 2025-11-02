#!/usr/bin/env tsx

/**
 * Seed fish database from parsed JSON data
 *
 * This script creates a SQLite database and populates it with
 * fish, fishing spots, baits, weather, and zone data.
 *
 * Usage:
 *   yarn tsx scripts/seed-fish-db.ts
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import type { CarbunclePlushyData } from '../src/types/fish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const INPUT_FILE = join(DATA_DIR, 'fish-data.json');
const DB_FILE = join(DATA_DIR, 'fish.db');

function createSchema(db: Database.Database): void {
  console.log('📐 Creating database schema...');

  // Fish table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fish (
      id INTEGER PRIMARY KEY,
      patch REAL,
      location_id INTEGER,
      start_hour INTEGER NOT NULL,
      end_hour INTEGER NOT NULL,
      weather_set TEXT, -- JSON array
      previous_weather_set TEXT, -- JSON array
      best_catch_path TEXT, -- JSON array of bait IDs
      predators TEXT, -- JSON array
      intuition_length INTEGER,
      folklore BOOLEAN,
      collectable BOOLEAN,
      fish_eyes BOOLEAN NOT NULL,
      big_fish BOOLEAN NOT NULL,
      snagging BOOLEAN,
      lure INTEGER,
      hookset TEXT,
      tug TEXT,
      gig TEXT,
      aquarium_water TEXT,
      aquarium_size INTEGER,
      data_missing BOOLEAN
    );
  `);

  // Fishing spots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fishing_spots (
      id INTEGER PRIMARY KEY,
      zone_id INTEGER,
      territory INTEGER,
      x REAL,
      y REAL,
      radius REAL,
      category INTEGER
    );
  `);

  // Baits/Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS baits (
      id INTEGER PRIMARY KEY,
      icon INTEGER
    );
  `);

  // Weather types table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_types (
      id INTEGER PRIMARY KEY,
      icon INTEGER
    );
  `);

  // Weather rates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_rates (
      id INTEGER PRIMARY KEY,
      map_id INTEGER,
      map_scale INTEGER,
      zone_id INTEGER,
      region_id INTEGER,
      rates TEXT NOT NULL -- JSON array of [weather, rate]
    );
  `);

  // Zones table
  db.exec(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY,
      region_id INTEGER,
      weather_rate INTEGER
    );
  `);

  // Regions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_fish_big ON fish(big_fish);
    CREATE INDEX IF NOT EXISTS idx_fish_patch ON fish(patch);
    CREATE INDEX IF NOT EXISTS idx_fish_location ON fish(location_id);
    CREATE INDEX IF NOT EXISTS idx_fishing_spots_zone ON fishing_spots(zone_id);
  `);

  console.log('✅ Schema created successfully');
}

async function seedDatabase(): Promise<void> {
  console.log('🌱 Seeding fish database...');
  console.log(`   Input: ${INPUT_FILE}`);
  console.log(`   Database: ${DB_FILE}`);

  try {
    // Read the JSON data
    const jsonData = await readFile(INPUT_FILE, 'utf-8');
    const data = JSON.parse(jsonData) as CarbunclePlushyData;

    // Open database
    const db = new Database(DB_FILE);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create schema
    createSchema(db);

    // Prepare insert statements
    const insertFish = db.prepare(`
      INSERT OR REPLACE INTO fish (
        id, patch, location_id, start_hour, end_hour,
        weather_set, previous_weather_set, best_catch_path,
        predators, intuition_length, folklore, collectable,
        fish_eyes, big_fish, snagging, lure, hookset, tug, gig,
        aquarium_water, aquarium_size, data_missing
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const insertSpot = db.prepare(`
      INSERT OR REPLACE INTO fishing_spots (
        id, zone_id, territory, x, y, radius, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertBait = db.prepare(`
      INSERT OR REPLACE INTO baits (id, icon) VALUES (?, ?)
    `);

    const insertWeatherType = db.prepare(`
      INSERT OR REPLACE INTO weather_types (id, icon) VALUES (?, ?)
    `);

    const insertWeatherRate = db.prepare(`
      INSERT OR REPLACE INTO weather_rates (id, map_id, map_scale, zone_id, region_id, rates) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertZone = db.prepare(`
      INSERT OR REPLACE INTO zones (id, region_id, weather_rate) VALUES (?, ?, ?)
    `);

    const insertRegion = db.prepare(`
      INSERT OR REPLACE INTO regions (id) VALUES (?)
    `);

    // Start transaction for bulk insert
    const insertAll = db.transaction(() => {
      let counts = {
        fish: 0,
        spots: 0,
        baits: 0,
        weatherTypes: 0,
        weatherRates: 0,
        zones: 0,
        regions: 0,
      };

      // Insert fish
      console.log('  Inserting fish...');
      for (const fish of Object.values(data.FISH)) {
        insertFish.run(
          fish._id,
          fish.patch,
          fish.location,
          fish.startHour,
          fish.endHour,
          JSON.stringify(fish.weatherSet),
          JSON.stringify(fish.previousWeatherSet),
          JSON.stringify(fish.bestCatchPath),
          JSON.stringify(fish.predators),
          fish.intuitionLength,
          fish.folklore === true ? 1 : fish.folklore === false ? 0 : null,
          fish.collectable === true ? 1 : fish.collectable === false ? 0 : null,
          fish.fishEyes ? 1 : 0,
          fish.bigFish ? 1 : 0,
          fish.snagging === true ? 1 : fish.snagging === false ? 0 : null,
          fish.lure,
          fish.hookset,
          fish.tug,
          fish.gig,
          fish.aquarium?.water || null,
          fish.aquarium?.size || null,
          fish.dataMissing === true ? 1 : fish.dataMissing === false ? 0 : null
        );
        counts.fish++;
      }

      // Insert fishing spots
      if (data.FISHING_SPOTS) {
        console.log('  Inserting fishing spots...');
        for (const spot of Object.values(data.FISHING_SPOTS)) {
          // Look up zone_id from weather rates using territory_id
          const territoryWeather = data.WEATHER_RATES[spot.territory_id];
          const zoneId = territoryWeather?.zone_id || null;

          insertSpot.run(
            spot._id,
            zoneId,
            spot.territory_id || null,
            spot.map_coords?.[0] || null,
            spot.map_coords?.[1] || null,
            spot.map_coords?.[2] || null,
            null // category
          );
          counts.spots++;
        }
      }

      // Insert baits
      if (data.ITEMS) {
        console.log('  Inserting baits...');
        for (const bait of Object.values(data.ITEMS)) {
          insertBait.run(bait._id, bait.icon || null);
          counts.baits++;
        }
      }

      // Insert weather types
      if (data.WEATHER_TYPES) {
        console.log('  Inserting weather types...');
        for (const weather of Object.values(data.WEATHER_TYPES)) {
          insertWeatherType.run(weather._id, weather.icon || null);
          counts.weatherTypes++;
        }
      }

      // Insert weather rates
      if (data.WEATHER_RATES) {
        console.log('  Inserting weather rates...');
        for (const [id, rate] of Object.entries(data.WEATHER_RATES)) {
          insertWeatherRate.run(
            parseInt(id),
            (rate as any).map_id || null,
            (rate as any).map_scale || null,
            (rate as any).zone_id || null,
            (rate as any).region_id || null,
            JSON.stringify((rate as any).weather_rates || [])
          );
          counts.weatherRates++;
        }
      }

      // Insert zones
      if (data.ZONES) {
        console.log('  Inserting zones...');
        for (const zone of Object.values(data.ZONES)) {
          insertZone.run(zone._id, zone.regionId || null, zone.weatherRate || null);
          counts.zones++;
        }
      }

      // Insert regions
      if (data.REGIONS) {
        console.log('  Inserting regions...');
        for (const region of Object.values(data.REGIONS)) {
          insertRegion.run(region._id);
          counts.regions++;
        }
      }

      return counts;
    });

    // Execute the transaction
    const counts = insertAll();

    // Close database
    db.close();

    console.log('✅ Database seeded successfully!');
    console.log(`\n📊 Records inserted:`);
    console.log(`   Fish: ${counts.fish}`);
    console.log(`   Fishing Spots: ${counts.spots}`);
    console.log(`   Baits/Items: ${counts.baits}`);
    console.log(`   Weather Types: ${counts.weatherTypes}`);
    console.log(`   Weather Rates: ${counts.weatherRates}`);
    console.log(`   Zones: ${counts.zones}`);
    console.log(`   Regions: ${counts.regions}`);
  } catch (error) {
    console.error('❌ Failed to seed database:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };

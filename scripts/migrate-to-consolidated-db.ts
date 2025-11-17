#!/usr/bin/env tsx
/**
 * Migrate from old database structure to new consolidated structure
 *
 * Old structure:
 * - profile.db (user data)
 * - game.db (game data + user tracking)
 * - fish.db (fishing data)
 *
 * New structure:
 * - userData.db (all user data)
 * - gameData.db (all game reference data)
 *
 * This script:
 * 1. Creates userData.db from profile.db + user tracking tables from game.db
 * 2. Creates gameData.db from game.db + fish.db (excluding user tracking tables)
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, copyFileSync, readFileSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');

// Old database paths
const OLD_PROFILE_DB = join(DATA_DIR, 'profile.db');
const OLD_GAME_DB = join(DATA_DIR, 'game.db');
const OLD_FISH_DB = join(DATA_DIR, 'fish.db');

// New database paths
const NEW_USER_DB = join(DATA_DIR, 'userData.db');
const NEW_GAME_DB = join(DATA_DIR, 'gameData.db');

// Backup paths
const BACKUP_PROFILE_DB = join(DATA_DIR, 'profile.db.backup');
const BACKUP_GAME_DB = join(DATA_DIR, 'game.db.backup');
const BACKUP_FISH_DB = join(DATA_DIR, 'fish.db.backup');

// Schema paths
const USER_SCHEMA_PATH = join(DATA_DIR, 'userData-schema.sql');
const GAME_SCHEMA_PATH = join(DATA_DIR, 'gameData-schema.sql');

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function error(message: string) {
  console.error(`❌ ${message}`);
}

function checkOldDatabases(): boolean {
  const profileExists = existsSync(OLD_PROFILE_DB);
  const gameExists = existsSync(OLD_GAME_DB);
  const fishExists = existsSync(OLD_FISH_DB);

  if (!profileExists && !gameExists && !fishExists) {
    log('ℹ️', 'No old databases found. Nothing to migrate.');
    return false;
  }

  log('📊', 'Found old databases:');
  if (profileExists) log('  ✓', 'profile.db');
  if (gameExists) log('  ✓', 'game.db');
  if (fishExists) log('  ✓', 'fish.db');

  return true;
}

function checkNewDatabases(): void {
  const userExists = existsSync(NEW_USER_DB);
  const gameExists = existsSync(NEW_GAME_DB);

  if (userExists || gameExists) {
    error('New databases already exist!');
    if (userExists) error('  - userData.db already exists');
    if (gameExists) error('  - gameData.db already exists');
    error('\nPlease remove or rename these files before running the migration.');
    process.exit(1);
  }
}

function createBackups(): void {
  log('💾', 'Creating backups...');

  if (existsSync(OLD_PROFILE_DB)) {
    copyFileSync(OLD_PROFILE_DB, BACKUP_PROFILE_DB);
    log('  ✓', 'Backed up profile.db');
  }

  if (existsSync(OLD_GAME_DB)) {
    copyFileSync(OLD_GAME_DB, BACKUP_GAME_DB);
    log('  ✓', 'Backed up game.db');
  }

  if (existsSync(OLD_FISH_DB)) {
    copyFileSync(OLD_FISH_DB, BACKUP_FISH_DB);
    log('  ✓', 'Backed up fish.db');
  }

  log('✅', 'Backups created successfully');
}

function migrateUserData(): void {
  log('👤', 'Migrating user data...');

  // Copy profile.db to userData.db
  if (existsSync(OLD_PROFILE_DB)) {
    copyFileSync(OLD_PROFILE_DB, NEW_USER_DB);
    log('  ✓', 'Copied profile.db to userData.db');
  } else {
    // Create new userData.db from schema
    const userDb = new Database(NEW_USER_DB);
    const schema = readFileSync(USER_SCHEMA_PATH, 'utf-8');
    userDb.exec(schema);
    userDb.close();
    log('  ✓', 'Created new userData.db from schema');
  }

  // Migrate user tracking tables from game.db if it exists
  if (existsSync(OLD_GAME_DB)) {
    const userDb = new Database(NEW_USER_DB);
    const gameDb = new Database(OLD_GAME_DB, { readonly: true });

    userDb.pragma('foreign_keys = OFF');

    try {
      // Tables to migrate from game.db to userData.db
      const trackingTables = [
        'gathered_items',
        'crafted_items',
        'obtained_mounts',
        'obtained_companions',
        'obtained_orchestrion',
      ];

      for (const table of trackingTables) {
        // Check if table exists in source
        const tableExists = gameDb
          .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
          .get(table);

        if (tableExists) {
          // Get all rows from source table
          const rows = gameDb.prepare(`SELECT * FROM ${table}`).all();

          if (rows.length > 0) {
            // Get column names
            const firstRow = rows[0] as Record<string, any>;
            const columns = Object.keys(firstRow);
            const placeholders = columns.map(() => '?').join(', ');

            // Insert into destination
            const insert = userDb.prepare(
              `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
            );

            const insertMany = userDb.transaction((rowsToInsert: any[]) => {
              for (const row of rowsToInsert) {
                insert.run(...columns.map((col) => row[col]));
              }
            });

            insertMany(rows);
            log('  ✓', `Migrated ${rows.length} rows from ${table}`);
          } else {
            log('  ℹ️', `No data to migrate from ${table}`);
          }
        }
      }
    } catch (err) {
      error(`Error migrating user tracking data: ${err}`);
      throw err;
    } finally {
      userDb.pragma('foreign_keys = ON');
      gameDb.close();
      userDb.close();
    }
  }

  log('✅', 'User data migration complete');
}

function migrateGameData(): void {
  log('🎮', 'Migrating game data...');

  // Create new gameData.db from schema
  const gameDb = new Database(NEW_GAME_DB);
  const schema = readFileSync(GAME_SCHEMA_PATH, 'utf-8');
  gameDb.exec(schema);

  gameDb.pragma('foreign_keys = OFF');

  try {
    // Copy all tables from old game.db except user tracking tables
    if (existsSync(OLD_GAME_DB)) {
      const oldGameDb = new Database(OLD_GAME_DB, { readonly: true });

      // Get all table names
      const tables = oldGameDb
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
        .all() as { name: string }[];

      const userTrackingTables = [
        'gathered_items',
        'crafted_items',
        'obtained_mounts',
        'obtained_companions',
        'obtained_orchestrion',
      ];

      for (const { name } of tables) {
        // Skip user tracking tables
        if (userTrackingTables.includes(name)) {
          log('  ⏭️', `Skipping user tracking table: ${name}`);
          continue;
        }

        // Skip views
        if (name.startsWith('v_')) {
          continue;
        }

        const rows = oldGameDb.prepare(`SELECT * FROM ${name}`).all();

        if (rows.length > 0) {
          const firstRow = rows[0] as Record<string, any>;
          const columns = Object.keys(firstRow);
          const placeholders = columns.map(() => '?').join(', ');

          const insert = gameDb.prepare(
            `INSERT OR REPLACE INTO ${name} (${columns.join(', ')}) VALUES (${placeholders})`
          );

          const insertMany = gameDb.transaction((rowsToInsert: any[]) => {
            for (const row of rowsToInsert) {
              insert.run(...columns.map((col) => row[col]));
            }
          });

          insertMany(rows);
          log('  ✓', `Copied ${rows.length} rows from ${name}`);
        }
      }

      oldGameDb.close();
    }

    // Copy all tables from old fish.db
    if (existsSync(OLD_FISH_DB)) {
      const oldFishDb = new Database(OLD_FISH_DB, { readonly: true });

      const tables = oldFishDb
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
        .all() as { name: string }[];

      for (const { name } of tables) {
        const rows = oldFishDb.prepare(`SELECT * FROM ${name}`).all();

        if (rows.length > 0) {
          const firstRow = rows[0] as Record<string, any>;
          const columns = Object.keys(firstRow);
          const placeholders = columns.map(() => '?').join(', ');

          const insert = gameDb.prepare(
            `INSERT OR REPLACE INTO ${name} (${columns.join(', ')}) VALUES (${placeholders})`
          );

          const insertMany = gameDb.transaction((rowsToInsert: any[]) => {
            for (const row of rowsToInsert) {
              insert.run(...columns.map((col) => row[col]));
            }
          });

          insertMany(rows);
          log('  ✓', `Copied ${rows.length} rows from fish.${name}`);
        }
      }

      oldFishDb.close();
    }
  } catch (err) {
    error(`Error migrating game data: ${err}`);
    throw err;
  } finally {
    gameDb.pragma('foreign_keys = ON');
    gameDb.close();
  }

  log('✅', 'Game data migration complete');
}

async function main() {
  console.log('🔄 Database Migration Tool');
  console.log('=========================\n');

  // Check if old databases exist
  if (!checkOldDatabases()) {
    return;
  }

  // Check if new databases already exist
  checkNewDatabases();

  // Create backups
  createBackups();

  // Migrate user data
  migrateUserData();

  // Migrate game data
  migrateGameData();

  console.log('\n=========================');
  console.log('✅ Migration complete!');
  console.log('\nNew databases created:');
  console.log(`  - ${NEW_USER_DB}`);
  console.log(`  - ${NEW_GAME_DB}`);
  console.log('\nBackups saved as:');
  if (existsSync(BACKUP_PROFILE_DB)) console.log(`  - ${BACKUP_PROFILE_DB}`);
  if (existsSync(BACKUP_GAME_DB)) console.log(`  - ${BACKUP_GAME_DB}`);
  if (existsSync(BACKUP_FISH_DB)) console.log(`  - ${BACKUP_FISH_DB}`);
  console.log('\nYou can now safely delete the old databases if everything works correctly.');
  console.log('=========================\n');
}

main().catch((err) => {
  error(`Migration failed: ${err}`);
  process.exit(1);
});

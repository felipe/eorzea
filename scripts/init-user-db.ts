#!/usr/bin/env tsx
/**
 * Initialize User Database
 *
 * Creates a fresh userData.db with the proper schema.
 * This is for new users who don't have an existing profile.db to migrate.
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const USER_DB_PATH = join(DATA_DIR, 'userData.db');
const SCHEMA_PATH = join(DATA_DIR, 'userData-schema.sql');

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function error(message: string) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  console.log('🔧 Initialize User Database');
  console.log('===========================\n');

  // Check if database already exists
  if (existsSync(USER_DB_PATH)) {
    error(`userData.db already exists at ${USER_DB_PATH}`);
    console.log('If you want to recreate it, please delete or rename the existing file first.');
    return;
  }

  // Check if schema file exists
  if (!existsSync(SCHEMA_PATH)) {
    error(`Schema file not found: ${SCHEMA_PATH}`);
  }

  log('📋', 'Reading schema...');
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  log('🗄️', 'Creating userData.db...');
  const db = new Database(USER_DB_PATH);

  try {
    // Execute schema
    db.exec(schema);
    log('✅', 'Schema applied successfully');

    // Verify tables were created
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];

    log('📊', `Created ${tables.length} tables:`);
    for (const { name } of tables) {
      log('  •', name);
    }
  } catch (err) {
    error(`Failed to create database: ${err}`);
  } finally {
    db.close();
  }

  console.log('\n===========================');
  console.log('✅ User database initialized!');
  console.log(`📁 Database: ${USER_DB_PATH}`);
  console.log('\nYou can now start adding characters and tracking progress.');
  console.log('===========================\n');
}

main();

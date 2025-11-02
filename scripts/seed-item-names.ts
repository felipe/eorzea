#!/usr/bin/env tsx

/**
 * Add item names to fish database
 *
 * Reads Item.csv and adds a new 'items' table with id and name
 * for all items (fish, baits, etc.)
 *
 * Usage:
 *   yarn tsx scripts/seed-item-names.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const CSV_DIR = join(DATA_DIR, 'game-csv');
const DB_FILE = join(DATA_DIR, 'fish.db');
const ITEM_CSV = join(CSV_DIR, 'Item.csv');

async function main() {
  console.log('📦 Seeding item names into fish database...\n');

  // Open database
  const db = new Database(DB_FILE);

  // Create items table
  console.log('📐 Creating items table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  // Clear existing data
  db.exec('DELETE FROM items');

  // Load Item.csv
  console.log('📖 Reading Item.csv...');
  const content = readFileSync(ITEM_CSV, 'utf-8');
  const records = parse(content, { skip_empty_lines: true });

  console.log(`   Found ${records.length - 1} items`);

  // Prepare insert statement
  const insert = db.prepare('INSERT INTO items (id, name) VALUES (?, ?)');

  // Start transaction
  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item.id, item.name);
    }
  });

  // Parse and insert items
  const items: Array<{ id: number; name: string }> = [];
  let skipped = 0;

  records.slice(1).forEach((row: any[]) => {
    const id = parseInt(row[0]);
    const name = row[10]; // Name is at index 10

    if (id && name && name.trim()) {
      items.push({ id, name: name.trim() });
    } else {
      skipped++;
    }
  });

  console.log(`💾 Inserting ${items.length} items...`);
  insertMany(items);

  console.log(`   Inserted: ${items.length}`);
  console.log(`   Skipped: ${skipped} (no name)`);

  // Create index
  console.log('🔍 Creating index on items.id...');
  db.exec('CREATE INDEX IF NOT EXISTS idx_items_id ON items(id)');

  // Verify
  const count = db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number };
  console.log(`\n✅ Database now has ${count.count} items`);

  // Show some examples
  console.log('\n📋 Sample items:');
  const samples = db
    .prepare('SELECT id, name FROM items WHERE id IN (SELECT id FROM fish LIMIT 5)')
    .all() as Array<{ id: number; name: string }>;

  if (samples.length > 0) {
    samples.forEach((item) => {
      console.log(`   ${item.id}: ${item.name}`);
    });
  } else {
    // Show any items
    const anyItems = db.prepare('SELECT id, name FROM items LIMIT 5').all() as Array<{
      id: number;
      name: string;
    }>;
    anyItems.forEach((item) => {
      console.log(`   ${item.id}: ${item.name}`);
    });
  }

  db.close();
  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

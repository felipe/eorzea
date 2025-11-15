/**
 * Seed Title Data
 *
 * Parses Title.csv and inserts title data into game.db
 */

import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const CSV_PATH = join(process.cwd(), 'data', 'ffxiv-datamining', 'csv', 'Title.csv');
const DB_PATH = join(process.cwd(), 'data', 'game.db');

interface TitleRow {
  key: string;
  '0': string; // Masculine
  '1': string; // Feminine
  '2': string; // IsPrefix
  '3': string; // Order
}

async function seedTitles() {
  console.log('📚 Seeding title data...\n');

  const db = new Database(DB_PATH);

  try {
    // Read and parse CSV
    const csvContent = readFileSync(CSV_PATH, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM
    }) as TitleRow[];

    console.log(`Found ${records.length} titles in CSV`);

    // Clear existing data
    db.prepare('DELETE FROM titles').run();
    console.log('✓ Cleared existing title data');

    // Prepare insert statement
    const insert = db.prepare(
      `INSERT INTO titles (id, name_masculine, name_feminine, is_prefix, sort_order)
       VALUES (?, ?, ?, ?, ?)`
    );

    const insertMany = db.transaction((titles: TitleRow[]) => {
      for (const title of titles) {
        // Skip header/empty rows
        if (title.key === '#' || title.key === 'int32' || !title.key) {
          continue;
        }

        const id = parseInt(title.key);
        if (isNaN(id)) continue;

        const masculine = title['0'];
        const feminine = title['1'];
        const isPrefixStr = title['2'];
        const orderStr = title['3'];

        // Skip empty titles
        if (!masculine && !feminine) {
          continue;
        }

        const isPrefix = isPrefixStr === 'True' || isPrefixStr === 'true';
        const sortOrder = orderStr ? parseInt(orderStr) : 0;

        insert.run(id, masculine || '', feminine || '', isPrefix ? 1 : 0, sortOrder);
      }
    });

    // Execute transaction
    insertMany(records);

    // Get count
    const count = db.prepare('SELECT COUNT(*) as count FROM titles').get() as any;
    console.log(`✓ Inserted ${count.count} titles into database\n`);

    // Show some examples
    console.log('Sample titles:');
    const samples = db
      .prepare('SELECT id, name_masculine, is_prefix FROM titles ORDER BY id LIMIT 10')
      .all() as any[];

    samples.forEach((title) => {
      const prefix = title.is_prefix ? '(Prefix)' : '(Suffix)';
      console.log(`  ${title.id}: ${title.name_masculine} ${prefix}`);
    });

    console.log('\n✓ Title seeding complete!');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding titles:', error);
    db.close();
    process.exit(1);
  }
}

seedTitles();

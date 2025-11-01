/**
 * CSV Parser Tests - Proof of Concept
 *
 * These tests validate that our CSV parser can correctly:
 * 1. Parse CSV files with schemas
 * 2. Map columns to field names
 * 3. Convert types (int, bool, string)
 * 4. Resolve foreign keys (links)
 */

import { CSVParser } from '../../src/parsers/csvParser';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('CSVParser - Proof of Concept', () => {
  const testDir = join(process.cwd(), '__tests__', 'fixtures', 'parser-poc');
  const csvDir = join(testDir, 'csv');
  const schemaDir = join(testDir, 'schemas');

  beforeAll(() => {
    // Create test directories
    mkdirSync(csvDir, { recursive: true });
    mkdirSync(schemaDir, { recursive: true });

    // Create test CSV: Item.csv (simplified fish/bait structure)
    // In SaintCoinach CSVs, column indices in the array START AFTER the key
    // So: [key, col0, col1, col2, ...]
    //      ^ skip this, then index 0 = array[1], index 1 = array[2], etc.
    const itemCSV = `key,0,1,2
1,"Tiny Fish",500,True
2,"Big Bait",100,False
3,"Special Lure",200,True`;
    writeFileSync(join(csvDir, 'Item.csv'), itemCSV);

    // Create test CSV: FishingSpot.csv with foreign key to Item
    const spotCSV = `key,0,1,2
100,"Lake Spot",55,1
200,"Ocean Spot",60,2`;
    writeFileSync(join(csvDir, 'FishingSpot.csv'), spotCSV);

    // Create schema: Item.json
    // Schema indices map to: row[index + 1] (because row[0] is the key)
    const itemSchema = {
      sheet: 'Item',
      definitions: [
        { index: 0, name: 'Name', type: 'str' },
        { index: 1, name: 'Price', type: 'int32' },
        { index: 2, name: 'IsCollectable', type: 'bool' },
      ],
    };
    writeFileSync(join(schemaDir, 'Item.json'), JSON.stringify(itemSchema, null, 2));

    // Create schema: FishingSpot.json (with link to Item)
    const spotSchema = {
      sheet: 'FishingSpot',
      definitions: [
        { index: 0, name: 'Name', type: 'str' },
        { index: 1, name: 'ZoneId', type: 'uint16' },
        {
          index: 2,
          name: 'RequiredBait',
          converter: { type: 'link', target: 'Item' },
        },
      ],
    };
    writeFileSync(join(schemaDir, 'FishingSpot.json'), JSON.stringify(spotSchema, null, 2));
  });

  afterAll(() => {
    // Cleanup test files
    rmSync(testDir, { recursive: true, force: true });
  });

  test('should parse simple string column', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const items = parser.parseSheet('Item');

    const fish = items.get(1);
    expect(fish).toBeDefined();
    expect(fish.Name).toBe('Tiny Fish');
  });

  test('should parse integer column', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const items = parser.parseSheet('Item');

    const fish = items.get(1);
    expect(fish.Price).toBe(500);
    expect(typeof fish.Price).toBe('number');
  });

  test('should parse boolean column', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const items = parser.parseSheet('Item');

    const fish = items.get(1);
    expect(fish.IsCollectable).toBe(true);

    const bait = items.get(2);
    expect(bait.IsCollectable).toBe(false);
  });

  test('should resolve foreign key (link)', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const spots = parser.parseSheet('FishingSpot');

    const lakeSpot = spots.get(100);
    expect(lakeSpot).toBeDefined();
    expect(lakeSpot.RequiredBait).toBeDefined();
    expect(lakeSpot.RequiredBait.Name).toBe('Tiny Fish');
    expect(lakeSpot.RequiredBait.Price).toBe(500);
  });

  test('should handle multiple rows', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const items = parser.parseSheet('Item');

    expect(items.size).toBe(3);
    expect(items.has(1)).toBe(true);
    expect(items.has(2)).toBe(true);
    expect(items.has(3)).toBe(true);
  });

  test('should cache parsed sheets', () => {
    const parser = new CSVParser(schemaDir, csvDir);

    // First parse
    const items1 = parser.parseSheet('Item');

    // Second parse (should use cache)
    const items2 = parser.parseSheet('Item');

    expect(items1).toBe(items2); // Same object reference
  });

  test('should include row ID in parsed object', () => {
    const parser = new CSVParser(schemaDir, csvDir);
    const items = parser.parseSheet('Item');

    const fish = items.get(1);
    expect(fish.id).toBe(1);
  });
});

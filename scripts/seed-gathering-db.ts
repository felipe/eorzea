#!/usr/bin/env node

/**
 * Script to create and seed the gathering nodes database
 * This creates a SQLite database with gathering node data for mining, logging, etc.
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'gathering.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Create database
const db = new Database(DB_PATH);

console.log('Creating gathering database schema...');

// Drop existing tables if they exist
db.exec(`
  DROP TABLE IF EXISTS gathering_items;
  DROP TABLE IF EXISTS gathering_nodes;
  DROP TABLE IF EXISTS gathering_zones;
  DROP TABLE IF EXISTS items;
`);

// Create tables
db.exec(`
  -- Zone/Region information
  CREATE TABLE gathering_zones (
    id INTEGER PRIMARY KEY,
    name TEXT,
    region_id INTEGER,
    region_name TEXT
  );

  -- Main gathering nodes table
  CREATE TABLE gathering_nodes (
    id INTEGER PRIMARY KEY,
    name TEXT,
    type TEXT NOT NULL, -- 'mining', 'logging', 'quarrying', 'harvesting'
    level INTEGER NOT NULL,
    location_id INTEGER,
    x REAL,
    y REAL,
    start_hour INTEGER NOT NULL DEFAULT 24, -- 24 means always available
    end_hour INTEGER NOT NULL DEFAULT 24,
    folklore BOOLEAN DEFAULT 0,
    ephemeral BOOLEAN DEFAULT 0,
    legendary BOOLEAN DEFAULT 0,
    patch REAL,
    gathering_point_base_id INTEGER,
    FOREIGN KEY (location_id) REFERENCES gathering_zones(id)
  );

  -- Items available at nodes
  CREATE TABLE gathering_items (
    id INTEGER PRIMARY KEY,
    node_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    slot INTEGER NOT NULL,
    hidden BOOLEAN DEFAULT 0,
    required_gathering INTEGER,
    required_perception INTEGER,
    base_chance INTEGER,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER DEFAULT 1,
    is_collectable BOOLEAN DEFAULT 0,
    reduce_id INTEGER,
    FOREIGN KEY (node_id) REFERENCES gathering_nodes(id)
  );

  -- Item names and details
  CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    name TEXT,
    icon INTEGER,
    level INTEGER
  );

  -- Create indexes for common queries
  CREATE INDEX idx_gathering_nodes_type ON gathering_nodes(type);
  CREATE INDEX idx_gathering_nodes_level ON gathering_nodes(level);
  CREATE INDEX idx_gathering_nodes_location ON gathering_nodes(location_id);
  CREATE INDEX idx_gathering_nodes_time ON gathering_nodes(start_hour, end_hour);
  CREATE INDEX idx_gathering_nodes_special ON gathering_nodes(legendary, ephemeral, folklore);
  CREATE INDEX idx_gathering_items_node ON gathering_items(node_id);
  CREATE INDEX idx_gathering_items_item ON gathering_items(item_id);
`);

console.log('Database schema created successfully!');

// For now, let's add some sample data to test with
// In the next step, we'll download and parse real data from ffxiv-datamining

console.log('Adding sample gathering nodes...');

const insertZone = db.prepare(`
  INSERT INTO gathering_zones (id, name, region_id, region_name)
  VALUES (?, ?, ?, ?)
`);

const insertNode = db.prepare(`
  INSERT INTO gathering_nodes (
    id, name, type, level, location_id, x, y,
    start_hour, end_hour, folklore, ephemeral, legendary, patch
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertItem = db.prepare(`
  INSERT INTO gathering_items (
    node_id, item_id, slot, hidden, required_gathering,
    required_perception, base_chance, min_quantity, max_quantity,
    is_collectable
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertItemName = db.prepare(`
  INSERT INTO items (id, name, icon, level)
  VALUES (?, ?, ?, ?)
`);

// Sample zones
insertZone.run(1, 'Central Thanalan', 1, 'Thanalan');
insertZone.run(2, 'Western Thanalan', 1, 'Thanalan');
insertZone.run(3, 'Eastern Thanalan', 1, 'Thanalan');
insertZone.run(4, 'Central Shroud', 2, 'The Black Shroud');
insertZone.run(5, 'East Shroud', 2, 'The Black Shroud');
insertZone.run(6, 'South Shroud', 2, 'The Black Shroud');

// Sample items
insertItemName.run(5104, 'Copper Ore', 21001, 1);
insertItemName.run(5106, 'Tin Ore', 21001, 5);
insertItemName.run(5110, 'Iron Ore', 21001, 15);
insertItemName.run(5111, 'Silver Ore', 21003, 25);
insertItemName.run(5114, 'Mythril Ore', 21001, 35);
insertItemName.run(5116, 'Cobalt Ore', 21001, 45);
insertItemName.run(5380, 'Maple Log', 22401, 1);
insertItemName.run(5381, 'Ash Log', 22401, 10);
insertItemName.run(5395, 'Elm Log', 22401, 20);
insertItemName.run(5409, 'Walnut Log', 22401, 30);

// Sample nodes - Regular mining nodes (always available)
insertNode.run(1, 'Mineral Deposit', 'mining', 1, 1, 20.5, 22.3, 24, 24, 0, 0, 0, 2.0);
insertNode.run(2, 'Mineral Deposit', 'mining', 5, 1, 25.2, 24.1, 24, 24, 0, 0, 0, 2.0);
insertNode.run(3, 'Mineral Deposit', 'mining', 10, 2, 18.7, 19.5, 24, 24, 0, 0, 0, 2.0);
insertNode.run(4, 'Rocky Outcrop', 'mining', 15, 2, 22.3, 28.9, 24, 24, 0, 0, 0, 2.0);

// Sample nodes - Regular logging nodes (always available)
insertNode.run(5, 'Mature Tree', 'logging', 1, 4, 18.5, 27.2, 24, 24, 0, 0, 0, 2.0);
insertNode.run(6, 'Mature Tree', 'logging', 10, 5, 21.3, 25.8, 24, 24, 0, 0, 0, 2.0);
insertNode.run(7, 'Mature Tree', 'logging', 20, 6, 16.9, 22.4, 24, 24, 0, 0, 0, 2.0);

// Sample nodes - Unspoiled (timed) nodes
insertNode.run(8, 'Unspoiled Mineral Deposit', 'mining', 50, 3, 26.1, 18.3, 1, 3, 0, 0, 0, 2.0);
insertNode.run(9, 'Unspoiled Lush Vegetation', 'logging', 50, 5, 15.8, 21.6, 9, 11, 0, 0, 0, 2.0);

// Sample nodes - Legendary nodes (folklore required)
insertNode.run(10, 'Legendary Mineral Deposit', 'mining', 80, 2, 32.5, 15.2, 4, 6, 1, 0, 1, 5.0);
insertNode.run(11, 'Legendary Mature Tree', 'logging', 80, 6, 28.7, 31.2, 10, 12, 1, 0, 1, 5.0);

// Sample nodes - Ephemeral nodes (for collectables/aetherial reduction)
insertNode.run(12, 'Ephemeral Mineral Deposit', 'mining', 60, 1, 19.4, 30.1, 4, 8, 0, 1, 0, 3.0);
insertNode.run(13, 'Ephemeral Mature Tree', 'logging', 60, 4, 24.6, 18.9, 0, 4, 0, 1, 0, 3.0);

// Add items to nodes
// Node 1 - Level 1 mining
insertItem.run(1, 5104, 1, 0, null, null, 90, 1, 1, 0); // Copper Ore

// Node 2 - Level 5 mining
insertItem.run(2, 5106, 1, 0, null, null, 90, 1, 1, 0); // Tin Ore
insertItem.run(2, 5104, 2, 0, null, null, 90, 1, 1, 0); // Copper Ore

// Node 3 - Level 10 mining
insertItem.run(3, 5110, 1, 0, null, null, 85, 1, 1, 0); // Iron Ore

// Node 4 - Level 15 mining
insertItem.run(4, 5110, 1, 0, null, null, 85, 1, 1, 0); // Iron Ore
insertItem.run(4, 5106, 2, 0, null, null, 85, 1, 1, 0); // Tin Ore

// Node 5 - Level 1 logging
insertItem.run(5, 5380, 1, 0, null, null, 90, 1, 1, 0); // Maple Log

// Node 6 - Level 10 logging
insertItem.run(6, 5381, 1, 0, null, null, 85, 1, 1, 0); // Ash Log

// Node 7 - Level 20 logging
insertItem.run(7, 5395, 1, 0, null, null, 80, 1, 1, 0); // Elm Log

// Node 8 - Unspoiled mining
insertItem.run(8, 5111, 1, 0, 353, null, 95, 1, 1, 0); // Silver Ore
insertItem.run(8, 5114, 6, 1, 370, null, 85, 1, 3, 0); // Mythril Ore (hidden)

// Node 9 - Unspoiled logging
insertItem.run(9, 5409, 1, 0, 353, null, 95, 1, 1, 0); // Walnut Log

// Node 10 - Legendary mining
insertItem.run(10, 5116, 6, 1, 1800, 1200, 60, 1, 1, 1); // Cobalt Ore (collectable, hidden)

console.log('Sample data added successfully!');

// Display summary
const nodeCount = db.prepare('SELECT COUNT(*) as count FROM gathering_nodes').get() as any;
const itemCount = db.prepare('SELECT COUNT(*) as count FROM gathering_items').get() as any;

console.log(`
Database created at: ${DB_PATH}
Total nodes: ${nodeCount.count}
Total node items: ${itemCount.count}

Next steps:
1. Download CSVs from ffxiv-datamining
2. Parse and import real gathering data
3. Test with the gathering tracker service
`);

db.close();

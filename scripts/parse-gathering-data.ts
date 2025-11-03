#!/usr/bin/env node

/**
 * Parse and import gathering data into SQLite database
 * Processes downloaded CSV data from ffxiv-datamining
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data', 'raw');
const DB_PATH = join(process.cwd(), 'data', 'gathering.db');

interface ParsedData {
  GatheringPoint: any[];
  GatheringPointBase: any[];
  GatheringItem: any[];
  GatheringItemPoint: any[];
  GatheringType: any[];
  PlaceName: any[];
  TerritoryType: any[];
  Map: any[];
  Item: any[];
  GatheringPointTransient: any[];
}

/**
 * Load parsed JSON data
 */
function loadData(): ParsedData {
  const jsonPath = join(DATA_DIR, 'gathering-data.json');
  if (!existsSync(jsonPath)) {
    throw new Error(`Data file not found at ${jsonPath}. Run download-gathering-data.ts first.`);
  }

  const content = readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get gathering type name
 */
function getGatheringTypeName(typeId: number): string {
  // Based on GatheringType.csv
  // 0 = Mining, 1 = Quarrying, 2 = Logging, 3 = Harvesting
  switch (typeId) {
    case 0:
      return 'mining';
    case 1:
      return 'quarrying';
    case 2:
      return 'logging';
    case 3:
      return 'harvesting';
    default:
      return 'unknown';
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('Loading parsed data...');
  const data = loadData();

  console.log('Opening database...');
  const db = new Database(DB_PATH);

  // Clear existing data (except our sample data)
  console.log('Clearing existing imported data...');
  db.exec(`
    DELETE FROM gathering_items WHERE node_id > 100;
    DELETE FROM gathering_nodes WHERE id > 100;
    DELETE FROM gathering_zones WHERE id > 100;
    DELETE FROM items WHERE id > 10000;
  `);

  // Prepare insert statements
  const insertZone = db.prepare(`
    INSERT OR REPLACE INTO gathering_zones (id, name, region_id, region_name)
    VALUES (?, ?, ?, ?)
  `);

  const insertNode = db.prepare(`
    INSERT OR REPLACE INTO gathering_nodes (
      id, name, type, level, location_id, x, y,
      start_hour, end_hour, folklore, ephemeral, legendary, patch,
      gathering_point_base_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO gathering_items (
      node_id, item_id, slot, hidden, required_gathering,
      required_perception, base_chance, min_quantity, max_quantity,
      is_collectable
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItemName = db.prepare(`
    INSERT OR REPLACE INTO items (id, name, icon, level)
    VALUES (?, ?, ?, ?)
  `);

  // Import PlaceNames as zones
  console.log('\nImporting zones...');
  let zoneCount = 0;
  for (const place of data.PlaceName) {
    if (place.key && place.Name) {
      insertZone.run(place.key, place.Name, null, null);
      zoneCount++;
    }
  }
  console.log(`  ✓ Imported ${zoneCount} zones`);

  // Import Item names
  console.log('\nImporting item names...');
  let itemCount = 0;
  for (const item of data.Item) {
    if (item.key && item.key > 10000 && item['Name']) {
      insertItemName.run(item.key, item['Name'], item['Icon'] || null, item['Level{Item}'] || 0);
      itemCount++;
      if (itemCount % 1000 === 0) {
        console.log(`  ... ${itemCount} items`);
      }
    }
  }
  console.log(`  ✓ Imported ${itemCount} item names`);

  // Import GatheringPoints as nodes
  console.log('\nProcessing gathering nodes...');
  let nodeCount = 0;
  let nodeItemCount = 0;

  // Create a map of gathering point base data
  const baseDataMap = new Map<number, any>();
  for (const base of data.GatheringPointBase) {
    if (base.key) {
      baseDataMap.set(base.key, base);
    }
  }

  // Create a map of transient data (for ephemeral/legendary info)
  const transientMap = new Map<number, any>();
  for (const trans of data.GatheringPointTransient) {
    if (trans.key) {
      transientMap.set(trans.key, trans);
    }
  }

  // Process each gathering point
  for (const point of data.GatheringPoint) {
    if (!point.key || point.Type === 0) continue;

    const pointId = point.key;
    const baseId = parseInt(point.GatheringPointBase) || 0;
    const base = baseDataMap.get(baseId);
    const transient = transientMap.get(pointId);

    if (!base || !base.GatheringType) continue;

    // Determine gathering type
    const gatheringType = getGatheringTypeName(base.GatheringType);
    if (gatheringType === 'unknown') continue;

    // Get level
    const level = base.GatheringLevel || 1;

    // Get location
    const placeId = point.PlaceName || 0;

    // Check if ephemeral or legendary
    const isEphemeral =
      transient?.EphemeralStartTime !== undefined && transient.EphemeralStartTime >= 0;
    const isLegendary = level >= 80 && (isEphemeral || transient?.GatheringRarePopTimeTable > 0);

    // Get time windows (simplified - would need more complex parsing for actual times)
    let startHour = 24; // Default to always available
    let endHour = 24;

    if (isEphemeral && transient?.EphemeralStartTime !== undefined) {
      // Ephemeral nodes have 4-hour windows
      startHour = Math.floor(transient.EphemeralStartTime / 100);
      endHour = (startHour + 4) % 24;
    } else if (transient?.GatheringRarePopTimeTable > 0) {
      // Unspoiled/legendary nodes - simplified time mapping
      // This would need proper time table parsing
      const timeTable = transient.GatheringRarePopTimeTable;
      if (timeTable === 1) {
        startHour = 1;
        endHour = 3;
      } else if (timeTable === 2) {
        startHour = 4;
        endHour = 6;
      } else if (timeTable === 3) {
        startHour = 9;
        endHour = 11;
      }
    }

    // Insert node
    insertNode.run(
      pointId + 1000, // Offset IDs to avoid conflicts with sample data
      null, // name will be generated
      gatheringType,
      level,
      placeId,
      null, // x coordinate not in this data
      null, // y coordinate not in this data
      startHour,
      endHour,
      isLegendary ? 1 : 0, // folklore approximation
      isEphemeral ? 1 : 0,
      isLegendary ? 1 : 0,
      7.0, // default patch
      baseId
    );
    nodeCount++;

    // Add items for this node
    let slotNum = 1;
    for (let i = 0; i < 8; i++) {
      const itemKey = `Item[${i}]`;
      const itemId = base[itemKey];

      if (itemId && itemId > 0) {
        // Check if this is a hidden item (slots 6-7 often are)
        const isHidden = i >= 6;

        insertItem.run(
          pointId + 1000, // node_id
          itemId, // item_id
          slotNum++, // slot
          isHidden ? 1 : 0, // hidden
          null, // required_gathering
          null, // required_perception
          isHidden ? 70 : 90, // base_chance
          1, // min_quantity
          1, // max_quantity
          0 // is_collectable
        );
        nodeItemCount++;
      }
    }

    if (nodeCount % 100 === 0) {
      console.log(`  ... ${nodeCount} nodes`);
    }
  }

  console.log(`  ✓ Imported ${nodeCount} gathering nodes`);
  console.log(`  ✓ Imported ${nodeItemCount} node items`);

  // Get final statistics
  const stats = db
    .prepare(
      `
    SELECT 
      (SELECT COUNT(*) FROM gathering_nodes) as total_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'mining') as mining_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'logging') as logging_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'quarrying') as quarrying_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'harvesting') as harvesting_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE ephemeral = 1) as ephemeral_nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE legendary = 1) as legendary_nodes,
      (SELECT COUNT(*) FROM gathering_items) as total_items
  `
    )
    .get() as any;

  console.log('\n=== Import Complete ===');
  console.log(`Total nodes: ${stats.total_nodes}`);
  console.log(`  Mining: ${stats.mining_nodes}`);
  console.log(`  Logging: ${stats.logging_nodes}`);
  console.log(`  Quarrying: ${stats.quarrying_nodes}`);
  console.log(`  Harvesting: ${stats.harvesting_nodes}`);
  console.log(`Ephemeral nodes: ${stats.ephemeral_nodes}`);
  console.log(`Legendary nodes: ${stats.legendary_nodes}`);
  console.log(`Total items: ${stats.total_items}`);

  db.close();
  console.log('\n✓ Database updated successfully!');
}

main().catch(console.error);

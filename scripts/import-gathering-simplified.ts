#!/usr/bin/env node

/**
 * Simplified import of gathering data
 * Focus on getting valid, usable data into the database
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data', 'raw');
const DB_PATH = join(process.cwd(), 'data', 'gathering.db');

/**
 * Load parsed JSON data
 */
function loadData(): any {
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

async function main() {
  console.log('Loading data...');
  const data = loadData();

  const db = new Database(DB_PATH);

  // Clear previously imported data
  console.log('Clearing imported data...');
  db.exec(`
    DELETE FROM gathering_items WHERE node_id >= 10000;
    DELETE FROM gathering_nodes WHERE id >= 10000;
  `);

  // Import items first
  const insertItemName = db.prepare(`
    INSERT OR REPLACE INTO items (id, name, icon, level)
    VALUES (?, ?, ?, ?)
  `);

  console.log('\nImporting items...');
  let itemCount = 0;
  for (const item of data.Item) {
    if (item.key > 0 && item.Name && item.Name !== '') {
      try {
        insertItemName.run(item.key, item.Name, item.Icon || 0, item['Level{Item}'] || 0);
        itemCount++;
        if (itemCount % 5000 === 0) {
          console.log(`  ... ${itemCount} items`);
        }
      } catch (err) {
        // Skip errors
      }
    }
  }
  console.log(`  ✓ Imported ${itemCount} items`);

  // Import place names as zones
  const insertZone = db.prepare(`
    INSERT OR REPLACE INTO gathering_zones (id, name)
    VALUES (?, ?)
  `);

  console.log('\nImporting zones...');
  let zoneCount = 0;
  for (const place of data.PlaceName) {
    if (place.key > 0 && place.Name && place.Name !== '') {
      try {
        insertZone.run(place.key, place.Name);
        zoneCount++;
      } catch (err) {
        // Skip errors
      }
    }
  }
  console.log(`  ✓ Imported ${zoneCount} zones`);

  // Process gathering points
  const insertNode = db.prepare(`
    INSERT OR REPLACE INTO gathering_nodes (
      id, type, level, location_id,
      start_hour, end_hour, ephemeral, legendary, patch,
      gathering_point_base_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGatheringItem = db.prepare(`
    INSERT OR REPLACE INTO gathering_items (
      node_id, item_id, slot
    )
    VALUES (?, ?, ?)
  `);

  console.log('\nProcessing gathering points...');

  // Build a map of base data
  const baseMap = new Map();
  for (const base of data.GatheringPointBase) {
    if (base.key > 0) {
      baseMap.set(base.key, base);
    }
  }

  // Build a map of transient data
  const transientMap = new Map();
  for (const trans of data.GatheringPointTransient) {
    if (trans.key > 0) {
      transientMap.set(trans.key, trans);
    }
  }

  let nodeCount = 0;
  let itemMappingCount = 0;

  // Process valid gathering points
  for (const point of data.GatheringPoint) {
    // Skip invalid entries
    if (!point.key || point.key === 0) continue;
    if (!point.Type || point.Type === 0) continue;

    // The Count field often references the base ID
    let baseId = 0;
    if (point.Count > 0 && point.Count < 2000) {
      // Base IDs are typically under 2000
      baseId = point.Count;
    } else if (typeof point.GatheringPointBase === 'number' && point.GatheringPointBase > 0) {
      baseId = point.GatheringPointBase;
    } else {
      continue; // Skip if we can't find a valid base ID
    }

    const base = baseMap.get(baseId);

    if (!base || base.GatheringType === undefined) continue;

    const gatheringType = getGatheringTypeName(base.GatheringType);
    if (gatheringType === 'unknown') continue;

    const nodeId = point.key + 10000; // Offset to avoid conflicts
    const level = base.GatheringLevel || 1;

    // Check if the zone exists, otherwise use default
    let placeId = 1; // Default to Central Thanalan
    if (point.PlaceName) {
      const zoneCheck = db
        .prepare('SELECT id FROM gathering_zones WHERE id = ?')
        .get(point.PlaceName);
      if (zoneCheck) {
        placeId = point.PlaceName;
      }
    }

    // Check for special node types
    const transient = transientMap.get(point.key);
    const isEphemeral = transient?.EphemeralStartTime > 0;
    const hasTimeTable = transient?.GatheringRarePopTimeTable > 0;

    // Simple time window detection
    let startHour = 24;
    let endHour = 24;

    if (isEphemeral) {
      // Ephemeral nodes typically have 4-hour windows
      const ephTime = transient.EphemeralStartTime;
      if (ephTime > 0) {
        startHour = Math.floor(ephTime / 100) % 24;
        endHour = (startHour + 4) % 24;
      }
    } else if (hasTimeTable) {
      // Unspoiled nodes have specific windows
      // This is a simplified mapping
      startHour = 0;
      endHour = 2;
    }

    // Insert the node
    try {
      insertNode.run(
        nodeId,
        gatheringType,
        level,
        placeId,
        startHour,
        endHour,
        isEphemeral ? 1 : 0,
        level >= 80 && hasTimeTable ? 1 : 0,
        7.0,
        baseId
      );
      nodeCount++;
    } catch (err: any) {
      console.error(`Failed to insert node ${nodeId}: ${err.message}`);
      console.error(`  Type: ${gatheringType}, Level: ${level}, PlaceId: ${placeId}`);
      throw err; // Re-throw to see the full error
    }

    // Add items for this node
    let slot = 1;
    for (let i = 0; i < 8; i++) {
      const itemKey = `Item[${i}]`;
      const itemId = base[itemKey];

      if (itemId && itemId > 0) {
        try {
          insertGatheringItem.run(nodeId, itemId, slot++);
          itemMappingCount++;
        } catch (err: any) {
          console.error(`Failed to insert item ${itemId} for node ${nodeId}: ${err.message}`);
        }
      }
    }
  }

  console.log(`  ✓ Created ${nodeCount} gathering nodes`);
  console.log(`  ✓ Added ${itemMappingCount} item mappings`);

  // Display final statistics
  const stats = db
    .prepare(
      `
    SELECT 
      (SELECT COUNT(*) FROM gathering_nodes) as nodes,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'mining') as mining,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'logging') as logging,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'quarrying') as quarrying,
      (SELECT COUNT(*) FROM gathering_nodes WHERE type = 'harvesting') as harvesting,
      (SELECT COUNT(*) FROM gathering_items) as items,
      (SELECT COUNT(DISTINCT item_id) FROM gathering_items) as unique_items
  `
    )
    .get() as any;

  console.log('\n=== Database Statistics ===');
  console.log(`Total nodes: ${stats.nodes}`);
  console.log(`  Mining: ${stats.mining}`);
  console.log(`  Logging: ${stats.logging}`);
  console.log(`  Quarrying: ${stats.quarrying}`);
  console.log(`  Harvesting: ${stats.harvesting}`);
  console.log(`Total item mappings: ${stats.items}`);
  console.log(`Unique items: ${stats.unique_items}`);

  db.close();
  console.log('\n✓ Import complete!');
}

main().catch(console.error);

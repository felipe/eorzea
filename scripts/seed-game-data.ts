#!/usr/bin/env tsx
/**
 * Seed Complete Game Data
 *
 * Parses all FFXIV CSV files and populates the game database with:
 * - Items
 * - Recipes and crafting data
 * - Gathering points and items
 * - Mounts, Companions (Minions), and Orchestrion Rolls
 * - Reference data (ClassJob, PlaceName, etc.)
 *
 * Usage: tsx scripts/seed-game-data.ts [--skip-items] [--skip-crafting] [--skip-gathering] [--skip-collectibles]
 */

import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CSV_DIR = join(process.cwd(), 'data', 'ffxiv-datamining', 'csv');
const DB_PATH = join(process.cwd(), 'data', 'gameData.db');

interface CSVRow {
  [key: string]: string;
}

interface SeedOptions {
  skipItems?: boolean;
  skipCrafting?: boolean;
  skipGathering?: boolean;
  skipCollectibles?: boolean;
  skipReference?: boolean;
}

// Parse command line arguments
function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  return {
    skipItems: args.includes('--skip-items'),
    skipCrafting: args.includes('--skip-crafting'),
    skipGathering: args.includes('--skip-gathering'),
    skipCollectibles: args.includes('--skip-collectibles'),
    skipReference: args.includes('--skip-reference'),
  };
}

// Load and parse CSV file
function loadCSV(filename: string): CSVRow[] | null {
  const path = join(CSV_DIR, filename);

  if (!existsSync(path)) {
    console.log(`  ⚠️  ${filename} not found, skipping...`);
    return null;
  }

  try {
    const csvContent = readFileSync(path, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as CSVRow[];

    return records;
  } catch (error) {
    console.error(`  ❌ Error loading ${filename}:`, error);
    return null;
  }
}

// Initialize database schema
function initializeSchema(db: Database.Database) {
  console.log('\n📋 Initializing database schema...');

  const schemaPath = join(process.cwd(), 'data', 'gameData-schema.sql');

  if (!existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
  }

  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema in a transaction
  const transaction = db.transaction(() => {
    // Split by semicolons and execute each statement
    const statements = schema.split(';').filter(s => s.trim().length > 0);

    for (const statement of statements) {
      try {
        db.exec(statement);
      } catch (error) {
        // Ignore "table already exists" errors
        if (!(error instanceof Error && error.message.includes('already exists'))) {
          throw error;
        }
      }
    }
  });

  transaction();
  console.log('✅ Database schema initialized\n');
}

// Seed reference data
function seedReferenceData(db: Database.Database) {
  console.log('📚 Seeding reference data...');

  // ClassJob
  const classJobs = loadCSV('ClassJob.csv');
  if (classJobs) {
    db.prepare('DELETE FROM class_jobs').run();
    const insertClassJob = db.prepare(`
      INSERT OR REPLACE INTO class_jobs (id, name, abbreviation, starting_level, role, is_limited_job, can_queue_for_duty)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((jobs: CSVRow[]) => {
      for (const job of jobs) {
        const id = parseInt(job['#'] || job['key'] || '0');
        if (id === 0) continue;

        insertClassJob.run(
          id,
          job['Name'] || '',
          job['Abbreviation'] || '',
          parseInt(job['StartingLevel'] || '1'),
          parseInt(job['Role'] || '0'),
          parseInt(job['IsLimitedJob'] || '0') === 1,
          parseInt(job['CanQueueForDuty'] || '1') === 1
        );
      }
    });

    transaction(classJobs);
    console.log(`  ✅ Inserted ${classJobs.length} class/jobs`);
  }

  // PlaceName
  const placeNames = loadCSV('PlaceName.csv');
  if (placeNames) {
    db.prepare('DELETE FROM place_names').run();
    const insertPlace = db.prepare(`
      INSERT OR REPLACE INTO place_names (id, name)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((places: CSVRow[]) => {
      for (const place of places) {
        const id = parseInt(place['#'] || place['key'] || '0');
        if (id === 0) continue;

        insertPlace.run(id, place['Name'] || '');
      }
    });

    transaction(placeNames);
    console.log(`  ✅ Inserted ${placeNames.length} place names`);
  }

  // TerritoryType
  const territories = loadCSV('TerritoryType.csv');
  if (territories) {
    db.prepare('DELETE FROM territory_types').run();
    const insertTerritory = db.prepare(`
      INSERT OR REPLACE INTO territory_types (id, name, place_name_id, territory_intended_use, is_pvp, mount_allowed, is_indoor)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((terrs: CSVRow[]) => {
      for (const terr of terrs) {
        const id = parseInt(terr['#'] || terr['key'] || '0');
        if (id === 0) continue;

        insertTerritory.run(
          id,
          terr['Name'] || '',
          parseInt(terr['PlaceName'] || '0') || null,
          parseInt(terr['TerritoryIntendedUse'] || '0'),
          parseInt(terr['IsPvpZone'] || '0') === 1,
          parseInt(terr['Mount'] || '1') === 1,
          parseInt(terr['IndoorArea'] || '0') === 1
        );
      }
    });

    transaction(territories);
    console.log(`  ✅ Inserted ${territories.length} territories`);
  }
}

// Seed item data
function seedItems(db: Database.Database) {
  console.log('📦 Seeding items...');

  const items = loadCSV('Item.csv');
  if (!items) {
    console.log('  ⚠️  No items to seed');
    return;
  }

  // First, seed item categories
  const uiCategories = loadCSV('ItemUICategory.csv');
  if (uiCategories) {
    db.prepare('DELETE FROM item_ui_categories').run();
    const insertCategory = db.prepare(`
      INSERT OR REPLACE INTO item_ui_categories (id, name, icon, order_minor, order_major)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((cats: CSVRow[]) => {
      for (const cat of cats) {
        const id = parseInt(cat['#'] || cat['key'] || '0');
        if (id === 0) continue;

        insertCategory.run(
          id,
          cat['Name'] || '',
          parseInt(cat['Icon'] || '0') || null,
          parseInt(cat['OrderMinor'] || '0') || null,
          parseInt(cat['OrderMajor'] || '0') || null
        );
      }
    });

    transaction(uiCategories);
    console.log(`  ✅ Inserted ${uiCategories.length} UI categories`);
  }

  const searchCategories = loadCSV('ItemSearchCategory.csv');
  if (searchCategories) {
    db.prepare('DELETE FROM item_search_categories').run();
    const insertSearchCat = db.prepare(`
      INSERT OR REPLACE INTO item_search_categories (id, name, category, order_major, order_minor)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((cats: CSVRow[]) => {
      for (const cat of cats) {
        const id = parseInt(cat['#'] || cat['key'] || '0');
        if (id === 0) continue;

        insertSearchCat.run(
          id,
          cat['Name'] || '',
          parseInt(cat['Category'] || '0') || null,
          parseInt(cat['Order'] || '0') || null,
          parseInt(cat['Order{Minor}'] || '0') || null
        );
      }
    });

    transaction(searchCategories);
    console.log(`  ✅ Inserted ${searchCategories.length} search categories`);
  }

  // Now seed items
  db.prepare('DELETE FROM items').run();
  const insertItem = db.prepare(`
    INSERT OR REPLACE INTO items (
      id, name, description, icon, level_item, level_equip, rarity,
      item_ui_category_id, item_search_category_id, stack_size,
      is_unique, is_untradable, is_dyeable, is_collectible, can_be_hq,
      price_mid, price_low
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((itemList: CSVRow[]) => {
    for (const item of itemList) {
      const id = parseInt(item['#'] || item['key'] || '0');
      if (id === 0) continue;

      const name = item['Name'] || '';
      if (name === '') continue; // Skip items without names

      insertItem.run(
        id,
        name,
        item['Description'] || '',
        parseInt(item['Icon'] || '0') || null,
        parseInt(item['Level{Item}'] || item['LevelItem'] || '0') || null,
        parseInt(item['Level{Equip}'] || item['LevelEquip'] || '0') || null,
        parseInt(item['Rarity'] || '1') || 1,
        parseInt(item['ItemUICategory'] || '0') || null,
        parseInt(item['ItemSearchCategory'] || '0') || null,
        parseInt(item['StackSize'] || '1') || 1,
        parseInt(item['IsUnique'] || '0') === 1,
        parseInt(item['IsUntradable'] || '0') === 1,
        parseInt(item['IsDyeable'] || '0') === 1,
        parseInt(item['IsCollectable'] || '0') === 1,
        parseInt(item['CanBeHq'] || '0') === 1,
        parseInt(item['Price{Mid}'] || item['PriceMid'] || '0') || null,
        parseInt(item['Price{Low}'] || item['PriceLow'] || '0') || null
      );
    }
  });

  transaction(items);
  console.log(`  ✅ Inserted ${items.length} items`);
}

// Seed crafting data
function seedCrafting(db: Database.Database) {
  console.log('🔨 Seeding crafting data...');

  // Craft types
  const craftTypes = loadCSV('CraftType.csv');
  if (craftTypes) {
    db.prepare('DELETE FROM craft_types').run();
    const insertCraftType = db.prepare(`
      INSERT OR REPLACE INTO craft_types (id, name)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((types: CSVRow[]) => {
      for (const type of types) {
        const id = parseInt(type['#'] || type['key'] || '0');
        if (id === 0) continue;

        insertCraftType.run(id, type['Name'] || '');
      }
    });

    transaction(craftTypes);
    console.log(`  ✅ Inserted ${craftTypes.length} craft types`);
  }

  // Recipe level tables
  const recipeLevels = loadCSV('RecipeLevelTable.csv');
  if (recipeLevels) {
    db.prepare('DELETE FROM recipe_level_tables').run();
    const insertLevel = db.prepare(`
      INSERT OR REPLACE INTO recipe_level_tables (
        id, class_job_level, stars, suggestedCraftsmanship, suggestedControl,
        difficulty, quality, durability
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((levels: CSVRow[]) => {
      for (const level of levels) {
        const id = parseInt(level['#'] || level['key'] || '0');
        if (id === 0) continue;

        insertLevel.run(
          id,
          parseInt(level['ClassJobLevel'] || '0'),
          parseInt(level['Stars'] || '0'),
          parseInt(level['SuggestedCraftsmanship'] || '0'),
          parseInt(level['SuggestedControl'] || '0'),
          parseInt(level['Difficulty'] || '0'),
          parseInt(level['Quality'] || '0'),
          parseInt(level['Durability'] || '0')
        );
      }
    });

    transaction(recipeLevels);
    console.log(`  ✅ Inserted ${recipeLevels.length} recipe levels`);
  }

  // Recipes
  const recipes = loadCSV('Recipe.csv');
  if (recipes) {
    db.prepare('DELETE FROM recipes').run();
    db.prepare('DELETE FROM recipe_ingredients').run();

    const insertRecipe = db.prepare(`
      INSERT OR REPLACE INTO recipes (
        id, number, craft_type_id, recipe_level_table_id, item_result_id,
        amount_result, required_craftsmanship, required_control,
        is_specialist, is_expert, can_quick_synth, can_hq, exp_reward
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertIngredient = db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, item_id, quantity, position)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction((recipeList: CSVRow[]) => {
      for (const recipe of recipeList) {
        const id = parseInt(recipe['#'] || recipe['key'] || '0');
        if (id === 0) continue;

        const resultItemId = parseInt(recipe['Item{Result}'] || recipe['ItemResult'] || '0');
        if (resultItemId === 0) continue;

        insertRecipe.run(
          id,
          parseInt(recipe['Number'] || '0') || null,
          parseInt(recipe['CraftType'] || '0'),
          parseInt(recipe['RecipeLevelTable'] || '0'),
          resultItemId,
          parseInt(recipe['Amount{Result}'] || recipe['AmountResult'] || '1'),
          parseInt(recipe['RequiredCraftsmanship'] || '0'),
          parseInt(recipe['RequiredControl'] || '0'),
          parseInt(recipe['IsSpecializationRequired'] || '0') === 1,
          parseInt(recipe['IsExpert'] || '0') === 1,
          parseInt(recipe['CanQuickSynth'] || '1') === 1,
          parseInt(recipe['CanHq'] || '1') === 1,
          parseInt(recipe['ExpRewarded'] || '0')
        );

        // Add ingredients
        for (let i = 0; i < 10; i++) {
          const itemKey = `Item{Ingredient}[${i}]` || `ItemIngredient${i}`;
          const amountKey = `Amount{Ingredient}[${i}]` || `AmountIngredient${i}`;

          const ingredientId = parseInt(recipe[itemKey] || '0');
          const amount = parseInt(recipe[amountKey] || '0');

          if (ingredientId > 0 && amount > 0) {
            insertIngredient.run(id, ingredientId, amount, i);
          }
        }
      }
    });

    transaction(recipes);
    console.log(`  ✅ Inserted ${recipes.length} recipes with ingredients`);
  }
}

// Seed gathering data
function seedGathering(db: Database.Database) {
  console.log('⛏️  Seeding gathering data...');

  // Gathering types
  const gatheringTypes = loadCSV('GatheringType.csv');
  if (gatheringTypes) {
    db.prepare('DELETE FROM gathering_types').run();
    const insertType = db.prepare(`
      INSERT OR REPLACE INTO gathering_types (id, name)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((types: CSVRow[]) => {
      for (const type of types) {
        const id = parseInt(type['#'] || type['key'] || '0');
        if (id === 0) continue;

        insertType.run(id, type['Name'] || '');
      }
    });

    transaction(gatheringTypes);
    console.log(`  ✅ Inserted ${gatheringTypes.length} gathering types`);
  }

  // Gathering point base
  const pointBase = loadCSV('GatheringPointBase.csv');
  if (pointBase) {
    db.prepare('DELETE FROM gathering_point_base').run();
    const insertBase = db.prepare(`
      INSERT OR REPLACE INTO gathering_point_base (id, gathering_type_id, gathering_level, is_limited)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction((bases: CSVRow[]) => {
      for (const base of bases) {
        const id = parseInt(base['#'] || base['key'] || '0');
        if (id === 0) continue;

        insertBase.run(
          id,
          parseInt(base['GatheringType'] || '0'),
          parseInt(base['GatheringLevel'] || '0'),
          parseInt(base['IsLimited'] || '0') === 1
        );
      }
    });

    transaction(pointBase);
    console.log(`  ✅ Inserted ${pointBase.length} gathering point bases`);
  }

  // Gathering points
  const gatheringPoints = loadCSV('GatheringPoint.csv');
  if (gatheringPoints) {
    db.prepare('DELETE FROM gathering_points').run();
    const insertPoint = db.prepare(`
      INSERT OR REPLACE INTO gathering_points (
        id, gathering_point_base_id, place_name_id, territory_type_id,
        pos_x, pos_y, radius
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((points: CSVRow[]) => {
      for (const point of points) {
        const id = parseInt(point['#'] || point['key'] || '0');
        if (id === 0) continue;

        insertPoint.run(
          id,
          parseInt(point['GatheringPointBase'] || '0'),
          parseInt(point['PlaceName'] || '0') || null,
          parseInt(point['TerritoryType'] || '0') || null,
          parseFloat(point['PosX'] || '0') || null,
          parseFloat(point['PosY'] || '0') || null,
          parseInt(point['Radius'] || '100') || 100
        );
      }
    });

    transaction(gatheringPoints);
    console.log(`  ✅ Inserted ${gatheringPoints.length} gathering points`);
  }

  // Gathering items
  const gatheringItems = loadCSV('GatheringItem.csv');
  if (gatheringItems) {
    db.prepare('DELETE FROM gathering_items').run();
    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO gathering_items (id, item_id, is_hidden)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction((items: CSVRow[]) => {
      for (const item of items) {
        const id = parseInt(item['#'] || item['key'] || '0');
        if (id === 0) continue;

        insertItem.run(
          id,
          parseInt(item['Item'] || '0'),
          parseInt(item['IsHidden'] || '0') === 1
        );
      }
    });

    transaction(gatheringItems);
    console.log(`  ✅ Inserted ${gatheringItems.length} gathering items`);
  }

  // Gathering item points (links items to points)
  const itemPoints = loadCSV('GatheringItemPoint.csv');
  if (itemPoints) {
    db.prepare('DELETE FROM gathering_item_points').run();
    const insertLink = db.prepare(`
      INSERT OR REPLACE INTO gathering_item_points (gathering_point_id, gathering_item_id)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((links: CSVRow[]) => {
      for (const link of links) {
        const pointId = parseInt(link['GatheringPoint'] || '0');
        const itemId = parseInt(link['GatheringItem'] || '0');

        if (pointId > 0 && itemId > 0) {
          insertLink.run(pointId, itemId);
        }
      }
    });

    transaction(itemPoints);
    console.log(`  ✅ Inserted ${itemPoints.length} gathering item-point links`);
  }
}

// Seed collectibles (mounts, companions, orchestrion)
function seedCollectibles(db: Database.Database) {
  console.log('🎉 Seeding collectibles...');

  // Mounts
  const mounts = loadCSV('Mount.csv');
  if (mounts) {
    db.prepare('DELETE FROM mounts').run();
    const insertMount = db.prepare(`
      INSERT OR REPLACE INTO mounts (
        id, singular, name, description, is_flying, is_aquatic, is_seats, extra_seats, icon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((mountList: CSVRow[]) => {
      for (const mount of mountList) {
        const id = parseInt(mount['#'] || mount['key'] || '0');
        if (id === 0) continue;

        const singular = mount['Singular'] || '';
        if (singular === '') continue;

        insertMount.run(
          id,
          singular,
          mount['Name'] || singular,
          mount['Description'] || '',
          parseInt(mount['IsFlying'] || '0') === 1,
          parseInt(mount['IsAquatic'] || '0') === 1,
          parseInt(mount['Seats'] || '1') || 1,
          parseInt(mount['ExtraSeats'] || '0') || 0,
          parseInt(mount['Icon'] || '0') || null
        );
      }
    });

    transaction(mounts);
    console.log(`  ✅ Inserted ${mounts.length} mounts`);
  }

  // Companions (Minions)
  const companions = loadCSV('Companion.csv');
  if (companions) {
    db.prepare('DELETE FROM companions').run();
    const insertCompanion = db.prepare(`
      INSERT OR REPLACE INTO companions (
        id, singular, name, description, icon, is_battle
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((companionList: CSVRow[]) => {
      for (const companion of companionList) {
        const id = parseInt(companion['#'] || companion['key'] || '0');
        if (id === 0) continue;

        const singular = companion['Singular'] || '';
        if (singular === '') continue;

        insertCompanion.run(
          id,
          singular,
          companion['Name'] || singular,
          companion['Description'] || '',
          parseInt(companion['Icon'] || '0') || null,
          parseInt(companion['Battle'] || '0') === 1
        );
      }
    });

    transaction(companions);
    console.log(`  ✅ Inserted ${companions.length} companions`);
  }

  // Orchestrion Categories
  const orchCategories = loadCSV('OrchestrionCategory.csv');
  if (orchCategories) {
    db.prepare('DELETE FROM orchestrion_categories').run();
    const insertCategory = db.prepare(`
      INSERT OR REPLACE INTO orchestrion_categories (id, name)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((cats: CSVRow[]) => {
      for (const cat of cats) {
        const id = parseInt(cat['#'] || cat['key'] || '0');
        if (id === 0) continue;

        insertCategory.run(id, cat['Name'] || '');
      }
    });

    transaction(orchCategories);
    console.log(`  ✅ Inserted ${orchCategories.length} orchestrion categories`);
  }

  // Orchestrion Rolls
  const orchestrion = loadCSV('Orchestrion.csv');
  if (orchestrion) {
    db.prepare('DELETE FROM orchestrion_rolls').run();
    const insertOrch = db.prepare(`
      INSERT OR REPLACE INTO orchestrion_rolls (id, name, description, orchestrion_category_id, icon)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((orchList: CSVRow[]) => {
      for (const orch of orchList) {
        const id = parseInt(orch['#'] || orch['key'] || '0');
        if (id === 0) continue;

        const name = orch['Name'] || '';
        if (name === '') continue;

        insertOrch.run(
          id,
          name,
          orch['Description'] || '',
          parseInt(orch['OrchestrionCategory'] || '0') || null,
          parseInt(orch['Icon'] || '0') || null
        );
      }
    });

    transaction(orchestrion);
    console.log(`  ✅ Inserted ${orchestrion.length} orchestrion rolls`);
  }
}

// Main seeding function
async function main() {
  console.log('🌟 FFXIV Game Data Seeder');
  console.log('========================\n');

  const options = parseArgs();

  // Check if CSV directory exists
  if (!existsSync(CSV_DIR)) {
    console.error(`❌ CSV directory not found: ${CSV_DIR}`);
    console.error('\n📥 Please ensure the git submodule is initialized:');
    console.error('   git submodule update --init --recursive');
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  try {
    // Initialize schema
    initializeSchema(db);

    // Seed data in order (respecting foreign keys)
    if (!options.skipReference) {
      seedReferenceData(db);
    }

    if (!options.skipItems) {
      seedItems(db);
    }

    if (!options.skipCrafting) {
      seedCrafting(db);
    }

    if (!options.skipGathering) {
      seedGathering(db);
    }

    if (!options.skipCollectibles) {
      seedCollectibles(db);
    }

    console.log('\n========================');
    console.log('✅ All data seeded successfully!');
    console.log(`📁 Database: ${DB_PATH}`);
    console.log('========================\n');
  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Create minimal test databases for API verification
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

console.log('Creating test databases...\n');

// Create fish.db
console.log('📦 Creating data/fish.db...');
const fishDb = new Database(join(DATA_DIR, 'fish.db'));

fishDb.exec(`
  -- Fish table
  CREATE TABLE IF NOT EXISTS fish (
    id INTEGER PRIMARY KEY,
    patch REAL,
    location_id INTEGER,
    start_hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    weather_set TEXT,
    previous_weather_set TEXT,
    best_catch_path TEXT,
    predators TEXT,
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

  -- Fishing spots table
  CREATE TABLE IF NOT EXISTS fishing_spots (
    id INTEGER PRIMARY KEY,
    zone_id INTEGER,
    territory INTEGER,
    x REAL,
    y REAL,
    radius REAL,
    category INTEGER
  );

  -- Baits table
  CREATE TABLE IF NOT EXISTS baits (
    id INTEGER PRIMARY KEY,
    icon INTEGER
  );

  -- Items table (for fish names)
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Weather types table
  CREATE TABLE IF NOT EXISTS weather_types (
    id INTEGER PRIMARY KEY,
    icon INTEGER
  );

  -- Weather names table
  CREATE TABLE IF NOT EXISTS weather_names (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Weather rates table
  CREATE TABLE IF NOT EXISTS weather_rates (
    id INTEGER PRIMARY KEY,
    map_id INTEGER,
    map_scale INTEGER,
    zone_id INTEGER,
    region_id INTEGER,
    rates TEXT NOT NULL
  );

  -- Zones table
  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Insert test data
  INSERT OR IGNORE INTO items (id, name) VALUES (1, 'Test Fish');
  INSERT OR IGNORE INTO fish (id, patch, location_id, start_hour, end_hour, weather_set, fish_eyes, big_fish)
  VALUES (1, 6.0, 1, 0, 24, '[]', 0, 0);
  INSERT OR IGNORE INTO fishing_spots (id, zone_id, territory, x, y, radius, category)
  VALUES (1, 1, 1, 100.0, 100.0, 5.0, 1);
  INSERT OR IGNORE INTO zones (id, name) VALUES (1, 'Test Zone');
  INSERT OR IGNORE INTO weather_names (id, name) VALUES (1, 'Clear Skies');
`);

fishDb.close();
console.log('✅ fish.db created\n');

// Create game.db
console.log('📦 Creating data/game.db...');
const gameDb = new Database(join(DATA_DIR, 'game.db'));

gameDb.exec(`
  -- Items table
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    level_item INTEGER,
    level_equip INTEGER,
    rarity INTEGER,
    icon INTEGER,
    item_ui_category_id INTEGER,
    item_search_category_id INTEGER,
    stack_size INTEGER,
    price_mid INTEGER,
    price_low INTEGER,
    can_be_hq BOOLEAN,
    is_unique BOOLEAN,
    is_untradable BOOLEAN,
    is_indisposable BOOLEAN
  );

  -- Item UI Categories
  CREATE TABLE IF NOT EXISTS item_ui_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon INTEGER,
    order_major INTEGER,
    order_minor INTEGER
  );

  -- Quests table
  CREATE TABLE IF NOT EXISTS quests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER,
    class_job_category INTEGER,
    class_job_level INTEGER,
    exp_reward INTEGER,
    gil_reward INTEGER,
    issuer_location_id INTEGER,
    target_location_id INTEGER,
    genre_id INTEGER,
    journal_genre_id INTEGER,
    is_repeatable BOOLEAN,
    beast_tribe_id INTEGER,
    previous_quest_id INTEGER,
    icon INTEGER,
    objectives TEXT,
    sort_key INTEGER,
    expansion_id INTEGER,
    place_name_id INTEGER
  );

  -- Quest objectives
  CREATE TABLE IF NOT EXISTS quest_objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    objective_type TEXT,
    objective_text TEXT,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
  );

  -- Quest rewards
  CREATE TABLE IF NOT EXISTS quest_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quest_id INTEGER NOT NULL,
    item_id INTEGER,
    quantity INTEGER,
    is_hq BOOLEAN,
    is_optional BOOLEAN,
    FOREIGN KEY (quest_id) REFERENCES quests(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  -- Recipes table
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY,
    result_item_id INTEGER NOT NULL,
    craft_type_id INTEGER NOT NULL,
    recipe_level INTEGER,
    difficulty INTEGER,
    durability INTEGER,
    quality INTEGER,
    required_craftsmanship INTEGER,
    required_control INTEGER,
    can_hq BOOLEAN,
    can_quick_synth BOOLEAN,
    FOREIGN KEY (result_item_id) REFERENCES items(id)
  );

  -- Recipe ingredients
  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  -- Craft types
  CREATE TABLE IF NOT EXISTS craft_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Gathering points
  CREATE TABLE IF NOT EXISTS gathering_points (
    id INTEGER PRIMARY KEY,
    base_id INTEGER,
    gathering_type_id INTEGER,
    level INTEGER,
    place_name_id INTEGER,
    territory_type_id INTEGER,
    x REAL,
    y REAL,
    radius REAL
  );

  -- Gathering items
  CREATE TABLE IF NOT EXISTS gathering_items (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL,
    gathering_point_base_id INTEGER,
    level INTEGER,
    is_hidden BOOLEAN,
    FOREIGN KEY (item_id) REFERENCES items(id)
  );

  -- Gathering types
  CREATE TABLE IF NOT EXISTS gathering_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Mounts
  CREATE TABLE IF NOT EXISTS mounts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon INTEGER,
    is_flying BOOLEAN,
    is_aquatic BOOLEAN,
    movement_speed INTEGER,
    order_id INTEGER
  );

  -- Companions (minions)
  CREATE TABLE IF NOT EXISTS companions (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon INTEGER,
    behavior_id INTEGER,
    is_battle BOOLEAN,
    cost INTEGER,
    hp INTEGER,
    attack INTEGER,
    defense INTEGER,
    speed INTEGER
  );

  -- Orchestrion rolls
  CREATE TABLE IF NOT EXISTS orchestrion_rolls (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon INTEGER,
    category_id INTEGER
  );

  -- Orchestrion categories
  CREATE TABLE IF NOT EXISTS orchestrion_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Place names (locations)
  CREATE TABLE IF NOT EXISTS place_names (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );

  -- Insert test data
  INSERT OR IGNORE INTO items (id, name, description, level_item, rarity, item_ui_category_id)
  VALUES (1, 'Test Item', 'A test item for verification', 1, 1, 1);

  INSERT OR IGNORE INTO item_ui_categories (id, name, order_major, order_minor)
  VALUES (1, 'General', 0, 0);

  INSERT OR IGNORE INTO quests (id, name, level, exp_reward, gil_reward, is_repeatable, objectives, sort_key, expansion_id)
  VALUES (1, 'Test Quest', 1, 100, 50, 0, '[]', 1, 1);

  INSERT OR IGNORE INTO quest_objectives (quest_id, step_number, objective_type, objective_text)
  VALUES (1, 1, 'talk', 'Talk to the test NPC');

  INSERT OR IGNORE INTO craft_types (id, name) VALUES (1, 'Carpenter');
  INSERT OR IGNORE INTO gathering_types (id, name) VALUES (1, 'Mining');
  INSERT OR IGNORE INTO place_names (id, name) VALUES (1, 'Test Location');

  INSERT OR IGNORE INTO mounts (id, name, description, is_flying, is_aquatic)
  VALUES (1, 'Test Mount', 'A test mount', 1, 0);

  INSERT OR IGNORE INTO companions (id, name, description, is_battle)
  VALUES (1, 'Test Minion', 'A test minion', 0);

  INSERT OR IGNORE INTO orchestrion_categories (id, name) VALUES (1, 'Test Category');
  INSERT OR IGNORE INTO orchestrion_rolls (id, name, description, category_id)
  VALUES (1, 'Test Song', 'A test song', 1);
`);

gameDb.close();
console.log('✅ game.db created\n');

console.log('🎉 Test databases created successfully!');
console.log('   data/fish.db - Fish tracking database');
console.log('   data/game.db - Quest, items, crafting, gathering, collectibles database');

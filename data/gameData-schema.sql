-- ============================================================================
-- EORZEA GAME DATA SCHEMA (gameData.db)
-- ============================================================================
-- Consolidated game reference database for FFXIV including:
-- - Items (with sources and uses)
-- - Crafting/Recipes
-- - Gathering (Mining, Botany)
-- - Fishing (Fish, Spots, Baits, Weather)
-- - Collectibles (Mounts, Minions, Orchestrion Rolls)
-- - Titles & Achievements
-- - Reference Data (Jobs, Locations, Maps)
--
-- This database is READ-ONLY and contains no user-specific data.
-- User progress is tracked separately in userData.db.
-- ============================================================================

-- ============================================================================
-- ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon INTEGER,
    level_item INTEGER,
    level_equip INTEGER,
    rarity INTEGER, -- 1=Common, 2=Uncommon, 3=Rare, 4=Relic, 7=Aetherial
    item_ui_category_id INTEGER,
    item_search_category_id INTEGER,
    stack_size INTEGER DEFAULT 1,
    is_unique BOOLEAN DEFAULT 0,
    is_untradable BOOLEAN DEFAULT 0,
    is_dyeable BOOLEAN DEFAULT 0,
    is_collectible BOOLEAN DEFAULT 0,
    can_be_hq BOOLEAN DEFAULT 0,
    price_mid INTEGER DEFAULT 0,
    price_low INTEGER DEFAULT 0,
    desynth_skill INTEGER,
    is_crest_worthy BOOLEAN DEFAULT 0,
    materialize_type INTEGER,
    item_action_id INTEGER,
    cast_time_s INTEGER,
    cooldown_s INTEGER,
    class_job_category INTEGER,
    grand_company INTEGER,
    item_series_id INTEGER,
    base_param_modifier INTEGER,
    model_main TEXT,
    model_sub TEXT,
    class_job_repair INTEGER,
    item_repair_id INTEGER,
    item_glamour_id INTEGER,
    item_special_bonus INTEGER,
    is_pvp BOOLEAN DEFAULT 0,
    lot_size INTEGER,
    item_sub_category INTEGER,
    item_sort_category INTEGER,
    additional_data TEXT, -- JSON for any extra fields
    FOREIGN KEY (item_ui_category_id) REFERENCES item_ui_categories(id),
    FOREIGN KEY (item_search_category_id) REFERENCES item_search_categories(id)
);

CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_level ON items(level_item);
CREATE INDEX idx_items_ui_category ON items(item_ui_category_id);
CREATE INDEX idx_items_search_category ON items(item_search_category_id);
CREATE INDEX idx_items_rarity ON items(rarity);

CREATE TABLE IF NOT EXISTS item_ui_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    icon INTEGER,
    order_minor INTEGER,
    order_major INTEGER
);

CREATE TABLE IF NOT EXISTS item_search_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category INTEGER,
    order_major INTEGER,
    order_minor INTEGER,
    class_job INTEGER
);

-- Track where items come from
CREATE TABLE IF NOT EXISTS item_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'quest', 'crafting', 'gathering', 'monster', 'shop', 'achievement', 'treasure', 'dungeon', 'trial', 'raid'
    source_id INTEGER, -- ID of the source (quest_id, recipe_id, gathering_point_id, etc.)
    source_name TEXT, -- Human-readable name
    source_details TEXT, -- JSON for additional info (location, drop rate, cost, etc.)
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX idx_item_sources_item ON item_sources(item_id);
CREATE INDEX idx_item_sources_type ON item_sources(source_type);
CREATE INDEX idx_item_sources_source ON item_sources(source_id);

-- Track what items are used for
CREATE TABLE IF NOT EXISTS item_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    use_type TEXT NOT NULL, -- 'recipe_ingredient', 'quest_required', 'leve_required', 'gc_supply', 'desynth'
    use_id INTEGER, -- ID of what it's used for (recipe_id, quest_id, etc.)
    use_name TEXT, -- Human-readable name
    quantity_required INTEGER DEFAULT 1,
    use_details TEXT, -- JSON for additional info
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX idx_item_uses_item ON item_uses(item_id);
CREATE INDEX idx_item_uses_type ON item_uses(use_type);
CREATE INDEX idx_item_uses_use ON item_uses(use_id);

-- ============================================================================
-- CRAFTING & RECIPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS craft_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL, -- 'Carpenter', 'Blacksmith', 'Armorer', etc.
    main_physical INTEGER,
    sub_physical INTEGER
);

CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY,
    number INTEGER, -- Recipe number shown in-game
    craft_type_id INTEGER NOT NULL,
    recipe_level_table_id INTEGER NOT NULL,
    item_result_id INTEGER NOT NULL,
    amount_result INTEGER DEFAULT 1,
    material_quality_factor INTEGER,
    difficulty_factor INTEGER,
    quality_factor INTEGER,
    durability_factor INTEGER,
    required_craftsmanship INTEGER DEFAULT 0,
    required_control INTEGER DEFAULT 0,
    quick_synth_craftsmanship INTEGER,
    quick_synth_control INTEGER,
    secret_recipe_book_id INTEGER,
    is_specialist BOOLEAN DEFAULT 0,
    required_status_id INTEGER, -- Buff/status needed
    item_required_id INTEGER, -- Item needed to craft
    is_expert BOOLEAN DEFAULT 0,
    can_quick_synth BOOLEAN DEFAULT 1,
    can_hq BOOLEAN DEFAULT 1,
    exp_reward INTEGER DEFAULT 0,
    status_required TEXT,
    is_secondary_result BOOLEAN DEFAULT 0,
    patches TEXT, -- JSON array of patches this recipe was added/modified
    FOREIGN KEY (craft_type_id) REFERENCES craft_types(id),
    FOREIGN KEY (item_result_id) REFERENCES items(id)
);

CREATE INDEX idx_recipes_result ON recipes(item_result_id);
CREATE INDEX idx_recipes_craft_type ON recipes(craft_type_id);
CREATE INDEX idx_recipes_level ON recipes(recipe_level_table_id);

CREATE TABLE IF NOT EXISTS recipe_level_tables (
    id INTEGER PRIMARY KEY,
    class_job_level INTEGER,
    stars INTEGER DEFAULT 0,
    suggestedCraftsmanship INTEGER DEFAULT 0,
    suggestedControl INTEGER DEFAULT 0,
    difficulty INTEGER DEFAULT 0,
    quality INTEGER DEFAULT 0,
    durability INTEGER DEFAULT 0,
    conditionsFlag INTEGER
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    position INTEGER, -- Slot position (0-9)
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_item ON recipe_ingredients(item_id);

-- ============================================================================
-- GATHERING (Mining, Botany)
-- ============================================================================

CREATE TABLE IF NOT EXISTS gathering_types (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL -- 'Mining', 'Quarrying', 'Logging', 'Harvesting', 'Spearfishing'
);

CREATE TABLE IF NOT EXISTS gathering_point_base (
    id INTEGER PRIMARY KEY,
    gathering_type_id INTEGER NOT NULL,
    gathering_level INTEGER NOT NULL,
    is_limited BOOLEAN DEFAULT 0,
    FOREIGN KEY (gathering_type_id) REFERENCES gathering_types(id)
);

CREATE TABLE IF NOT EXISTS gathering_points (
    id INTEGER PRIMARY KEY,
    gathering_point_base_id INTEGER NOT NULL,
    place_name_id INTEGER,
    territory_type_id INTEGER,
    map_id INTEGER,
    pos_x REAL,
    pos_y REAL,
    radius INTEGER DEFAULT 100,
    gathering_sub_category_id INTEGER,
    FOREIGN KEY (gathering_point_base_id) REFERENCES gathering_point_base(id),
    FOREIGN KEY (place_name_id) REFERENCES place_names(id),
    FOREIGN KEY (territory_type_id) REFERENCES territory_types(id)
);

CREATE INDEX idx_gathering_points_base ON gathering_points(gathering_point_base_id);
CREATE INDEX idx_gathering_points_territory ON gathering_points(territory_type_id);
CREATE INDEX idx_gathering_points_place ON gathering_points(place_name_id);

CREATE TABLE IF NOT EXISTS gathering_items (
    id INTEGER PRIMARY KEY,
    item_id INTEGER NOT NULL,
    gathering_item_level_id INTEGER,
    is_hidden BOOLEAN DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS gathering_item_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gathering_point_id INTEGER NOT NULL,
    gathering_item_id INTEGER NOT NULL,
    FOREIGN KEY (gathering_point_id) REFERENCES gathering_points(id),
    FOREIGN KEY (gathering_item_id) REFERENCES gathering_items(id)
);

CREATE INDEX idx_gathering_item_points_point ON gathering_item_points(gathering_point_id);
CREATE INDEX idx_gathering_item_points_item ON gathering_item_points(gathering_item_id);

-- ============================================================================
-- FISHING
-- ============================================================================

CREATE TABLE IF NOT EXISTS fish (
    id INTEGER PRIMARY KEY,
    patch REAL,
    location_id INTEGER,
    start_hour INTEGER NOT NULL,
    end_hour INTEGER NOT NULL,
    weather_set TEXT, -- JSON array
    previous_weather_set TEXT, -- JSON array
    best_catch_path TEXT, -- JSON array of bait IDs
    predators TEXT, -- JSON array
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
    data_missing BOOLEAN,
    FOREIGN KEY (location_id) REFERENCES fishing_spots(id)
);

CREATE INDEX idx_fish_big ON fish(big_fish);
CREATE INDEX idx_fish_patch ON fish(patch);
CREATE INDEX idx_fish_location ON fish(location_id);

CREATE TABLE IF NOT EXISTS fishing_spots (
    id INTEGER PRIMARY KEY,
    zone_id INTEGER,
    territory INTEGER,
    x REAL,
    y REAL,
    radius REAL,
    category INTEGER,
    FOREIGN KEY (zone_id) REFERENCES zones(id)
);

CREATE INDEX idx_fishing_spots_zone ON fishing_spots(zone_id);

CREATE TABLE IF NOT EXISTS baits (
    id INTEGER PRIMARY KEY,
    icon INTEGER
);

CREATE TABLE IF NOT EXISTS weather_types (
    id INTEGER PRIMARY KEY,
    icon INTEGER
);

CREATE TABLE IF NOT EXISTS weather_names (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE INDEX idx_weather_names_name ON weather_names(name);

CREATE TABLE IF NOT EXISTS weather_rates (
    id INTEGER PRIMARY KEY,
    map_id INTEGER,
    map_scale INTEGER,
    zone_id INTEGER,
    region_id INTEGER,
    rates TEXT NOT NULL, -- JSON array of [weather, rate]
    FOREIGN KEY (zone_id) REFERENCES zones(id),
    FOREIGN KEY (region_id) REFERENCES regions(id)
);

CREATE INDEX idx_weather_rates_zone ON weather_rates(zone_id);
CREATE INDEX idx_weather_rates_region ON weather_rates(region_id);

CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY,
    region_id INTEGER,
    weather_rate INTEGER,
    FOREIGN KEY (region_id) REFERENCES regions(id)
);

CREATE TABLE IF NOT EXISTS regions (
    id INTEGER PRIMARY KEY
);

-- ============================================================================
-- COLLECTIBLES (Mounts, Minions, Orchestrion)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mounts (
    id INTEGER PRIMARY KEY,
    singular TEXT NOT NULL,
    plural TEXT,
    name TEXT, -- Display name (may differ from singular)
    description TEXT,
    enhanced_description TEXT,
    tooltip TEXT,
    move_speed INTEGER, -- Ground movement speed
    fly_speed INTEGER, -- Flying speed
    is_flying BOOLEAN DEFAULT 0,
    icon INTEGER,
    ui_priority INTEGER,
    ride_height INTEGER,
    is_aquatic BOOLEAN DEFAULT 0,
    is_seats INTEGER DEFAULT 1, -- Number of seats
    extra_seats INTEGER DEFAULT 0,
    order_major INTEGER,
    order_minor INTEGER,
    icon_smart_id INTEGER,
    is_airborne BOOLEAN DEFAULT 0,
    is_emote BOOLEAN DEFAULT 0
);

CREATE INDEX idx_mounts_name ON mounts(singular);
CREATE INDEX idx_mounts_flying ON mounts(is_flying);

CREATE TABLE IF NOT EXISTS companions (
    id INTEGER PRIMARY KEY,
    singular TEXT NOT NULL,
    plural TEXT,
    name TEXT,
    description TEXT,
    enhanced_description TEXT,
    tooltip TEXT,
    behavior_id INTEGER,
    icon INTEGER,
    order_major INTEGER,
    order_minor INTEGER,
    cost INTEGER, -- Summoning cost if applicable
    hp INTEGER,
    skill_angle INTEGER,
    skill_cost INTEGER,
    is_battle BOOLEAN DEFAULT 0, -- Can it fight?
    monster_note_target_id INTEGER
);

CREATE INDEX idx_companions_name ON companions(singular);

CREATE TABLE IF NOT EXISTS orchestrion_rolls (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon INTEGER,
    orchestrion_category_id INTEGER,
    order_major INTEGER,
    order_minor INTEGER,
    FOREIGN KEY (orchestrion_category_id) REFERENCES orchestrion_categories(id)
);

CREATE INDEX idx_orchestrion_name ON orchestrion_rolls(name);
CREATE INDEX idx_orchestrion_category ON orchestrion_rolls(orchestrion_category_id);

CREATE TABLE IF NOT EXISTS orchestrion_categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    order_major INTEGER,
    order_minor INTEGER
);

-- Track how to obtain collectibles
CREATE TABLE IF NOT EXISTS collectible_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collectible_type TEXT NOT NULL, -- 'mount', 'companion', 'orchestrion'
    collectible_id INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'quest', 'achievement', 'shop', 'dungeon', 'trial', 'raid', 'crafting', 'gathering', 'event', 'mogstation'
    source_id INTEGER,
    source_name TEXT,
    source_details TEXT, -- JSON (cost, requirements, drop rate, etc.)
    UNIQUE(collectible_type, collectible_id, source_type, source_id)
);

CREATE INDEX idx_collectible_sources_collectible ON collectible_sources(collectible_type, collectible_id);
CREATE INDEX idx_collectible_sources_type ON collectible_sources(source_type);

-- ============================================================================
-- TITLES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS titles (
    id INTEGER PRIMARY KEY,
    name_masculine TEXT NOT NULL,
    name_feminine TEXT NOT NULL,
    is_prefix BOOLEAN NOT NULL,
    sort_order INTEGER
);

CREATE INDEX idx_titles_name ON titles(name_masculine);

CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    points INTEGER,
    title_reward_id INTEGER,
    item_reward_id INTEGER,
    icon INTEGER,
    achievement_type INTEGER,
    FOREIGN KEY (title_reward_id) REFERENCES titles(id),
    FOREIGN KEY (item_reward_id) REFERENCES items(id)
);

CREATE INDEX idx_achievements_name ON achievements(name);
CREATE INDEX idx_achievements_category ON achievements(category_id);
CREATE INDEX idx_achievements_title_reward ON achievements(title_reward_id);

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_jobs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    abbreviation TEXT,
    class_job_category INTEGER,
    starting_level INTEGER DEFAULT 1,
    modifier_hp INTEGER,
    modifier_mp INTEGER,
    modifier_str INTEGER,
    modifier_vit INTEGER,
    modifier_dex INTEGER,
    modifier_int INTEGER,
    modifier_mnd INTEGER,
    role INTEGER, -- 1=Tank, 2=Melee DPS, 3=Ranged DPS, 4=Healer, etc.
    is_limited_job BOOLEAN DEFAULT 0,
    can_queue_for_duty BOOLEAN DEFAULT 1,
    item_starting_weapon INTEGER,
    item_soul_crystal INTEGER,
    primary_stat TEXT,
    unlock_quest_id INTEGER,
    job_index INTEGER
);

CREATE TABLE IF NOT EXISTS place_names (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_plural TEXT,
    name_no_article TEXT
);

CREATE TABLE IF NOT EXISTS territory_types (
    id INTEGER PRIMARY KEY,
    name TEXT,
    place_name_id INTEGER,
    region_place_name_id INTEGER,
    zone_place_name_id INTEGER,
    map_id INTEGER,
    territory_intended_use INTEGER, -- 0=Overworld, 1=City, 2=Dungeon, etc.
    is_pvp BOOLEAN DEFAULT 0,
    mount_allowed BOOLEAN DEFAULT 1,
    is_indoor BOOLEAN DEFAULT 0,
    weather_rate INTEGER,
    bg_path TEXT,
    FOREIGN KEY (place_name_id) REFERENCES place_names(id)
);

CREATE TABLE IF NOT EXISTS maps (
    id INTEGER PRIMARY KEY,
    place_name_id INTEGER,
    place_name_region_id INTEGER,
    place_name_sub_id INTEGER,
    territory_type_id INTEGER,
    size_factor INTEGER,
    offset_x INTEGER,
    offset_y INTEGER,
    map_marker_range INTEGER,
    discovery_array_byte INTEGER,
    discovery_index INTEGER,
    hierarchy INTEGER,
    priority_ui INTEGER,
    priority_category_ui INTEGER,
    is_event BOOLEAN DEFAULT 0,
    FOREIGN KEY (place_name_id) REFERENCES place_names(id),
    FOREIGN KEY (territory_type_id) REFERENCES territory_types(id)
);

-- ============================================================================
-- VIEWS FOR CONVENIENT QUERIES
-- ============================================================================

-- View for complete item information with categories
CREATE VIEW IF NOT EXISTS v_items_complete AS
SELECT
    i.*,
    uic.name as ui_category_name,
    sc.name as search_category_name
FROM items i
LEFT JOIN item_ui_categories uic ON i.item_ui_category_id = uic.id
LEFT JOIN item_search_categories sc ON i.item_search_category_id = sc.id;

-- View for recipes with result item names
CREATE VIEW IF NOT EXISTS v_recipes_complete AS
SELECT
    r.*,
    i.name as result_item_name,
    ct.name as craft_type_name,
    rlt.class_job_level,
    rlt.stars
FROM recipes r
JOIN items i ON r.item_result_id = i.id
JOIN craft_types ct ON r.craft_type_id = ct.id
LEFT JOIN recipe_level_tables rlt ON r.recipe_level_table_id = rlt.id;

-- View for gathering nodes with locations
CREATE VIEW IF NOT EXISTS v_gathering_points_complete AS
SELECT
    gp.*,
    gpb.gathering_type_id,
    gpb.gathering_level,
    gpb.is_limited,
    gt.name as gathering_type_name,
    pn.name as place_name,
    tt.name as territory_name
FROM gathering_points gp
JOIN gathering_point_base gpb ON gp.gathering_point_base_id = gpb.id
JOIN gathering_types gt ON gpb.gathering_type_id = gt.id
LEFT JOIN place_names pn ON gp.place_name_id = pn.id
LEFT JOIN territory_types tt ON gp.territory_type_id = tt.id;

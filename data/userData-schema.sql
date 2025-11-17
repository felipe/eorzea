-- ============================================================================
-- EORZEA USER DATA SCHEMA (userData.db)
-- ============================================================================
-- User-specific database for FFXIV character progress tracking including:
-- - Characters (multi-character support with Lodestone sync)
-- - Job Progress
-- - Quest Completions
-- - Fishing Log
-- - Gathering & Crafting Progress
-- - Collectibles (Mounts, Minions, Orchestrion)
-- - Titles & Achievements
-- - Bookmarks & Goals
-- - Session History
--
-- This database is READ/WRITE and contains all user-specific data.
-- It references gameData.db for item names, recipes, locations, etc.
-- This is the database that should be backed up, exported, and synced.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ============================================================================
-- CHARACTERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,              -- Lodestone ID
    name TEXT NOT NULL,
    server TEXT NOT NULL,
    data_center TEXT,
    last_synced_at INTEGER,           -- Unix timestamp (milliseconds)
    created_at INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,      -- Current active character
    notes TEXT,

    -- Cached Lodestone data (updated only during sync)
    avatar_url TEXT,
    title TEXT,
    free_company TEXT
);

-- ============================================================================
-- JOB PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    job_name TEXT NOT NULL,
    level INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, job_name)
);

CREATE INDEX idx_job_progress_char ON job_progress(character_id);

-- ============================================================================
-- QUEST TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS completed_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    quest_id INTEGER NOT NULL,           -- References gameData.db quests table (when implemented)
    completed_at INTEGER NOT NULL,
    notes TEXT,
    source TEXT DEFAULT 'manual',        -- 'manual', 'sync_inferred', 'sync_confirmed'
    confidence INTEGER,                   -- 0-100 for inferred completions
    inferred_from INTEGER,               -- achievement_id that caused inference
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, quest_id)
);

CREATE INDEX idx_completed_quests_char ON completed_quests(character_id);
CREATE INDEX idx_completed_quests_quest ON completed_quests(quest_id);

-- ============================================================================
-- FISHING LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS caught_fish (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    fish_id INTEGER NOT NULL,            -- References gameData.db fish table
    caught_at INTEGER NOT NULL,
    location_id INTEGER,                  -- References gameData.db fishing_spots table
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, fish_id)
);

CREATE INDEX idx_caught_fish_char ON caught_fish(character_id);
CREATE INDEX idx_caught_fish_fish ON caught_fish(fish_id);

-- ============================================================================
-- GATHERING PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS gathered_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,            -- References gameData.db items table
    gathering_point_id INTEGER,           -- References gameData.db gathering_points table
    gathered_at INTEGER NOT NULL,         -- Unix timestamp (milliseconds)
    is_hq BOOLEAN DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, item_id, gathering_point_id)
);

CREATE INDEX idx_gathered_items_character ON gathered_items(character_id);
CREATE INDEX idx_gathered_items_item ON gathered_items(item_id);

-- ============================================================================
-- CRAFTING PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crafted_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    recipe_id INTEGER NOT NULL,          -- References gameData.db recipes table
    item_id INTEGER NOT NULL,            -- References gameData.db items table
    crafted_at INTEGER NOT NULL,         -- Unix timestamp (milliseconds)
    is_hq BOOLEAN DEFAULT 0,
    is_collectible BOOLEAN DEFAULT 0,
    collectibility INTEGER,
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, recipe_id)
);

CREATE INDEX idx_crafted_items_character ON crafted_items(character_id);
CREATE INDEX idx_crafted_items_recipe ON crafted_items(recipe_id);

-- ============================================================================
-- COLLECTIBLES TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS obtained_mounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    mount_id INTEGER NOT NULL,           -- References gameData.db mounts table
    obtained_at INTEGER NOT NULL,        -- Unix timestamp (milliseconds)
    obtained_from TEXT,                   -- 'quest', 'achievement', 'shop', etc.
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, mount_id)
);

CREATE INDEX idx_obtained_mounts_character ON obtained_mounts(character_id);

CREATE TABLE IF NOT EXISTS obtained_companions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    companion_id INTEGER NOT NULL,       -- References gameData.db companions table
    obtained_at INTEGER NOT NULL,
    obtained_from TEXT,
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, companion_id)
);

CREATE INDEX idx_obtained_companions_character ON obtained_companions(character_id);

CREATE TABLE IF NOT EXISTS obtained_orchestrion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    orchestrion_id INTEGER NOT NULL,     -- References gameData.db orchestrion_rolls table
    obtained_at INTEGER NOT NULL,
    obtained_from TEXT,
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, orchestrion_id)
);

CREATE INDEX idx_obtained_orchestrion_character ON obtained_orchestrion(character_id);

-- ============================================================================
-- TITLES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS unlocked_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    title_id INTEGER NOT NULL,           -- References gameData.db titles table
    unlocked_at INTEGER NOT NULL,
    source TEXT DEFAULT 'manual',        -- 'manual', 'lodestone_sync', 'achievement'
    source_id INTEGER,                    -- achievement_id if from achievement
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, title_id)
);

CREATE INDEX idx_unlocked_titles_char ON unlocked_titles(character_id);
CREATE INDEX idx_unlocked_titles_title ON unlocked_titles(title_id);

CREATE TABLE IF NOT EXISTS unlocked_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    achievement_id INTEGER NOT NULL,     -- References gameData.db achievements table
    unlocked_at INTEGER NOT NULL,
    source TEXT DEFAULT 'manual',        -- 'manual', 'lodestone_sync'
    notes TEXT,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, achievement_id)
);

CREATE INDEX idx_unlocked_achievements_char ON unlocked_achievements(character_id);
CREATE INDEX idx_unlocked_achievements_achievement ON unlocked_achievements(achievement_id);

-- ============================================================================
-- BOOKMARKS & GOALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    type TEXT NOT NULL,                  -- 'quest', 'fish', 'location', 'item', 'recipe'
    item_id INTEGER NOT NULL,            -- ID in the respective gameData.db table
    notes TEXT,
    priority INTEGER DEFAULT 0,          -- 0=normal, 1=high
    created_at INTEGER NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    UNIQUE(character_id, type, item_id)
);

CREATE INDEX idx_bookmarks_char ON bookmarks(character_id);
CREATE INDEX idx_bookmarks_type ON bookmarks(type);

CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,                           -- 'quest', 'fish', 'level', 'custom'
    target_value INTEGER,
    current_value INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX idx_goals_char ON goals(character_id);
CREATE INDEX idx_goals_completed ON goals(completed);

-- ============================================================================
-- SESSION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS session_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT,
    command TEXT NOT NULL,
    args TEXT,                           -- JSON
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

CREATE INDEX idx_session_history_timestamp ON session_history(timestamp);

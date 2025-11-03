-- Player Profile Database Schema
-- Offline-first player memory system for tracking progress

-- Characters (multi-character support)
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,              -- Lodestone ID
  name TEXT NOT NULL,
  server TEXT NOT NULL,
  data_center TEXT,
  last_synced_at INTEGER,           -- Unix timestamp
  created_at INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,      -- Current active character
  notes TEXT,
  
  -- Cached Lodestone data (updated only during sync)
  avatar_url TEXT,
  title TEXT,
  free_company TEXT
);

-- Job Progress (per character)
CREATE TABLE IF NOT EXISTS job_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  level INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, job_name)
);

-- Completed Quests (per character)
CREATE TABLE IF NOT EXISTS completed_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  quest_id INTEGER NOT NULL,
  completed_at INTEGER NOT NULL,
  notes TEXT,
  source TEXT DEFAULT 'manual',      -- 'manual', 'sync_inferred', 'sync_confirmed'
  confidence INTEGER,                 -- 0-100 for inferred completions
  inferred_from INTEGER,             -- achievement_id that caused inference
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, quest_id)
);

-- Caught Fish (per character)
CREATE TABLE IF NOT EXISTS caught_fish (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  fish_id INTEGER NOT NULL,
  caught_at INTEGER NOT NULL,
  location_id INTEGER,
  notes TEXT,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Bookmarks (per character)
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'quest', 'fish', 'location'
  item_id INTEGER NOT NULL,
  notes TEXT,
  priority INTEGER DEFAULT 0,       -- 0=normal, 1=high
  created_at INTEGER NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, type, item_id)
);

-- Session History (global)
CREATE TABLE IF NOT EXISTS session_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT,
  command TEXT NOT NULL,
  args TEXT,                        -- JSON
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

-- Achievements/Goals (per character)
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,                        -- 'quest', 'fish', 'level', 'custom'
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Unlocked Titles (per character)
CREATE TABLE IF NOT EXISTS unlocked_titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  title_id INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL,
  source TEXT DEFAULT 'manual',      -- 'manual', 'lodestone_sync', 'achievement'
  source_id INTEGER,                  -- achievement_id if from achievement
  notes TEXT,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, title_id)
);

-- Unlocked Achievements (per character)
CREATE TABLE IF NOT EXISTS unlocked_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at INTEGER NOT NULL,
  source TEXT DEFAULT 'manual',      -- 'manual', 'lodestone_sync'
  notes TEXT,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_progress_char ON job_progress(character_id);
CREATE INDEX IF NOT EXISTS idx_completed_quests_char ON completed_quests(character_id);
CREATE INDEX IF NOT EXISTS idx_completed_quests_quest ON completed_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_caught_fish_char ON caught_fish(character_id);
CREATE INDEX IF NOT EXISTS idx_caught_fish_fish ON caught_fish(fish_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_char ON bookmarks(character_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_type ON bookmarks(type);
CREATE INDEX IF NOT EXISTS idx_session_history_timestamp ON session_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_goals_char ON goals(character_id);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON goals(completed);
CREATE INDEX IF NOT EXISTS idx_unlocked_titles_char ON unlocked_titles(character_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_titles_title ON unlocked_titles(title_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_char ON unlocked_achievements(character_id);
CREATE INDEX IF NOT EXISTS idx_unlocked_achievements_achievement ON unlocked_achievements(achievement_id);

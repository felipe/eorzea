-- Title and Achievement Schema for game.db
-- Adds title and achievement tracking to the game database

-- Titles Table
CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY,
  name_masculine TEXT NOT NULL,
  name_feminine TEXT NOT NULL,
  is_prefix BOOLEAN NOT NULL,
  sort_order INTEGER
);

-- Achievements Table  
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
  FOREIGN KEY (title_reward_id) REFERENCES titles(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_titles_name ON titles(name_masculine);
CREATE INDEX IF NOT EXISTS idx_achievements_name ON achievements(name);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category_id);
CREATE INDEX IF NOT EXISTS idx_achievements_title_reward ON achievements(title_reward_id);

# Product Roadmap

## ✅ Completed

1. [x] **Offline Quest Data System** - Parse quest data directly from FFXIV CSV files. Includes quest details, objectives, prerequisites, and rewards. 4,514 quests with parsed objectives.

2. [x] **Character Data Fetching** - Lodestone scraper to retrieve character information including level, job, and stats. Support character lookup by name/server and by ID.

3. [x] **CLI Framework & Commands** - CLI interface with commands for character lookup, quest search, fish tracking, and quest details. Help documentation and command validation included.

4. [x] **Fish Tracking System** - Complete fish database with 1,088 fish entries including time windows, weather requirements, bait paths, and catch methods. Real-time availability based on Eorzean time.

5. [x] **Quest Objectives Display** - Parse and display fish, NPC, item, and enemy objectives with full details including fish catch requirements, bait chains, and weather.

6. [x] **Local Data Storage** - SQLite database for quest data, fish data, and quest objectives. Fast local queries with better-sqlite3.

7. [x] **Mobile Web View** - Express.js web server with mobile-responsive interface. Browse fish and quests, view objectives, check availability. Dark theme optimized for phones.

## 🔄 In Progress

See GitHub Issues for current work items.

## 📋 Future Considerations

- [ ] **Quest Filtering & Search** - Advanced filtering by location, quest type (MSQ, job, side), and completion status. Enhanced fuzzy search.

- [ ] **Quest Progress Tracking** - Local database tracking for quest status (not started, in progress, completed) with personal quest history.

- [ ] **Gathering Window Tracking** - Show next availability windows for gathering operations (fish, mining, botany) with real-time countdowns.

- [ ] **Weather Forecasting** - Predict upcoming weather patterns for fishing and gathering.

- [ ] **Location Hierarchy** - Display zone/region information and nearest Aetheryte for all locations.

- [ ] **Smart Quest Recommendations** - Suggest optimal quest routes based on character location, level, and efficiency.

- [ ] **Multi-Character Management** - Support for managing multiple characters with commands to switch active character and compare progress.

- [ ] **RESTful API Development** - Create API layer exposing character lookup, quest search, and fish tracking endpoints. iOS app could consume this API.

> Notes
>
> - Focus is on offline-first functionality using CSV data
> - No external API dependencies for core quest/fish tracking
> - Web view serves as proof-of-concept for future mobile apps
> - API layer would enable native iOS/Android apps

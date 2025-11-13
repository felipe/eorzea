# Eorzea Game Data Assistant

A comprehensive offline-first FFXIV companion tool with complete item, gathering, crafting, and collectibles databases. Features terminal CLI and mobile web interface!

## Features

### 🎮 Complete Game Data (NEW!)

- **50,000+ Items**: Full item database with sources and uses
- **10,000+ Recipes**: Complete crafting guide for all Disciples of the Hand
- **Gathering System**: Mining and Botany node tracking (similar to fishing)
- **400+ Mounts**: Track your mount collection with acquisition guides
- **700+ Minions**: Complete companion collection tracking
- **400+ Orchestrion Rolls**: Music collection with sources

### 🔍 Item Lookup System (NEW!)

- **Comprehensive Search**: Find any item by name, level, rarity, or category
- **Source Tracking**: See where to get items (crafting, gathering, quests, vendors, dungeons)
- **Use Tracking**: See what items are used for (recipes, quests, etc.)
- **Cross-References**: Links to recipes, gathering nodes, and quest rewards
- **Complete Guides**: One command shows everything about an item

### ⛏️ Gathering & Crafting (NEW!)

- **Mining & Botany**: Track gathering nodes similar to fishing system
- **Timed Nodes**: Support for ephemeral/timed gathering points
- **Recipe Lookup**: Search recipes by craft type, item, or ingredient
- **Material Trees**: See all materials needed including sub-crafts
- **Crafting Guides**: Complete breakdown with requirements and costs
- **Progress Tracking**: Track gathered items and crafted recipes per character

### 🏆 Collectibles Tracking (NEW!)

- **Mount Collection**: Track flying, aquatic, and multi-seat mounts
- **Minion Collection**: Battle and non-battle companion tracking
- **Orchestrion Collection**: Music rolls organized by category
- **Acquisition Guides**: Detailed how-to-obtain for each collectible
- **Collection Stats**: Visual progress bars and completion percentages

### Core Tracking

- **Quest Tracking**: Search quests by name or level with detailed objectives
- **Fish Tracking**: Track fish availability, time windows, and catch requirements
- **Quest Objectives**: View fish, NPC, item, and enemy objectives with full details
- **Character Lookup**: Check character information via Lodestone
- **Eorzean Time**: Real-time Eorzean time calculation for time-sensitive activities
- **100% Offline**: All game data stored locally in SQLite databases

### 🎯 Player Memory System (NEW!)

- **Character Profiles**: Multi-character support with progress tracking
- **Quest Completion**: Mark quests complete with notes
- **Fish Catches**: Log fish with location and timestamp
- **Progress Stats**: Visual progress bars and completion percentages
- **Job Tracking**: Sync job levels from Lodestone
- **Session History**: Track your play sessions

### 🏆 Title & Achievement System (NEW!)

- **810 Titles**: Search, track, and unlock titles
- **3,751 Achievements**: Full achievement database with categories
- **Auto-unlock**: Achievements automatically unlock their title rewards
- **Progress Tracking**: Track title and achievement collection

### 🔄 Intelligent Sync (NEW!)

- **Achievement Analysis**: Sync achievements to infer quest completions
- **Confidence Scoring**: 95% confidence for MSQ inferences
- **Batch Operations**: Infer 900+ quests in seconds
- **Full Audit Trail**: Track how quests were marked (manual vs inferred)
- **Metadata**: Source, confidence, and achievement linkage for all quests

### 📱 Mobile Web View

- **Responsive Design**: Access your data on your phone
- **Dark Theme**: Easy on the eyes
- **Real-time Updates**: See your progress anywhere

## Installation

```bash
# Clone and install
git clone https://github.com/felipe/eorzea.git
cd eorzea
yarn install

# Link the CLI globally (makes 'eorzea' command available)
npm link

# Now you can use 'eorzea' from anywhere!
eorzea --help
```

## Usage

### Command Line Interface

```bash
# View help
eorzea --help

# Character management
eorzea character --add --name "Character Name" --server "Server"
eorzea character --list          # List all characters
eorzea character --active        # Show active character
eorzea character --switch "Name" # Switch active character
eorzea character --sync          # Sync from Lodestone

# Quest commands
eorzea quest --search "quest name"
eorzea quest --level 50
eorzea quest --id 12345
eorzea quest --id 12345 --complete --note "Just finished!"

# Progress tracking
eorzea progress                  # Show all progress
eorzea progress --quests         # Quest progress only
eorzea progress --fish           # Fish progress only
eorzea progress --titles         # Title collection
eorzea progress --achievements   # Achievement progress

# Title commands
eorzea title search "Warrior"
eorzea title view 355
eorzea title unlock 355
eorzea title list
eorzea title stats

# Achievement commands
eorzea achievement search "Shadowbringers"
eorzea achievement view 2298
eorzea achievement unlock 2298
eorzea achievement list
eorzea achievement stats

# Intelligent sync
eorzea sync --achievements 2298,2958,3496  # Sync achievements
eorzea sync --achievements 2298 --dry-run  # Preview changes

# Fish commands
eorzea fish --available          # Show currently catchable fish
eorzea fish --big                # Show big fish only
eorzea fish --patch 6.0          # Filter by patch
eorzea fish --id 4898            # Get detailed fish info
eorzea fish --id 4898 --caught   # Mark fish as caught

# Item commands
eorzea item search "Darksteel Ore"
eorzea item --id 5115
eorzea item --id 5115 --guide    # Complete item guide
eorzea item --name "Potion" --level 50 --limit 10

# Gathering commands
eorzea gather --mining           # Show mining nodes
eorzea gather --botany           # Show botany nodes
eorzea gather --item "Darksteel Ore"
eorzea gather --level 50
eorzea gather --timed            # Show timed nodes only
eorzea gather --id 123 --gathered

# Crafting commands
eorzea craft search "Darksteel Ingot"
eorzea craft --id 456
eorzea craft --id 456 --guide    # Complete crafting guide
eorzea craft --id 456 --crafted
eorzea craft --type Armorer
eorzea craft --ingredient "Darksteel Ore"

# Mount commands
eorzea mount search "Phoenix"
eorzea mount --id 89
eorzea mount --id 89 --obtained
eorzea mount --flying            # Show flying mounts only

# Minion commands
eorzea minion search "Wind-up"
eorzea minion --id 123
eorzea minion --id 123 --obtained

# Orchestrion commands
eorzea orchestrion search "Answers"
eorzea orchestrion --id 45
eorzea orchestrion --id 45 --obtained

# Collection stats
eorzea collection                # Show all collection progress
```

### 📱 Web Interface (Mobile-Optimized)

```bash
# Start the web server
yarn web

# Access from your phone at:
# http://YOUR_COMPUTER_IP:3000
```

**Features:**

- Browse all fish, quests, items, recipes, gathering nodes, and collectibles
- Search by name or ID across all systems
- View detailed quest objectives and item information
- See fish catch requirements and gathering node details
- Check currently available fish and timed gathering nodes
- Browse and search mounts, minions, and orchestrion rolls
- View collection statistics and progress
- Mobile-responsive design with dark theme
- Complete API endpoints for all data

See [`docs/WEB_VIEW.md`](docs/WEB_VIEW.md) for detailed web view documentation.

## 🚀 Quick Start: Intelligent Sync

The fastest way to populate your quest history:

```bash
# 1. Add your character
eorzea character --add --name "Your Name" --server "Your Server"

# 2. Find your MSQ completion achievements
# In-game: Character > Achievements > Battle
# Examples: Shadowbringers (#2298), Endwalker (#2958), Dawntrail (#3496)

# 3. Preview what will be synced
eorzea sync --achievements 2298,2958,3496 --dry-run

# 4. Perform the sync
eorzea sync --achievements 2298,2958,3496

# 5. View your progress
eorzea progress
```

**Result:** 900+ quests inferred in seconds! 🎉

See [`docs/intelligent-sync.md`](docs/intelligent-sync.md) for complete documentation.

## Configuration

Create a `.env` file in the project root (see `.env.example`):

```env
DEFAULT_CHARACTER_NAME=Your Character Name
DEFAULT_SERVER=YourServer
```

## Data Setup

Before using the new features, you need to download and seed game data:

```bash
# Download CSV files from ffxiv-datamining (requires internet)
npm run download-csv

# Seed all game data (items, recipes, gathering, collectibles)
npm run seed-game-data

# Or seed selectively
npm run seed-game-data -- --skip-gathering
npm run seed-game-data -- --skip-collectibles
```

See [`docs/GAME_DATA_SETUP.md`](docs/GAME_DATA_SETUP.md) for detailed setup instructions.

## Development

```bash
# Run in development mode
yarn dev <command>

# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format

# Update fish data
yarn update-fish-data

# Update quest data
yarn update-quest-data

# Seed game data
yarn seed-game-data
```

## What's Inside

### Item System (NEW!)

Powered by data from [xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining):

- **50,000+ items** from all expansions
- **Item sources**: Crafting, gathering, quests, vendors, dungeons, raids
- **Item uses**: Recipe ingredients, quest requirements, leves
- **Full metadata**: Level, rarity, categories, stack size, tradability
- **Cross-references**: Links to recipes, gathering nodes, quests
- **Search and filter**: By name, level, rarity, category, source type
- **Complete guides**: One command shows everything about an item

### Crafting System (NEW!)

- **10,000+ recipes** for all Disciples of the Hand
- **8 craft types**: Carpenter, Blacksmith, Armorer, Goldsmith, Leatherworker, Weaver, Alchemist, Culinarian
- **Recipe details**: Level, stars, requirements (craftsmanship, control)
- **Ingredient tracking**: With quantities and HQ availability
- **Material trees**: Recursive breakdown of all sub-crafts
- **Crafting guides**: Complete walkthrough with requirements and costs
- **Search options**: By craft type, result item, ingredient, level
- **Progress tracking**: Track crafted recipes per character

### Gathering System (NEW!)

- **Thousands of gathering nodes** for Mining, Botany, and Spearfishing
- **Node locations**: Map coordinates and territory names
- **Timed nodes**: Support for ephemeral/limited time gathering points
- **Level requirements**: Required gatherer level for each node
- **Hidden items**: Items requiring perception/GP
- **Search options**: By type, level, location, item name
- **Progress tracking**: Track gathered items per character
- **Similar to fishing**: Follows the same patterns as fish tracking

### Collectibles System (NEW!)

**Mounts** (400+):
- Flying and aquatic mount indicators
- Multi-seat mount tracking
- Source information (quest, achievement, shop, dungeon, etc.)
- Collection progress tracking

**Minions** (700+):
- Battle companion indicators
- Source information for all minions
- Collection completion tracking

**Orchestrion Rolls** (400+):
- Music organized by categories
- Source information for each roll
- Music collection tracking

All collectibles include:
- Detailed how-to-obtain guides
- Visual progress bars
- Per-character tracking
- Search and filter options

### Quest System

- **5,277 quests** from FFXIV CSV files
- **4,514 quests** with parsed objectives
- Fish, NPC, item, and enemy objectives
- Quest prerequisites and rewards
- Search by name, level, or ID
- Completion tracking with metadata

### Fish Tracking

Powered by data from [Carbuncle Plushy Fish Tracker](https://github.com/icykoneko/ff14-fish-tracker-app):

- **1,088 fish** entries from all patches
- **313 big fish** with special requirements
- Time windows and weather requirements
- Bait paths and catch methods
- Aquarium compatibility data
- Real-time availability based on Eorzean time
- Catch tracking per character

### Title & Achievement System

- **810 titles** (prefix and suffix)
- **3,751 achievements** across all categories
- **814 achievements** that reward titles
- Search, filter, and track unlocks
- Auto-unlock titles from achievements
- Progress tracking and statistics

### Player Memory System

- **Multi-character** support
- **Quest completion** tracking with source and confidence
- **Fish catch** logging with locations
- **Title & achievement** unlocks
- **Job level** syncing from Lodestone
- **Progress statistics** with visual displays
- **Session history** tracking

### Intelligent Sync Engine

- **Achievement analysis** for MSQ completions
- **Confidence scoring** (0-100 scale)
- **Batch operations** (900+ quests in 1 second)
- **Full audit trail** (source, confidence, inferred_from)
- **12 MSQ achievements** mapped (ARR → Dawntrail)
- **Dry-run mode** for previewing changes

### Character Management

- Search characters by name and server
- View character profiles via Lodestone scraper
- Sync job levels automatically
- Multi-character profile support
- Progress tracking per character

## Tech Stack

- **Runtime**: Node.js v20+ with TypeScript
- **CLI Framework**: Commander.js + Inquirer.js
- **Web Server**: Express.js (for mobile web view)
- **Database**: SQLite with better-sqlite3
- **Data Sources**: FFXIV CSV Files + Custom Lodestone Scraper + Carbuncle Plushy Fish Tracker
- **Testing**: Jest with ts-jest (93 passing tests)

## Acknowledgments

This project is built on the shoulders of the FFXIV community! We're grateful to:

- **[Carbuncle Plushy Fish Tracker](https://github.com/icykoneko/ff14-fish-tracker-app)** by icykoneko - Fish data
- **[xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining)** - Game data CSVs
- **[SaintCoinach](https://github.com/xivapi/SaintCoinach)** - CSV extraction tools
- **[Garland Tools](https://www.garlandtools.org/)**, **[XIVAPI](https://xivapi.com/)**, **[Teamcraft](https://ffxivteamcraft.com/)** - Inspiration

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for complete details.

## Legal

FINAL FANTASY XIV © 2010-2024 SQUARE ENIX CO., LTD. All Rights Reserved.

This project is not affiliated with or endorsed by Square Enix.

## License

MIT - See [LICENSE](LICENSE) for details.

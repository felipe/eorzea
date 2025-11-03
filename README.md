# Eorzea Quest Assistant

A terminal-first quest tracking tool for casual FFXIV players. Now with mobile web view!

## Features

### Core Tracking

- **Quest Tracking**: Search quests by name or level with detailed objectives
- **Fish Tracking**: Track fish availability, time windows, and catch requirements
- **Quest Objectives**: View fish, NPC, item, and enemy objectives with full details
- **Character Lookup**: Check character information via Lodestone
- **Eorzean Time**: Real-time Eorzean time calculation for time-sensitive fishing
- **100% Offline**: All quest and fish data stored locally in SQLite

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
```

### 📱 Web Interface (Mobile-Optimized)

```bash
# Start the web server
yarn web

# Access from your phone at:
# http://YOUR_COMPUTER_IP:3000
```

**Features:**

- Browse all fish and quests
- Search by name or ID
- View detailed quest objectives
- See fish catch requirements
- Check currently available fish
- Mobile-responsive design
- Dark theme

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
```

## What's Inside

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

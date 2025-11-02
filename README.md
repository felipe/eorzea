# Eorzea Quest Assistant

A terminal-first quest tracking tool for casual FFXIV players. Now with mobile web view!

## Features

- **Character Location Tracking**: Check where your character is in the game
- **Quest Discovery**: View available quests based on your location and level
- **Fish Tracking**: Track fish availability, time windows, and catch requirements
- **Quest Objectives**: Detailed objective display with fish catch requirements
- **Eorzean Time**: Real-time Eorzean time calculation for time-sensitive fishing
- **Mobile Web View**: 📱 Access your data on your phone with a simple web interface
- **CLI-First Design**: Built for the command line with web expansion

## Installation

```bash
yarn install
```

## Installation

### Local Development

```bash
# Install dependencies
yarn install

# Link the CLI globally (makes 'eorzea' command available)
npm link

# Now you can use 'eorzea' from anywhere!
eorzea --help
```

### From Source

```bash
# Clone and install
git clone https://github.com/felipe/eorzea.git
cd eorzea
yarn install
npm link
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
```

## Configuration

Create a `.env` file in the project root (see `.env.example`):

```env
DEFAULT_CHARACTER_NAME=Your Character Name
DEFAULT_SERVER=YourServer
```

_Note: XIVAPI V2 no longer requires API keys for basic functionality._

## Usage

### Command Line Interface

```bash
# View help
eorzea --help

# Character commands
eorzea character --name "Character Name" --server "Server"
eorzea character --id 12345678  # Direct lookup by character ID

# Quest commands
eorzea quest --search "quest name"
eorzea quest --level 50
eorzea quest --id 12345  # Get specific quest details with objectives

# Fish commands
eorzea fish --available          # Show currently catchable fish
eorzea fish --big                # Show big fish only
eorzea fish --patch 6.0          # Filter by patch
eorzea fish --id 4898            # Get detailed fish info
eorzea fish --aquarium           # Show aquarium fish
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

## Current Status

### Implemented Features ✓

- ✅ **100% Offline Quest Tracking**: Parse quest data directly from FFXIV CSV files
- ✅ **Quest Objectives System**: Display detailed objectives (fish, NPCs, items, enemies)
- ✅ **Fish Objective Details**: Complete catch info (location, time, weather, bait chains)
- ✅ **Mobile Web View**: Simple web interface for phone access
- ✅ **Custom Lodestone Scraper**: Character search and profile lookup via direct scraping
- ✅ **Fish Tracking System**: Complete fish database with 1,088 fish entries
- ✅ **Eorzean Time Calculations**: Real-time time window tracking for fishing
- ✅ **SQLite Database**: Fast local queries for fish, spots, baits, weather, and quests
- ✅ **Configuration Management**: Environment variables and local config file support
- ✅ **Character Commands**: Search by name/server, lookup by ID with full profile data
- ✅ **Quest Commands**: Search by name, filter by level, view objectives with full details
- ✅ **Fish Commands**: Available fish, big fish, patch filtering, detailed lookups
- ✅ **Rate Limiting**: Respectful API usage with 1s delays for Lodestone
- ✅ **Error Handling**: User-friendly error messages and graceful failure handling
- ✅ **Comprehensive Tests**: 93 passing tests with 82% coverage on services

### Migration to V2 APIs ✅

- **Migrated from XIVAPI V1 → V2**: Updated to use the new `/api/sheet/` endpoints
- **Added Custom Lodestone Scraper**: Replaced deprecated V1 character endpoints
- **No More API Keys Required**: XIVAPI V2 works without authentication for basic usage
- **Improved Data Structure**: Better field organization and more reliable quest data

### Fish Tracking ✅

Powered by data from [Carbuncle Plushy Fish Tracker](https://github.com/icykoneko/ff14-fish-tracker-app):

- 1,088 fish entries from all patches
- 313 big fish with special requirements
- Time windows and weather requirements
- Bait paths and catch methods
- Aquarium compatibility data
- Real-time availability based on Eorzean time

See `docs/fish-data-update.md` for update instructions.

### In Progress

- 🔨 Location-based quest filtering
- 🔨 Quest walkthrough display
- 🔨 Weather forecasting for fishing

## TODO

- [ ] **Augment Quest Data with Garland Tools**: Integrate [Garland Tools API](https://github.com/karashiiro/garlandtools-api) for enhanced quest information
  - Add quest objectives and walkthroughs (not available in XIVAPI)
  - Include dialogue, cutscene markers, and journal entries
  - Show detailed rewards including optional choices
  - Display NPC locations and involved characters
  - Access to quest prerequisites and follow-up quests
  - Note: Garland Tools provides comprehensive quest data including descriptions, objectives, and narrative content that XIVAPI v2 lacks

## Roadmap

See `agent-os/product/roadmap.md` for the full development roadmap.

## Tech Stack

- **Runtime**: Node.js v20+ with TypeScript
- **CLI Framework**: Commander.js + Inquirer.js
- **Web Server**: Express.js (for mobile web view)
- **Database**: SQLite with better-sqlite3
- **Data Sources**: FFXIV CSV Files + Custom Lodestone Scraper + Carbuncle Plushy Fish Tracker
- **Testing**: Jest with ts-jest
- **Web Scraping**: Cheerio for HTML parsing

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

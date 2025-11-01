# Eorzea Quest Assistant

A terminal-first quest tracking tool for casual FFXIV players.

## Features

- **Character Location Tracking**: Check where your character is in the game
- **Quest Discovery**: View available quests based on your location and level
- **Fish Tracking**: Track fish availability, time windows, and catch requirements
- **Eorzean Time**: Real-time Eorzean time calculation for time-sensitive fishing
- **Step-by-Step Walkthroughs**: Get detailed guidance on how to complete quests
- **CLI-First Design**: Built for the command line with API expansion planned

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

```bash
# View help
eorzea --help

# Character commands
eorzea character --name "Character Name" --server "Server"
eorzea character --id 12345678  # Direct lookup by character ID

# Quest commands
eorzea quest --search "quest name"
eorzea quest --level 50
eorzea quest --id 12345  # Get specific quest details

# Fish commands
eorzea fish --available          # Show currently catchable fish
eorzea fish --big                # Show big fish only
eorzea fish --patch 6.0          # Filter by patch
eorzea fish --id 4898            # Get detailed fish info
eorzea fish --aquarium           # Show aquarium fish

# Location commands (coming soon)
eorzea location --current

# Get quest walkthrough (coming soon)
eorzea guide <questId>
```

## Current Status

### Implemented Features ✓

- ✅ **XIVAPI V2 Integration**: Quest data, search, and filtering using the new V2 API
- ✅ **Custom Lodestone Scraper**: Character search and profile lookup via direct scraping
- ✅ **Fish Tracking System**: Complete fish database with 1,000+ fish entries
- ✅ **Eorzean Time Calculations**: Real-time time window tracking for fishing
- ✅ **SQLite Database**: Fast local queries for fish, spots, baits, and weather
- ✅ **Configuration Management**: Environment variables and local config file support
- ✅ **Character Commands**: Search by name/server, lookup by ID with full profile data
- ✅ **Quest Commands**: Search by name, filter by level, view detailed quest information
- ✅ **Fish Commands**: Available fish, big fish, patch filtering, detailed lookups
- ✅ **Rate Limiting**: Respectful API usage with 1s delays for Lodestone, 100ms for XIVAPI
- ✅ **Error Handling**: User-friendly error messages and graceful failure handling
- ✅ **Comprehensive Tests**: 45 passing tests with full coverage

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
- **Database**: SQLite with better-sqlite3
- **Data Sources**: XIVAPI V2 + Custom Lodestone Scraper + Carbuncle Plushy Fish Tracker
- **Testing**: Jest with ts-jest
- **Web Scraping**: Cheerio for HTML parsing, Axios for HTTP requests

## License

MIT

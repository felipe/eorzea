# Eorzea Quest Assistant

A terminal-first quest tracking tool for casual FFXIV players.

## Features

- **Character Location Tracking**: Check where your character is in the game
- **Quest Discovery**: View available quests based on your location and level
- **Step-by-Step Walkthroughs**: Get detailed guidance on how to complete quests
- **CLI-First Design**: Built for the command line with API expansion planned

## Installation

```bash
yarn install
```

## Development

```bash
# Run in development mode
yarn dev

# Build the project
yarn build

# Run built CLI
yarn start

# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format
```

## Configuration

Create a `.env` file in the project root (see `.env.example`):

```env
DEFAULT_CHARACTER_NAME=Your Character Name
DEFAULT_SERVER=YourServer
```

*Note: XIVAPI V2 no longer requires API keys for basic functionality.*

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

# Location commands (coming soon)
eorzea location --current

# Get quest walkthrough (coming soon)
eorzea guide <questId>
```

## Current Status

### Implemented Features ✓
- ✅ **XIVAPI V2 Integration**: Quest data, search, and filtering using the new V2 API
- ✅ **Custom Lodestone Scraper**: Character search and profile lookup via direct scraping
- ✅ **Configuration Management**: Environment variables and local config file support
- ✅ **Character Commands**: Search by name/server, lookup by ID with full profile data
- ✅ **Quest Commands**: Search by name, filter by level, view detailed quest information
- ✅ **Rate Limiting**: Respectful API usage with 1s delays for Lodestone, 100ms for XIVAPI
- ✅ **Error Handling**: User-friendly error messages and graceful failure handling

### Migration to V2 APIs ✅
- **Migrated from XIVAPI V1 → V2**: Updated to use the new `/api/sheet/` endpoints
- **Added Custom Lodestone Scraper**: Replaced deprecated V1 character endpoints
- **No More API Keys Required**: XIVAPI V2 works without authentication for basic usage
- **Improved Data Structure**: Better field organization and more reliable quest data

### In Progress
- 🔨 SQLite caching layer
- 🔨 Location-based quest filtering
- 🔨 Quest walkthrough display

## TODO

- [ ] **Integrate FF14 Fish Tracker**: Research and integrate fishing data from [ff14-fish-tracker-app](https://github.com/icykoneko/ff14-fish-tracker-app)
  - Explore fish location data, weather conditions, and bait requirements
  - Consider adding fishing-specific commands to the CLI
  - Evaluate API/data extraction methods from the tracker

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
- **Database**: SQLite with Prisma ORM (coming soon)
- **Data Sources**: XIVAPI V2 + Custom Lodestone Scraper
- **Web Scraping**: Cheerio for HTML parsing, Axios for HTTP requests

## License

MIT

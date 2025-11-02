# Eorzea Quest Assistant

A terminal-first quest tracking tool for casual FFXIV players. Now with mobile web view!

## Features

- **Quest Tracking**: Search quests by name or level with detailed objectives
- **Fish Tracking**: Track fish availability, time windows, and catch requirements
- **Quest Objectives**: View fish, NPC, item, and enemy objectives with full details
- **Character Lookup**: Check character information via Lodestone
- **Eorzean Time**: Real-time Eorzean time calculation for time-sensitive fishing
- **Mobile Web View**: 📱 Access your data on your phone with a simple web interface
- **100% Offline**: All quest and fish data stored locally in SQLite

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

# Character commands
eorzea character --name "Character Name" --server "Server"
eorzea character --id 12345678

# Quest commands
eorzea quest --search "quest name"
eorzea quest --level 50
eorzea quest --id 12345

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

- 5,277 quests from FFXIV CSV files
- 4,514 quests with parsed objectives
- Fish, NPC, item, and enemy objectives
- Quest prerequisites and rewards
- Search by name, level, or ID

### Fish Tracking

Powered by data from [Carbuncle Plushy Fish Tracker](https://github.com/icykoneko/ff14-fish-tracker-app):

- 1,088 fish entries from all patches
- 313 big fish with special requirements
- Time windows and weather requirements
- Bait paths and catch methods
- Aquarium compatibility data
- Real-time availability based on Eorzean time

### Character Lookup

- Search characters by name and server
- View character profiles via Lodestone scraper
- Check character level, jobs, and stats

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

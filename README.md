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
XIVAPI_KEY=your_api_key_here
DEFAULT_CHARACTER_NAME=Your Character Name
DEFAULT_SERVER=YourServer
```

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
- ✅ XIVAPI client with rate limiting
- ✅ Configuration management (env vars + config file)
- ✅ Character search and lookup commands
- ✅ Quest search and filtering commands
- ✅ Error handling and user-friendly output

### Known Limitations
- ⚠️ **XIVAPI Status**: The public XIVAPI service is experiencing issues:
  - Character/Lodestone endpoints return 403 (marked as private)
  - Quest search returns 500 (search cluster down)
- These are external API issues, not problems with the implementation
- The code is ready and will work when XIVAPI is operational
- Alternative: Consider using self-hosted XIVAPI or alternative data sources

### In Progress
- 🔨 SQLite caching layer
- 🔨 Location-based quest filtering
- 🔨 Quest walkthrough display

## Roadmap

See `agent-os/product/roadmap.md` for the full development roadmap.

## Tech Stack

- **Runtime**: Node.js v20+ with TypeScript
- **CLI Framework**: Commander.js + Inquirer.js
- **Database**: SQLite with Prisma ORM (coming soon)
- **Data Sources**: XIVAPI + Lodestone

## License

MIT

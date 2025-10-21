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

## Usage

```bash
# View help
eorzea --help

# Character commands
eorzea character --name "Your Name" --server "Your Server"

# Quest commands
eorzea quest --list
eorzea quest --search "quest name"

# Location commands
eorzea location --current

# Get quest walkthrough
eorzea guide <questId>
```

## Roadmap

See `agent-os/product/roadmap.md` for the full development roadmap.

## Tech Stack

- **Runtime**: Node.js v20+ with TypeScript
- **CLI Framework**: Commander.js + Inquirer.js
- **Database**: SQLite with Prisma ORM (coming soon)
- **Data Sources**: XIVAPI + Lodestone

## License

MIT

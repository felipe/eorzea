# Tech Stack

## Current Stack

### Framework & Runtime

- **Language/Runtime:** Node.js v20+ with TypeScript
- **Package Manager:** yarn 4.9.2
- **CLI Framework:** Commander.js for command parsing, Inquirer.js for interactive prompts

### CLI Tools

- **Terminal Output:** Chalk (colored output), cli-table3 (formatted tables)
- **Progress Indicators:** ora (loading spinners)
- **Interactive Prompts:** Inquirer.js

### Web Server

- **Framework:** Express.js 5.1.0
- **Purpose:** Mobile-optimized web view for fish and quest browsing
- **Features:** Embedded CSS, server-side rendering, mobile-responsive design

### Database & Storage

- **Database:** SQLite with better-sqlite3
- **Schema:**
  - `fish` table (1,088 entries)
  - `quests` table (5,277 entries with objectives)
- **No ORM:** Direct SQL queries for performance

### Data Sources

- **Fish Data:** Carbuncle Plushy Fish Tracker (https://ff14fish.carbuncleplushy.com)
- **Game Data:** xivapi/ffxiv-datamining CSV files (Quest, Item, BNpcName, ENpcResident, etc.)
- **CSV Parsing:** SaintCoinach structure reference
- **Character Data:** Lodestone via @xivapi/nodestone scraper
- **Data Format:** JSON for fish-data.json, CSV for game data, SQLite for runtime queries

### Testing & Quality

- **Test Framework:** Jest (93 passing tests)
- **Coverage:** 82% on services, 64% overall
- **Linting:** ESLint
- **Formatting:** Prettier
- **Type Safety:** TypeScript strict mode

### Configuration

- **Environment Variables:** dotenv for character defaults
- **Config Files:** Local .env file for user preferences

### Data Processing Scripts

- **CSV Download:** Direct fetch from xivapi/ffxiv-datamining
- **Data Parsing:**
  - `parse-quest-data.ts` - Quest CSV parsing with ObjectiveParser
  - `parse-fish-data.ts` - Fish data from Carbuncle Plushy
- **Database Seeding:**
  - `seed-quest-db.ts` - Quest data to SQLite
  - `seed-fish-db.ts` - Fish data to SQLite

## Key Architectural Decisions

### 100% Offline for Core Features

- Quest and fish data stored in local SQLite databases
- No runtime API calls for quest/fish lookups
- Only Lodestone requires network access (character profiles)

### CLI + Web Hybrid

- CLI for terminal users (primary interface)
- Web view for mobile access (secondary interface)
- Shared TypeScript services between CLI and web

### Direct CSV Parsing

- Parse FFXIV CSV files directly instead of using APIs
- More control over data structure
- Faster queries with local SQLite
- No rate limiting concerns

## Future Considerations

### API Layer

- Express.js API could expose quest/fish data as REST endpoints
- Would enable native iOS/Android apps
- JWT authentication for API access
- Rate limiting with express-rate-limit

### Frontend Development

- React or Next.js for full web application
- Could consume the API layer
- Progressive Web App (PWA) for installable mobile experience

### Deployment

- Railway or Fly.io for web/API hosting
- Persistent volumes for SQLite databases
- GitHub Actions for CI/CD

# Tech Stack

## Framework & Runtime
- **Application Framework:** Node.js with Express (for future API)
- **Language/Runtime:** Node.js (LTS version, currently v20+)
- **Package Manager:** yarn (per user preference)
- **CLI Framework:** Commander.js for command parsing, Inquirer.js for interactive prompts

## CLI Development
- **CLI Framework:** Commander.js (command-line interface framework)
- **Interactive Prompts:** Inquirer.js (for user input and selections)
- **Terminal Output:** Chalk (for colored output), cli-table3 (for formatted tables)
- **Progress Indicators:** ora (for loading spinners during API calls)

## Backend (Future API Development)
- **API Framework:** Express.js or Fastify (for RESTful API)
- **API Documentation:** Swagger/OpenAPI specification
- **Authentication:** JWT tokens for API access
- **Rate Limiting:** express-rate-limit or fastify-rate-limit

## Database & Storage
- **Database:** SQLite (for local quest/character data caching)
- **ORM/Query Builder:** Prisma (type-safe database access)
- **Caching:** In-memory cache with node-cache, SQLite for persistent cache

## Data Sources & External APIs
- **FFXIV Data API:** XIVAPI (https://xivapi.com) - primary source for quest, item, and game data
- **Character Data:** Lodestone (official FFXIV character profiles) via XIVAPI or lodestone-parser
- **Fallback Data:** Garland Tools API, Consolegameswiki data (if needed)

## Testing & Quality
- **Test Framework:** Jest (unit and integration testing)
- **Test Coverage:** Jest coverage reports
- **Linting/Formatting:** ESLint (code linting), Prettier (code formatting)
- **Type Safety:** TypeScript (for type checking and better IDE support)

## Development Tools
- **TypeScript:** For type safety across CLI and future API
- **Nodemon:** For development hot-reloading
- **dotenv:** For environment variable management (API keys, cache settings)

## Deployment & Infrastructure
- **CLI Distribution:** npm package (published to npm registry)
- **API Hosting:** Cloudflare Workers, Heroku, or Railway (for future API deployment)
- **CI/CD:** GitHub Actions (automated testing and deployment)
- **Version Control:** Git with GitHub

## Frontend (Future Development)
- **JavaScript Framework:** React or Next.js
- **CSS Framework:** Tailwind CSS
- **UI Components:** shadcn/ui or custom component library
- **State Management:** React Query (for API data fetching and caching)

## Configuration Management
- **Environment Variables:** dotenv for local development
- **Config Files:** cosmiconfig for user preferences (JSON/YAML config files)
- **User Settings:** Local config file (~/.eorzea/config.yml) for character defaults, API keys

## Monitoring & Logging
- **Logging:** Winston or Pino (structured logging)
- **Error Tracking:** Sentry (for production error monitoring)
- **Analytics:** Optional telemetry for API usage (opt-in only)

## Security Considerations
- **API Key Management:** User-provided XIVAPI keys stored in local config
- **Rate Limiting:** Respect XIVAPI rate limits (prevent abuse)
- **Data Privacy:** No personal data collection, local-only quest tracking
- **Input Validation:** Joi or Zod for validating user inputs and API responses

# Product Roadmap

1. [ ] XIVAPI Integration - Implement core integration with XIVAPI to fetch quest data, including quest details, prerequisites, and rewards. Set up error handling and rate limiting for API calls. `M`

2. [ ] Character Data Fetching - Build Lodestone scraping or XIVAPI character lookup to retrieve character information including current level, job, and last known location. Support character lookup by name and server. `M`

3. [ ] CLI Framework & Commands - Create CLI interface with commands for character lookup (`character <name>`), quest search (`quests <location/level>`), and quest details (`quest <id>`). Include help documentation and command validation. `S`

4. [ ] Quest Walkthrough Display - Implement detailed quest walkthrough view showing objectives, NPC locations, rewards, and step-by-step completion guide. Format output for terminal readability with colors and structure. `S`

5. [ ] Quest Filtering & Search - Build advanced filtering for quests by location, level range, quest type (MSQ, job, side), and completion status. Support fuzzy search by quest name. `M`

6. [ ] Local Data Caching - Implement SQLite database for caching quest data, character information, and API responses. Add cache invalidation strategy and configurable TTL for different data types. `M`

7. [ ] Quest Progress Tracking - Add local database tracking for quest status (not started, in progress, completed) with commands to mark quest progress and view personal quest history. `S`

8. [ ] Smart Quest Recommendations - Build recommendation engine that suggests optimal quest routes based on character location, level, travel efficiency, and quest rewards. Include explanation of recommendations. `L`

9. [ ] Quest Data Export - Implement export functionality to share quest lists and walkthroughs as JSON, Markdown, or plain text files. Support exporting personal progress reports. `XS`

10. [ ] RESTful API Development - Create API layer exposing character lookup, quest search, walkthrough retrieval, and recommendation endpoints. Include API authentication and rate limiting. `L`

11. [ ] API Documentation - Generate OpenAPI/Swagger documentation for all API endpoints with example requests/responses and usage guides for third-party integration. `S`

12. [ ] Multi-Character Management - Add support for managing multiple characters in CLI and API, with commands to switch active character and compare quest completion across characters. `M`

> Notes
> - Order prioritizes building core data retrieval (items 1-2) before user-facing features
> - CLI commands (items 3-9) establish MVP functionality for immediate user value
> - API development (items 10-11) enables future frontend and third-party integrations
> - Advanced features (items 8, 12) build on core functionality after MVP is stable
> - Frontend development intentionally excluded from this roadmap pending API completion
> - All features should work with real XIVAPI/Lodestone data, no mock implementations

# Product Mission

## Pitch
Eorzea Quest Assistant is a command-line and API-based quest tracking tool that helps casual FFXIV players complete quests efficiently by providing character location awareness, contextual quest discovery, and step-by-step walkthroughs without leaving their workflow.

## Users

### Primary Customers
- **Casual FFXIV Players**: Players who enjoy the game but don't have time to memorize complex quest chains or constantly reference wikis
- **Returning Players**: Users who take breaks from the game and need help catching up on where they left off
- **Alt-Leveling Players**: Experienced players leveling alternate jobs/characters who want efficient quest completion

### User Personas

**Sarah - The Weekend Warrior** (28-35)
- **Role:** Working professional who plays FFXIV 4-8 hours per week
- **Context:** Enjoys the story and gameplay but limited gaming time means efficiency matters
- **Pain Points:**
  - Forgets quest objectives between play sessions
  - Spends too much time alt-tabbing to wikis and quest databases
  - Loses track of which quests are available at current level/location
  - Wants to enjoy the game without feeling overwhelmed by quest management
- **Goals:**
  - Complete quests efficiently during limited playtime
  - Stay immersed in the game without constant wiki lookups
  - Track progress across multiple play sessions

**Marcus - The Returning Hero** (24-32)
- **Role:** Former active player returning after a break (3-12 months)
- **Context:** Has multiple characters/jobs, struggles to remember what they were doing
- **Pain Points:**
  - Can't remember which quests were in progress
  - Doesn't know what's available at current character location and level
  - Overwhelmed by the amount of content added during absence
- **Goals:**
  - Quickly get back into the game flow
  - Understand available quests without extensive research
  - Pick up where they left off efficiently

## The Problem

### Quest Overload and Context Switching
FFXIV features hundreds of quests across multiple job questlines, main scenario quests, side quests, and special events. Casual players often lose track of objectives, forget what quests are available, and spend significant time alt-tabbing between the game and wiki sites. This context switching breaks immersion and wastes precious gaming time.

**Our Solution:** Eorzea Quest Assistant provides instant, contextual quest information directly in your terminal or via API. Check your character's location, see available quests for your level, and get step-by-step walkthroughs - all without leaving your workflow.

### Information Fragmentation
Quest information is scattered across multiple wikis, databases, and community sites. Players must piece together character status, quest prerequisites, walkthrough steps, and rewards from different sources.

**Our Solution:** Centralized quest data integration through XIVAPI and other authoritative sources, presenting unified quest information with character-specific filtering.

## Differentiators

### Location and Level Awareness
Unlike static wiki pages, Eorzea Quest Assistant knows where your character is and what level they are. The tool automatically filters and surfaces only relevant quests, eliminating the noise of hundreds of inaccessible quests.

This results in faster quest discovery and reduced time spent researching prerequisites.

### Terminal-First Design
While web-based tools exist, Eorzea Quest Assistant is built for developers and technical players who live in their terminal. Quick command access means no browser tabs, no UI navigation - just fast, focused quest information.

This results in minimal workflow disruption and faster access to quest data.

### Progressive Enhancement Architecture
Starting as a CLI tool with planned API and frontend expansion, the architecture ensures that core functionality works immediately while supporting future enhancement. Use it from your terminal today, integrate it into your own tools tomorrow.

This results in immediate value for technical users and future flexibility for broader audiences.

## Key Features

### Core Features
- **Character Location Lookup:** Instantly check where your FFXIV character is currently located using Lodestone data
- **Quest Discovery:** View all available quests for your current location and character level with prerequisites clearly marked
- **Quest Walkthroughs:** Get detailed, step-by-step quest completion guides with NPC locations and dialogue choices

### Collaboration Features
- **Quest Sharing:** Export quest walkthroughs or quest lists to share with Free Company members or friends
- **Character Comparison:** Compare quest completion status across multiple characters or alts

### Advanced Features
- **Quest Progress Tracking:** Mark quests as in-progress or completed locally to track your journey
- **Smart Recommendations:** Suggest optimal quest routes based on location, level, and efficiency
- **Data Caching:** Cache FFXIV API data locally to reduce API calls and provide faster responses

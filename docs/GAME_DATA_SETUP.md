# Game Data Setup Guide

This guide explains how to obtain and seed FFXIV game data for the gathering, crafting, and collectibles systems.

## Overview

The Eorzea application uses CSV files from the official FFXIV game data to populate:

- **Items** (weapons, armor, materials, consumables, etc.)
- **Recipes** (crafting recipes for all Disciple of the Hand classes)
- **Gathering Nodes** (Mining, Botany, Spearfishing points)
- **Collectibles** (Mounts, Minions/Companions, Orchestrion Rolls)
- **Reference Data** (ClassJobs, Locations, Territories, etc.)

## Data Source

All game data comes from the official FFXIV CSV files maintained by the community:

**Repository**: [xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining)

These CSV files are extracted using [SaintCoinach](https://github.com/xivapi/SaintCoinach) from the game client.

## Required CSV Files

These files are provided via the `data/ffxiv-datamining` git submodule:

### Core Item Files

- `Item.csv` - All items in the game (~50,000+ items)
- `ItemUICategory.csv` - UI categories for items
- `ItemSearchCategory.csv` - Search categories

### Crafting & Recipes

- `Recipe.csv` - All crafting recipes (~10,000+ recipes)
- `RecipeLevelTable.csv` - Recipe difficulty and requirements
- `CraftType.csv` - Crafting classes (Carpenter, Blacksmith, etc.)

### Gathering

- `GatheringPoint.csv` - Node locations
- `GatheringPointBase.csv` - Node types and levels
- `GatheringItem.csv` - Items available at nodes
- `GatheringItemPoint.csv` - Links items to nodes
- `GatheringType.csv` - Gathering classes (Mining, Botany, etc.)

### Collectibles

- `Mount.csv` - All mounts in the game (400+ mounts)
- `Companion.csv` - All minions/companions (700+ minions)
- `Orchestrion.csv` - All orchestrion rolls (400+ songs)
- `OrchestrionCategory.csv` - Music categories

### Reference Data

- `ClassJob.csv` - All classes and jobs
- `PlaceName.csv` - Location names
- `TerritoryType.csv` - Zone/territory data
- `Map.csv` - Map data and coordinates
- `Level.csv` - Level data (optional)

## Quick Setup

### Initialize the Git Submodule

The CSV files are provided via a git submodule pointing to [xivapi/ffxiv-datamining](https://github.com/xivapi/ffxiv-datamining):

```bash
# Initialize the submodule (first time only)
git submodule update --init --recursive

# Seed the database
npm run seed-game-data
```

### Selective Seeding

You can skip certain data types if you don't need them:

```bash
# Skip gathering data
npm run seed-game-data -- --skip-gathering

# Skip collectibles
npm run seed-game-data -- --skip-collectibles

# Skip items (not recommended)
npm run seed-game-data -- --skip-items
```

## Database Schema

The seeder will automatically create/update the following database:

- **File**: `data/game.db`
- **Schema**: `data/game-data-schema.sql`
- **Size**: ~200-300 MB (with all data)

### Key Tables

#### Items

- `items` - All game items
- `item_ui_categories` - UI categories
- `item_search_categories` - Search categories
- `item_sources` - Where items come from
- `item_uses` - What items are used for

#### Crafting

- `recipes` - All crafting recipes
- `recipe_ingredients` - Recipe materials
- `recipe_level_tables` - Crafting requirements
- `craft_types` - Crafting classes

#### Gathering

- `gathering_points` - Node locations
- `gathering_point_base` - Node types
- `gathering_items` - Gatherable items
- `gathering_item_points` - Item-node links
- `gathering_types` - Gathering classes

#### Collectibles

- `mounts` - All mounts
- `companions` - All minions
- `orchestrion_rolls` - All music
- `orchestrion_categories` - Music categories
- `collectible_sources` - How to obtain collectibles

#### Reference

- `class_jobs` - All classes/jobs
- `place_names` - Location names
- `territory_types` - Zones/territories
- `maps` - Map data

## Item Lookup System

Once seeded, you can search for any item and see:

### Item Sources

- **Crafting**: Which recipes produce this item
- **Gathering**: Which nodes have this item
- **Quests**: Which quests reward this item
- **Vendors**: Which NPCs sell this item
- **Monsters**: Which enemies drop this item
- **Duties**: Which dungeons/trials/raids drop this item

### Item Uses

- **Recipe Ingredient**: Which recipes require this item
- **Quest Required**: Which quests need this item
- **Leves**: Which levequest use this item
- **Grand Company Supply**: GC turn-ins

## Gathering System

Similar to the fishing system, but for Mining and Botany:

- **Node Locations**: Map coordinates for gathering points
- **Time Windows**: Timed/ephemeral nodes (similar to fish)
- **Level Requirements**: Required gatherer level
- **Hidden Items**: Items requiring perception/GP
- **Progress Tracking**: Track which items you've gathered

## Crafting System

Complete crafting guide:

- **Recipe Lookup**: Search by item or ingredient
- **Material Tree**: See all materials needed (recursive)
- **Crafting Requirements**: Level, craftsmanship, control
- **Intermediate Crafts**: Sub-recipes needed
- **Cost Estimation**: Approximate material costs
- **Progress Tracking**: Track which recipes you've crafted

## Collectibles System

Track your collection:

### Mounts

- **400+ mounts** from all expansions
- Source information (quest, achievement, shop, etc.)
- Flying capable, multi-seat indicators
- Progress tracking per character

### Minions/Companions

- **700+ minions** to collect
- Source information
- Battle minions indicator
- Collection completion tracking

### Orchestrion Rolls

- **400+ songs** organized by category
- Source information
- Category browsing
- Music collection tracking

## Data Updates

When a new patch is released:

1. Wait for xivapi/ffxiv-datamining to be updated (usually within 24h)
2. Update the submodule to latest:

```bash
# Update the submodule to latest
git submodule update --remote data/ffxiv-datamining

# Re-run the seeder
npm run seed-game-data

# Commit the submodule update
git add data/ffxiv-datamining
git commit -m "Update game data to latest patch"
```

The seeder will:

- Clear old data
- Import new/updated data
- Preserve your player progress (in profile.db)

## Offline Usage

**Important**: Once the data is seeded, the application works 100% offline!

- All game data is in `data/game.db` (SQLite)
- Player progress is in `data/profile.db` (SQLite)
- No internet connection required after initial setup
- Perfect for playing on the go or during internet outages

## API/CLI First Design

All features are accessible via:

### CLI Commands

```bash
# Item lookup
eorzea item search "Darksteel Ore"
eorzea item info 5115

# Gathering
eorzea gather --mining --level 50
eorzea gather --item "Darksteel Ore"

# Crafting
eorzea craft --recipe "Darksteel Ingot"
eorzea craft --ingredient "Darksteel Ore"

# Collectibles
eorzea mount search "Phoenix"
eorzea minion list --obtained
eorzea orchestrion search "Answers"
```

### Web API

```http
GET /api/items?name=Darksteel
GET /api/items/5115
GET /api/items/5115/sources
GET /api/items/5115/uses

GET /api/gathering/points?type=mining&level=50
GET /api/gathering/items/5115

GET /api/recipes?craft_type=Armorer
GET /api/recipes/5115
GET /api/recipes/5115/materials

GET /api/mounts
GET /api/companions
GET /api/orchestrion
```

## Troubleshooting

### "CSV file not found"

- Ensure the git submodule is initialized: `git submodule update --init --recursive`
- Check that `data/ffxiv-datamining/csv/` exists and contains CSV files
- Try re-initializing the submodule if it's empty

### "Database locked"

- Close any other applications accessing the database
- Kill any background processes
- Delete `data/game.db-wal` and `data/game.db-shm` files

### "Out of memory"

- The seeder processes large CSV files
- Ensure you have at least 2GB RAM available
- Try seeding one section at a time with `--skip-*` flags

### "Foreign key constraint failed"

- This usually means CSV files are from different patches
- Download all CSV files from the same patch/commit
- Run the seeder with all data types at once (don't skip reference data)

## Performance Tips

- Use SSD for database storage (much faster than HDD)
- The first seed takes 5-10 minutes
- Subsequent updates are faster (uses REPLACE strategy)
- Database uses WAL mode for better concurrency
- Indexes are created automatically for fast queries

## Legal Notice

FINAL FANTASY XIV © 2010-2024 SQUARE ENIX CO., LTD. All Rights Reserved.

The CSV data comes from the official game client and is used under fair use for offline reference purposes only. This application is not affiliated with or endorsed by Square Enix.

## Support

For issues or questions:

- Check the [main README](../README.md)
- Open an issue on GitHub
- Join the community Discord

Happy crafting, gathering, and collecting! 🎉

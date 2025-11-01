# Fish Data Update Guide

This document explains how to update the fish database with the latest data from Carbuncle Plushy Fish Tracker.

## Quick Update

To update all fish data in one command:

```bash
yarn update-fish-data
```

This will:

1. Download the latest data from Carbuncle Plushy
2. Parse the JavaScript data to JSON
3. Update the SQLite database

## Manual Update Steps

If you need to run individual steps:

### Step 1: Download Latest Data

```bash
yarn tsx scripts/download-fish-data.ts
```

This downloads the latest `data.js` file from https://ff14fish.carbuncleplushy.com and saves it to `data/fish-data-raw.js`.

**Output:**

- `data/fish-data-raw.js` (~800 KB)

### Step 2: Parse Data to JSON

```bash
yarn tsx scripts/parse-fish-data.ts
```

This converts the JavaScript data object to clean JSON format.

**Output:**

- `data/fish-data.json` (~1.1 MB)
- Statistics about fish counts

### Step 3: Seed Database

```bash
yarn tsx scripts/seed-fish-db.ts
```

This creates/updates the SQLite database with all fish data.

**Output:**

- `data/fish.db` (SQLite database)
- Record counts for all tables

## When to Update

Update the fish database when:

- A new FFXIV patch is released
- New fish are added to the game
- You want the latest data corrections from Carbuncle Plushy

**Recommended:** Check for updates after major patches (e.g., 7.1, 7.2, etc.)

## Data Source

All fish data comes from the **Carbuncle Plushy Fish Tracker**:

- Website: https://ff14fish.carbuncleplushy.com
- Repository: https://github.com/icykoneko/ff14-fish-tracker-app
- License: MIT (see `FISH_LICENSE.txt`)

The data includes:

- 1,000+ fish entries
- Time windows for each fish
- Weather requirements
- Location information
- Bait requirements
- Big fish indicators
- Aquarium compatibility

## Database Schema

The SQLite database contains these tables:

### `fish`

Main fish information with catch requirements

### `fishing_spots`

Fishing location details

### `baits`

Bait and lure items

### `weather_types`

Weather condition IDs

### `weather_rates`

Zone-specific weather patterns

### `zones`

Zone/area information

### `regions`

Regional groupings

## Troubleshooting

### Download fails

- Check your internet connection
- Verify https://ff14fish.carbuncleplushy.com is accessible
- Try again later if the source is temporarily unavailable

### Parse fails

- Ensure `data/fish-data-raw.js` exists
- Check if the file format has changed
- Re-download the data with step 1

### Seed fails

- Delete `data/fish.db` and try again
- Check disk space availability
- Verify `better-sqlite3` is installed

## Advanced Usage

### Custom Database Location

```typescript
import { FishTrackerService } from './src/services/fishTracker';

const service = new FishTrackerService('/path/to/custom/fish.db');
```

### Query Examples

```bash
# Show all big fish
eorzea fish --big

# Show fish from patch 6.0
eorzea fish --patch 6.0

# Show currently catchable fish
eorzea fish --available

# Get details for specific fish
eorzea fish --id 4898

# Show aquarium fish
eorzea fish --aquarium
```

## Contributing

If you find issues with the data:

1. Report to Carbuncle Plushy: https://github.com/icykoneko/ff14-fish-tracker-app/issues
2. After they fix it, run `yarn update-fish-data` to get the update

## License

This project uses fish data from Carbuncle Plushy Fish Tracker under the MIT License.
See `FISH_LICENSE.txt` for full attribution.

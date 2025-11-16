# Intelligent Sync System

The Intelligent Sync system is a revolutionary feature that analyzes achievements and automatically infers quest completions with confidence scoring. This allows you to quickly populate your quest history based on your in-game achievements.

## Overview

When you complete major story milestones in FFXIV (like finishing an expansion's main scenario), you earn achievements. The Intelligent Sync system uses these achievements to infer which quests you must have completed to earn them.

## Features

### Achievement Analysis

- Detects Main Scenario Quest (MSQ) completion achievements
- Maps achievements to quest chains
- Supports all expansions: ARR → Dawntrail

### Confidence Scoring

- **High Confidence (≥90%)**: MSQ completions and major milestones
- **Medium Confidence (70-89%)**: Job quests and class progression
- **Low Confidence (<70%)**: Other inferences

### Full Audit Trail

Every inferred quest completion includes:

- **Source**: `manual`, `sync_inferred`, or `sync_confirmed`
- **Confidence**: 0-100 score
- **Inferred From**: Achievement ID that triggered the inference
- **Reason**: Human-readable explanation

## Usage

### Basic Sync

Sync one or more achievements by their IDs:

```bash
# Single achievement
eorzea sync --achievements 2298

# Multiple achievements
eorzea sync --achievements 2298,2958,3496
```

### Dry Run

Preview what will be inferred without saving:

```bash
eorzea sync --achievements 2298 --dry-run
```

This shows:

- Number of quests that would be inferred
- Confidence breakdown
- Sample quest list

### View Results

After syncing, check your progress:

```bash
# Overall progress
eorzea progress

# Character details with sync stats
eorzea character --active

# View specific quest details
eorzea quest --id 69190
```

## Supported Achievement Mappings

### A Realm Reborn (Expansion 0)

- **#788** - Warrior of Light (Complete all ARR MSQ)
- **#1001** - Eorzea Defended (Before Heavensward)

### Heavensward (Expansion 1)

- **#1139** - Heavensward (3.0 MSQ completion)
- **#1691** - The Far Edge of Fate (3.56 patch MSQ)

### Stormblood (Expansion 2)

- **#1794** - Stormblood (4.0 MSQ completion)
- **#2233** - A Requiem for Heroes (4.56 patch MSQ)

### Shadowbringers (Expansion 3)

- **#2298** - Shadowbringers (5.0 MSQ completion)
- **#2714** - Futures Rewritten (5.55 patch MSQ)

### Endwalker (Expansion 4)

- **#2958** - Endwalker (6.0 MSQ completion)
- **#3773** - In Memoriam (6.55 patch MSQ)

### Dawntrail (Expansion 5)

- **#3496** - Dawntrail (7.0 MSQ completion)
- **#3633** - Seekers of Eternity (7.1 patch MSQ)

## Example Workflow

### 1. Find Your Achievements

In-game, check which expansion MSQ achievements you have. Common ones include:

- Completing the base expansion story (e.g., "Shadowbringers")
- Completing patch MSQ content

### 2. Sync Your Achievements

```bash
# If you've completed Shadowbringers, Endwalker, and Dawntrail
eorzea sync --achievements 2298,2958,3496
```

**Result:**

```
✓ Sync completed!

Results:
  Achievements processed: 3
  Quests inferred: 959
  High confidence (≥90%): 959
  Medium confidence (70-89%): 0
  Low confidence (<70%): 0

Progress: 960 / 5,277 quests (18.2%)
```

### 3. Verify the Results

```bash
# Check overall progress
eorzea progress --quests

# View a specific inferred quest
eorzea quest --id 69190
```

Quest details will show:

- ✅ Source: Inferred from Achievement
- 📊 Confidence: 95%
- 📝 Note: Inferred from achievement: Shadowbringers

### 4. Continue Tracking Manually

After intelligent sync populates your history, continue tracking new quests manually:

```bash
eorzea quest --id 12345 --complete --note "Just finished this"
```

## Technical Details

### Database Schema

Completed quests are stored with the following metadata:

| Field           | Type    | Description                                    |
| --------------- | ------- | ---------------------------------------------- |
| `quest_id`      | INTEGER | Quest identifier                               |
| `completed_at`  | INTEGER | Unix timestamp                                 |
| `source`        | TEXT    | `manual`, `sync_inferred`, or `sync_confirmed` |
| `confidence`    | INTEGER | 0-100 confidence score                         |
| `inferred_from` | INTEGER | Achievement ID that triggered inference        |
| `notes`         | TEXT    | Additional context                             |

### Inference Logic

1. **Achievement Detection**: System checks if you have key MSQ achievements
2. **Quest Chain Resolution**: Finds all quests in the expansion up to the final quest
3. **Batch Marking**: Efficiently marks all quests in a single transaction
4. **Title Auto-unlock**: If achievement rewards a title, it's automatically unlocked
5. **Confidence Assignment**: Based on achievement type and quest relationship

### Performance

- Syncing 3 MSQ achievements: ~1 second
- Infers 900+ quests in a single operation
- Uses database transactions for data integrity
- No network calls required (fully offline)

## Best Practices

### DO

- Sync your highest completion achievements first
- Use dry-run to preview before committing
- Verify a few sample quests after sync
- Continue manual tracking for new quests

### DON'T

- Sync achievements you don't actually have in-game
- Re-sync the same achievements multiple times (it's idempotent but unnecessary)
- Rely solely on inference for 100% accuracy (confidence scores exist for a reason)

## Troubleshooting

### Achievement Not Found

```
#1234 - Not found
```

**Solution**: Verify the achievement ID is correct. Check the [achievement database](https://ffxiv.consolegameswiki.com/wiki/Achievements) or use:

```bash
eorzea achievement search "achievement name"
```

### Fewer Quests Than Expected

Some quests might already be marked as complete, so they won't be re-inferred. Check:

```bash
eorzea character --active
```

Look at the "Quest Sources" section to see your breakdown.

### Confidence Score Questions

**Why 95% and not 100%?**

- We use 95% to acknowledge edge cases (e.g., quest IDs might change between patches)
- The system is extremely accurate but not infallible
- Future versions may adjust based on user feedback

## Roadmap

Future enhancements planned:

- Lodestone achievement API integration (auto-detect your achievements)
- Job quest inference based on level achievements
- Dungeon unlock inference
- Beast tribe quest inference
- Patch MSQ milestone achievements
- Confidence adjustment system based on user corrections

## Examples

### New Player Starting Fresh

```bash
# Just finished ARR
eorzea sync --achievements 788

# Result: ~200 ARR quests marked complete
```

### Veteran Player Catching Up

```bash
# Completed through Endwalker
eorzea sync --achievements 788,1139,1794,2298,2958

# Result: ~800 quests inferred across all expansions
```

### Testing Before Commit

```bash
# Preview what Dawntrail achievement would infer
eorzea sync --achievements 3496 --dry-run

# Review results, then commit if satisfied
eorzea sync --achievements 3496
```

## Support

For issues or questions:

- Check the [main README](../README.md)
- Review quest details with `eorzea quest --id <id>`
- Report issues on GitHub

## See Also

- [Quest Tracking Guide](./game-data-parsing.md)
- [Fish Data Management](./fish-data-update.md)
- [Quick Start Guide](../QUICK_START_WEB.md)

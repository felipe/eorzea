# 🎯 **COMPREHENSIVE PLAN: Offline Quest Data System Using CSV + Schema Definitions**

## **Executive Summary**

Build a 100% offline quest tracking system by parsing CSV files from the ffxiv-datamining repository using schema definitions from SaintCoinach, then storing in SQLite. This eliminates all API dependencies while maintaining the same architecture as our existing fish tracking system.

---

## **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCES (GitHub)                     │
├─────────────────────────────────────────────────────────────┤
│  xivapi/ffxiv-datamining/csv/                               │
│    ├─ Quest.csv           (5,420 rows, 1500+ columns)       │
│    ├─ ClassJob.csv        (Class/Job definitions)           │
│    ├─ PlaceName.csv       (Location names)                  │
│    ├─ ExVersion.csv       (Expansion data)                  │
│    └─ JournalGenre.csv    (Quest categories)                │
│                                                              │
│  xivapi/SaintCoinach/Definitions/                           │
│    ├─ Quest.json          (Column → Field mappings)         │
│    ├─ ClassJob.json       (Schema definitions)              │
│    └─ PlaceName.json      (Schema definitions)              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              DOWNLOAD PHASE (One-time / On Updates)         │
├─────────────────────────────────────────────────────────────┤
│  scripts/download-game-data.ts                              │
│    • Downloads CSVs from ffxiv-datamining                   │
│    • Downloads schema JSONs from SaintCoinach               │
│    • Stores in: data/ffxiv-datamining/csv/                              │
│    • Stores in: data/game-schemas/                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              PARSE PHASE (TypeScript Processing)            │
├─────────────────────────────────────────────────────────────┤
│  src/parsers/csvParser.ts                                   │
│    • Generic CSV reader                                     │
│    • Schema-based column mapping                            │
│    • Type conversion (str, int32, bool, etc.)               │
│    • Foreign key resolution                                 │
│                                                              │
│  scripts/parse-quest-data.ts                                │
│    • Uses CSVParser to read Quest.csv + Quest.json          │
│    • Resolves foreign keys to other sheets                  │
│    • Outputs: data/quest-data.json                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              SEED PHASE (SQLite Database)                   │
├─────────────────────────────────────────────────────────────┤
│  scripts/seed-quest-db.ts                                   │
│    • Reads quest-data.json                                  │
│    • Creates database schema                                │
│    • Inserts into data/game.db (SQLite)                     │
│    • Creates indexes for performance                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              RUNTIME PHASE (Query Service)                  │
├─────────────────────────────────────────────────────────────┤
│  src/services/questTracker.ts                               │
│    • Queries SQLite database                                │
│    • Returns Quest objects                                  │
│    • Provides search/filter methods                         │
│                                                              │
│  src/commands/quest.ts                                      │
│    • CLI interface                                          │
│    • Uses QuestTrackerService                               │
│    • Displays quest information                             │
└─────────────────────────────────────────────────────────────┘
```

---

## **Phase 1: Download Game Data from GitHub**

### **Purpose**

Download CSV files and schema definitions from GitHub repositories to local filesystem.

### **Input**

- GitHub URLs for CSV files
- GitHub URLs for schema JSON files

### **Output**

```
data/
├── ffxiv-datamining/csv/
│   ├── Quest.csv
│   ├── ClassJob.csv
│   ├── PlaceName.csv
│   ├── ExVersion.csv
│   └── JournalGenre.csv
└── game-schemas/
    ├── Quest.json
    ├── ClassJob.json
    ├── PlaceName.json
    ├── ExVersion.json
    └── JournalGenre.json
```

### **Implementation: `scripts/download-game-data.ts`**

```typescript
interface DownloadConfig {
  csvFiles: string[]; // List of CSV files to download
  schemaFiles: string[]; // List of schema JSON files
  csvBaseUrl: string; // xivapi/ffxiv-datamining base URL
  schemaBaseUrl: string; // xivapi/SaintCoinach base URL
}

async function downloadGameData(config: DownloadConfig): Promise<void> {
  // 1. Create directories if they don't exist
  //    - data/ffxiv-datamining/csv/
  //    - data/game-schemas/

  // 2. Download each CSV file
  for (const csvFile of config.csvFiles) {
    const url = `${config.csvBaseUrl}/csv/${csvFile}`;
    const destination = `data/ffxiv-datamining/csv/${csvFile}`;
    await downloadFile(url, destination);
  }

  // 3. Download each schema JSON file
  for (const schemaFile of config.schemaFiles) {
    const url = `${config.schemaBaseUrl}/Definitions/${schemaFile}`;
    const destination = `data/game-schemas/${schemaFile}`;
    await downloadFile(url, destination);
  }
}
```

### **Files to Download**

**CSVs (from ffxiv-datamining):**

- `Quest.csv` (~5,420 rows)
- `ClassJob.csv` (~40 rows)
- `ClassJobCategory.csv` (~200 rows)
- `PlaceName.csv` (~3,000 rows)
- `ExVersion.csv` (~10 rows - expansions)
- `JournalGenre.csv` (~20 rows - quest categories)
- `Level.csv` (for coordinates/location data)

**Schemas (from SaintCoinach/Definitions):**

- `Quest.json`
- `ClassJob.json`
- `ClassJobCategory.json`
- `PlaceName.json`
- `ExVersion.json`
- `JournalGenre.json`
- `Level.json`

### **Commands**

```bash
yarn download-game-data    # Downloads everything
yarn download-game-data --update  # Re-downloads (on patches)
```

---

## **Phase 2: CSV Parser Implementation**

### **Purpose**

Parse CSV files using schema definitions to map columns to meaningful field names and resolve foreign key relationships.

### **Core Concepts**

#### **Schema Structure**

```json
{
  "sheet": "Quest",
  "definitions": [
    {
      "index": 0,
      "name": "Name",
      "type": "str"
    },
    {
      "index": 2,
      "name": "Expansion",
      "converter": {
        "type": "link",
        "target": "ExVersion"
      }
    },
    {
      "index": 4,
      "name": "ClassJobLevel"
    }
  ]
}
```

#### **CSV Structure**

```csv
key,0,1,2,3,4,5,...
65537,"A Good Adventurer",SubFst010_00001,0,1,1,0,...
```

#### **Mapping Process**

1. Read CSV row: `["65537", "A Good Adventurer", "SubFst010_00001", "0", "1", "1", ...]`
2. Read schema: Column 0 = "Name", Column 2 = "Expansion" (links to ExVersion)
3. Map: `{ id: 65537, Name: "A Good Adventurer", Expansion: {...} }`

### **Implementation: `src/parsers/csvParser.ts`**

```typescript
interface SchemaDefinition {
  sheet: string;
  defaultColumn?: string;
  definitions: ColumnDefinition[];
}

interface ColumnDefinition {
  index?: number;
  name: string;
  type?: 'str' | 'int32' | 'uint32' | 'int16' | 'uint16' | 'byte' | 'bool' | 'single';
  converter?: {
    type: 'link' | 'color' | 'icon' | 'multiref';
    target?: string; // For 'link' type: target sheet name
  };
  count?: number; // For repeat columns
  definition?: ColumnDefinition; // For nested definitions
}

class CSVParser {
  private schemas: Map<string, SchemaDefinition>;
  private cache: Map<string, Map<number, any>>;

  constructor(schemaDir: string, csvDir: string) {
    this.schemas = new Map();
    this.cache = new Map();
  }

  /**
   * Parse a sheet by name
   * @param sheetName - Name of the sheet (e.g., "Quest")
   * @returns Map of row_id to parsed object
   */
  parseSheet(sheetName: string): Map<number, any> {
    // Check cache first
    if (this.cache.has(sheetName)) {
      return this.cache.get(sheetName)!;
    }

    // 1. Load schema
    const schema = this.loadSchema(sheetName);

    // 2. Load CSV
    const rows = this.loadCSV(sheetName);

    // 3. Parse each row
    const result = new Map<number, any>();
    for (const [key, row] of rows) {
      const parsed = this.parseRow(row, schema);
      result.set(key, parsed);
    }

    // Cache result
    this.cache.set(sheetName, result);
    return result;
  }

  private parseRow(row: string[], schema: SchemaDefinition): any {
    const obj: any = {};

    for (const def of schema.definitions) {
      const value = this.parseColumn(row, def);
      obj[def.name] = value;
    }

    return obj;
  }

  private parseColumn(row: string[], def: ColumnDefinition): any {
    const index = def.index ?? 0;
    const rawValue = row[index];

    // Handle foreign keys (links to other sheets)
    if (def.converter?.type === 'link') {
      const targetId = parseInt(rawValue);
      if (targetId === 0) return null;

      // Recursively parse linked sheet
      const targetSheet = this.parseSheet(def.converter.target!);
      return targetSheet.get(targetId);
    }

    // Handle type conversion
    return this.convertType(rawValue, def.type);
  }

  private convertType(value: string, type?: string): any {
    if (!value || value === '') return null;

    switch (type) {
      case 'int32':
      case 'uint32':
      case 'int16':
      case 'uint16':
      case 'byte':
        return parseInt(value);
      case 'bool':
        return value === 'True';
      case 'single':
        return parseFloat(value);
      case 'str':
      default:
        return value;
    }
  }

  private loadSchema(sheetName: string): SchemaDefinition {
    // Read from data/game-schemas/${sheetName}.json
  }

  private loadCSV(sheetName: string): Map<number, string[]> {
    // Read from data/ffxiv-datamining/csv/${sheetName}.csv
    // Return Map of key (first column) to row array
  }
}
```

### **Key Features**

1. **Type Conversion**
   - Handles: `str`, `int32`, `uint32`, `int16`, `uint16`, `byte`, `bool`, `single`
   - Null handling for empty values

2. **Foreign Key Resolution**
   - When `converter.type === 'link'`, loads and resolves target sheet
   - Recursive parsing with caching to avoid infinite loops
   - Returns nested object instead of just ID

3. **Caching**
   - Caches parsed sheets to avoid re-parsing
   - Critical for sheets with many foreign keys

4. **Error Handling**
   - Validates schema exists
   - Validates CSV exists
   - Handles missing columns gracefully

---

## **Phase 3: Quest Data Parsing**

### **Purpose**

Use the CSVParser to specifically parse quest data and output structured JSON.

### **Implementation: `scripts/parse-quest-data.ts`**

```typescript
interface ParsedQuest {
  id: number;
  name: string;
  level: number;
  classJob?: {
    id: number;
    name: string;
    abbreviation: string;
  };
  expansion: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
  };
  journalGenre?: {
    id: number;
    name: string;
  };
  previousQuests: number[]; // Array of quest IDs
  iconId: number;
  isRepeatable: boolean;
  gilReward: number;
  expReward: number;
}

async function parseQuestData(): Promise<void> {
  // 1. Initialize CSV parser
  const parser = new CSVParser('data/game-schemas', 'data/ffxiv-datamining/csv');

  // 2. Parse Quest sheet
  const quests = parser.parseSheet('Quest');

  // 3. Transform to our structure
  const questData: Record<number, ParsedQuest> = {};

  for (const [id, rawQuest] of quests) {
    // Skip empty quests (id 0, name empty)
    if (!rawQuest.Name || rawQuest.Name === '') continue;

    questData[id] = {
      id: id,
      name: rawQuest.Name,
      level: rawQuest.ClassJobLevel0 || 0,
      classJob: rawQuest.ClassJob
        ? {
            id: rawQuest.ClassJob.id,
            name: rawQuest.ClassJob.Name,
            abbreviation: rawQuest.ClassJob.Abbreviation,
          }
        : undefined,
      expansion: {
        id: rawQuest.Expansion?.id || 0,
        name: rawQuest.Expansion?.Name || 'Unknown',
      },
      location: rawQuest.PlaceName
        ? {
            id: rawQuest.PlaceName.id,
            name: rawQuest.PlaceName.Name,
          }
        : undefined,
      journalGenre: rawQuest.JournalGenre
        ? {
            id: rawQuest.JournalGenre.id,
            name: rawQuest.JournalGenre.Name,
          }
        : undefined,
      previousQuests: rawQuest.PreviousQuest || [],
      iconId: rawQuest.Icon?.id || 0,
      isRepeatable: rawQuest.IsRepeatable || false,
      gilReward: rawQuest.GilReward || 0,
      expReward: rawQuest.ExpReward || 0,
    };
  }

  // 4. Write to JSON
  await writeFile('data/quest-data.json', JSON.stringify({ quests: questData }, null, 2));

  console.log(`✅ Parsed ${Object.keys(questData).length} quests`);
}
```

### **Output Format: `data/quest-data.json`**

```json
{
  "quests": {
    "65537": {
      "id": 65537,
      "name": "A Good Adventurer Is Hard to Find",
      "level": 1,
      "classJob": {
        "id": 5,
        "name": "Archer",
        "abbreviation": "ARC"
      },
      "expansion": {
        "id": 0,
        "name": "A Realm Reborn"
      },
      "location": {
        "id": 55,
        "name": "New Gridania"
      },
      "journalGenre": {
        "id": 2,
        "name": "Main Scenario Quest"
      },
      "previousQuests": [65575],
      "iconId": 71201,
      "isRepeatable": false,
      "gilReward": 100,
      "expReward": 300
    }
  }
}
```

### **Commands**

```bash
yarn parse-quest-data      # Parses CSVs → JSON
yarn parse-quest-data --validate  # Includes validation
```

---

## **Phase 4: Database Seeding**

### **Purpose**

Create SQLite database and populate with parsed quest data, mirroring the fish database pattern.

### **Database Schema**

```sql
-- Main quests table
CREATE TABLE quests (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER,
  class_job_id INTEGER,
  class_job_name TEXT,
  class_job_abbr TEXT,
  expansion_id INTEGER,
  expansion_name TEXT,
  location_id INTEGER,
  location_name TEXT,
  journal_genre_id INTEGER,
  journal_genre TEXT,
  previous_quest_ids TEXT,  -- JSON array: [65575, 65576]
  icon_id INTEGER,
  is_repeatable BOOLEAN,
  gil_reward INTEGER,
  exp_reward INTEGER
);

-- Indexes for common queries
CREATE INDEX idx_quest_name ON quests(name);
CREATE INDEX idx_quest_level ON quests(level);
CREATE INDEX idx_quest_expansion ON quests(expansion_id);
CREATE INDEX idx_quest_class_job ON quests(class_job_id);
CREATE INDEX idx_quest_location ON quests(location_id);

-- Full-text search for quest names
CREATE VIRTUAL TABLE quests_fts USING fts5(
  name,
  content=quests,
  content_rowid=id
);
```

### **Implementation: `scripts/seed-quest-db.ts`**

```typescript
async function seedQuestDatabase(): Promise<void> {
  console.log('🌱 Seeding quest database...');

  // 1. Read quest-data.json
  const data = JSON.parse(await readFile('data/quest-data.json', 'utf-8'));

  // 2. Open/create database
  const db = new Database('data/game.db');

  // 3. Create schema
  createSchema(db);

  // 4. Prepare insert statement
  const insertQuest = db.prepare(`
    INSERT OR REPLACE INTO quests (
      id, name, level, class_job_id, class_job_name, class_job_abbr,
      expansion_id, expansion_name, location_id, location_name,
      journal_genre_id, journal_genre, previous_quest_ids,
      icon_id, is_repeatable, gil_reward, exp_reward
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 5. Transaction for bulk insert
  const insertAll = db.transaction(() => {
    let count = 0;

    for (const quest of Object.values(data.quests)) {
      insertQuest.run(
        quest.id,
        quest.name,
        quest.level,
        quest.classJob?.id || null,
        quest.classJob?.name || null,
        quest.classJob?.abbreviation || null,
        quest.expansion.id,
        quest.expansion.name,
        quest.location?.id || null,
        quest.location?.name || null,
        quest.journalGenre?.id || null,
        quest.journalGenre?.name || null,
        JSON.stringify(quest.previousQuests),
        quest.iconId,
        quest.isRepeatable ? 1 : 0,
        quest.gilReward,
        quest.expReward
      );
      count++;
    }

    return count;
  });

  // 6. Execute transaction
  const count = insertAll();

  // 7. Build full-text search index
  db.exec(`
    INSERT INTO quests_fts(name)
    SELECT name FROM quests;
  `);

  db.close();

  console.log(`✅ Seeded ${count} quests`);
}
```

### **Commands**

```bash
yarn seed-quest-db         # Seeds database from JSON
yarn seed-quest-db --force # Drops and recreates
```

---

## **Phase 5: Quest Tracker Service**

### **Purpose**

Provide query methods for quest data, mirroring the FishTrackerService pattern.

### **Implementation: `src/services/questTracker.ts`**

```typescript
export interface Quest {
  id: number;
  name: string;
  level: number;
  classJob?: {
    id: number;
    name: string;
    abbreviation: string;
  };
  expansion: {
    id: number;
    name: string;
  };
  location?: {
    id: number;
    name: string;
  };
  journalGenre?: string;
  previousQuests: number[];
  iconId: number;
  isRepeatable: boolean;
  gilReward: number;
  expReward: number;
}

export interface QuestSearchOptions {
  name?: string;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  classJobId?: number;
  expansionId?: number;
  locationId?: number;
  isRepeatable?: boolean;
  limit?: number;
  offset?: number;
}

export class QuestTrackerService {
  private db: Database.Database;

  constructor(dbPath: string = 'data/game.db') {
    this.db = new Database(dbPath, { readonly: true });
  }

  /**
   * Get quest by ID
   */
  getQuestById(id: number): Quest | null {
    const row = this.db.prepare('SELECT * FROM quests WHERE id = ?').get(id);

    return row ? this.mapRowToQuest(row) : null;
  }

  /**
   * Search quests with filters
   */
  searchQuests(options: QuestSearchOptions = {}): Quest[] {
    let query = 'SELECT * FROM quests WHERE 1=1';
    const params: any[] = [];

    if (options.name) {
      query += ' AND name LIKE ?';
      params.push(`%${options.name}%`);
    }

    if (options.level !== undefined) {
      query += ' AND level = ?';
      params.push(options.level);
    }

    if (options.minLevel !== undefined) {
      query += ' AND level >= ?';
      params.push(options.minLevel);
    }

    if (options.maxLevel !== undefined) {
      query += ' AND level <= ?';
      params.push(options.maxLevel);
    }

    if (options.classJobId !== undefined) {
      query += ' AND class_job_id = ?';
      params.push(options.classJobId);
    }

    if (options.expansionId !== undefined) {
      query += ' AND expansion_id = ?';
      params.push(options.expansionId);
    }

    if (options.isRepeatable !== undefined) {
      query += ' AND is_repeatable = ?';
      params.push(options.isRepeatable ? 1 : 0);
    }

    query += ' ORDER BY expansion_id, level, id';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params);
    return rows.map((row) => this.mapRowToQuest(row));
  }

  /**
   * Full-text search quests by name
   */
  fullTextSearch(query: string, limit: number = 10): Quest[] {
    const rows = this.db
      .prepare(
        `
        SELECT quests.* FROM quests
        JOIN quests_fts ON quests.id = quests_fts.rowid
        WHERE quests_fts MATCH ?
        LIMIT ?
      `
      )
      .all(query, limit);

    return rows.map((row) => this.mapRowToQuest(row));
  }

  /**
   * Get quest chain (follows prerequisites)
   */
  getQuestChain(questId: number): Quest[] {
    const chain: Quest[] = [];
    const visited = new Set<number>();

    const addToChain = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const quest = this.getQuestById(id);
      if (!quest) return;

      // Add prerequisites first (recursive)
      for (const prevId of quest.previousQuests) {
        addToChain(prevId);
      }

      chain.push(quest);
    };

    addToChain(questId);
    return chain;
  }

  /**
   * Get total quest count
   */
  getTotalCount(): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM quests').get() as any;
    return result.count;
  }

  /**
   * Get quest count by expansion
   */
  getQuestCountByExpansion(): Record<string, number> {
    const rows = this.db
      .prepare(
        `
        SELECT expansion_name, COUNT(*) as count
        FROM quests
        GROUP BY expansion_name
        ORDER BY expansion_id
      `
      )
      .all() as any[];

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.expansion_name] = row.count;
    }
    return result;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  private mapRowToQuest(row: any): Quest {
    return {
      id: row.id,
      name: row.name,
      level: row.level,
      classJob: row.class_job_id
        ? {
            id: row.class_job_id,
            name: row.class_job_name,
            abbreviation: row.class_job_abbr,
          }
        : undefined,
      expansion: {
        id: row.expansion_id,
        name: row.expansion_name,
      },
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
          }
        : undefined,
      journalGenre: row.journal_genre,
      previousQuests: JSON.parse(row.previous_quest_ids || '[]'),
      iconId: row.icon_id,
      isRepeatable: row.is_repeatable === 1,
      gilReward: row.gil_reward,
      expReward: row.exp_reward,
    };
  }
}
```

---

## **Phase 6: CLI Integration**

### **Purpose**

Update quest commands to use QuestTrackerService instead of XIVAPI.

### **Implementation: `src/commands/quest.ts`**

```typescript
import { QuestTrackerService } from '../services/questTracker.js';

// BEFORE (XIVAPI):
// const client = getXIVAPIClient();
// const results = await client.searchQuests(query);

// AFTER (Local Database):
const service = new QuestTrackerService();
const results = service.searchQuests({ name: query, limit: 10 });

// Search command
questCommand
  .command('search <query>')
  .description('Search for quests by name')
  .option('-l, --limit <number>', 'Limit results', '10')
  .action(async (query, options) => {
    const service = new QuestTrackerService();
    const results = service.fullTextSearch(query, parseInt(options.limit));

    console.log(`Found ${results.length} quests:`);
    for (const quest of results) {
      console.log(`  ${quest.id}: ${quest.name} (Lv${quest.level})`);
    }

    service.close();
  });

// Get quest details
questCommand
  .command('get <id>')
  .description('Get quest details by ID')
  .action(async (id) => {
    const service = new QuestTrackerService();
    const quest = service.getQuestById(parseInt(id));

    if (!quest) {
      console.log('Quest not found');
      return;
    }

    console.log(chalk.bold(`\n${quest.name}`));
    console.log(`Level: ${quest.level}`);
    if (quest.classJob) {
      console.log(`Job: ${quest.classJob.name}`);
    }
    console.log(`Expansion: ${quest.expansion.name}`);
    if (quest.location) {
      console.log(`Location: ${quest.location.name}`);
    }

    service.close();
  });

// Quest chain
questCommand
  .command('chain <id>')
  .description('Show quest chain (prerequisites)')
  .action(async (id) => {
    const service = new QuestTrackerService();
    const chain = service.getQuestChain(parseInt(id));

    console.log(`\nQuest Chain (${chain.length} quests):`);
    for (let i = 0; i < chain.length; i++) {
      const quest = chain[i];
      console.log(`  ${i + 1}. ${quest.name} (Lv${quest.level})`);
    }

    service.close();
  });
```

---

## **Phase 7: Update Scripts & Workflow**

### **Master Update Script: `scripts/update-game-data.sh`**

```bash
#!/bin/bash
set -e

echo "📦 Updating FFXIV Game Data..."
echo ""

echo "📥 Step 1: Downloading CSVs and schemas from GitHub..."
yarn tsx scripts/download-game-data.ts

echo ""
echo "📊 Step 2: Parsing CSVs with schemas..."
yarn tsx scripts/parse-quest-data.ts

echo ""
echo "🌱 Step 3: Seeding database..."
yarn tsx scripts/seed-quest-db.ts

echo ""
echo "✅ Game data updated successfully!"
echo ""
echo "Database location: data/game.db"
echo "Run 'yarn test' to verify data integrity"
```

### **Package.json Scripts**

```json
{
  "scripts": {
    "download-game-data": "tsx scripts/download-game-data.ts",
    "parse-quest-data": "tsx scripts/parse-quest-data.ts",
    "seed-quest-db": "tsx scripts/seed-quest-db.ts",
    "update-game-data": "./scripts/update-game-data.sh",
    "test": "jest"
  }
}
```

---

## **Phase 8: Testing Strategy**

### **Unit Tests: `__tests__/parsers/csvParser.test.ts`**

```typescript
describe('CSVParser', () => {
  let parser: CSVParser;

  beforeEach(() => {
    parser = new CSVParser('data/game-schemas', 'data/ffxiv-datamining/csv');
  });

  test('should parse simple string column', () => {
    const quest = parser.parseSheet('Quest').get(65537);
    expect(quest.Name).toBe('A Good Adventurer Is Hard to Find');
  });

  test('should parse integer column', () => {
    const quest = parser.parseSheet('Quest').get(65537);
    expect(quest.ClassJobLevel0).toBe(1);
  });

  test('should resolve foreign key (link)', () => {
    const quest = parser.parseSheet('Quest').get(65537);
    expect(quest.Expansion).toBeDefined();
    expect(quest.Expansion.Name).toBe('A Realm Reborn');
  });

  test('should handle null values', () => {
    const quest = parser.parseSheet('Quest').get(65536);
    expect(quest.Name).toBeNull();
  });
});
```

### **Integration Tests: `__tests__/services/questTracker.test.ts`**

```typescript
describe('QuestTrackerService', () => {
  let service: QuestTrackerService;

  beforeAll(() => {
    service = new QuestTrackerService('data/game.db');
  });

  afterAll(() => {
    service.close();
  });

  test('should get quest by ID', () => {
    const quest = service.getQuestById(65537);
    expect(quest).toBeDefined();
    expect(quest?.name).toBe('A Good Adventurer Is Hard to Find');
  });

  test('should search quests by name', () => {
    const results = service.searchQuests({ name: 'Adventurer' });
    expect(results.length).toBeGreaterThan(0);
  });

  test('should filter by level', () => {
    const results = service.searchQuests({ level: 1 });
    expect(results.every((q) => q.level === 1)).toBe(true);
  });

  test('should get quest chain', () => {
    const chain = service.getQuestChain(65537);
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[chain.length - 1].id).toBe(65537);
  });

  test('should return total count', () => {
    const count = service.getTotalCount();
    expect(count).toBeGreaterThan(5000);
  });
});
```

---

## **Phase 9: Documentation**

### **User Documentation: `docs/quest-data-update.md`**

````markdown
# Quest Data Update Guide

## Initial Setup

1. Install dependencies:
   ```bash
   yarn install
   ```
````

2. Download and seed quest data:

   ```bash
   yarn update-game-data
   ```

3. Verify installation:
   ```bash
   yarn test
   eorzea quest search "Sylph"
   ```

## Updating Quest Data (On Patches)

When a new FFXIV patch is released:

```bash
yarn update-game-data
```

This will:

1. Download latest CSVs from GitHub
2. Parse with schemas
3. Update database

## Data Sources

- **CSV Files**: xivapi/ffxiv-datamining
- **Schemas**: xivapi/SaintCoinach
- **License**: See LICENSE files

## Troubleshooting

**Error: "Schema not found"**

- Ensure schemas are downloaded
- Check `data/game-schemas/` exists

**Error: "CSV parse error"**

- CSV format may have changed
- Check ffxiv-datamining for updates

**Empty search results**

- Run `yarn seed-quest-db --force`
- Verify database exists: `ls data/game.db`

```

---

## **Directory Structure (Final)**

```

eorzea/
├── data/
│ ├── fish.db # Fish tracking (existing)
│ ├── game.db # Quest tracking (NEW)
│ ├── fish-data.json # Fish source data (existing)
│ ├── quest-data.json # Quest source data (NEW)
│ ├── ffxiv-datamining/csv/ # Downloaded CSVs (NEW)
│ │ ├── Quest.csv
│ │ ├── ClassJob.csv
│ │ ├── PlaceName.csv
│ │ └── ExVersion.csv
│ └── game-schemas/ # Downloaded schemas (NEW)
│ ├── Quest.json
│ ├── ClassJob.json
│ └── PlaceName.json
├── scripts/
│ ├── download-game-data.ts # NEW - Downloads CSVs + schemas
│ ├── parse-quest-data.ts # NEW - Parses CSVs → JSON
│ ├── seed-quest-db.ts # NEW - Seeds SQLite
│ ├── update-game-data.sh # NEW - Master update script
│ ├── download-fish-data.ts # Existing
│ └── seed-fish-db.ts # Existing
├── src/
│ ├── parsers/ # NEW
│ │ └── csvParser.ts # Generic CSV parser with schema
│ ├── services/
│ │ ├── fishTracker.ts # Existing
│ │ ├── questTracker.ts # NEW - Replaces xivapi.ts
│ │ └── xivapi.ts # DELETE after migration
│ ├── commands/
│ │ ├── fish.ts # Existing
│ │ └── quest.ts # UPDATE to use questTracker
│ └── types/
│ ├── fish.ts # Existing
│ └── quest.ts # NEW
├── **tests**/
│ ├── parsers/
│ │ └── csvParser.test.ts # NEW
│ └── services/
│ ├── fishTracker.test.ts # Existing
│ └── questTracker.test.ts # NEW
└── docs/
├── fish-data-update.md # Existing
├── quest-data-update.md # NEW
└── game-data-parsing.md # THIS DOCUMENT

````

---

## **Dependencies**

### **Existing (No Changes)**
- `better-sqlite3` - SQLite database
- `tsx` - TypeScript execution
- `commander` - CLI framework
- `chalk` - Terminal colors

### **New (None Required!)**
- All CSV parsing done with native Node.js
- All HTTP downloads with native `fetch`
- No additional npm packages needed

---

## **Success Criteria**

- [ ] CSVs download from GitHub successfully
- [ ] Schemas download from GitHub successfully
- [ ] CSV parser correctly maps columns to fields
- [ ] Foreign keys resolve to nested objects
- [ ] quest-data.json contains all quest information
- [ ] Database seeds without errors
- [ ] Quest search returns accurate results
- [ ] Quest chain follows prerequisites correctly
- [ ] All tests pass (parser + service)
- [ ] Zero XIVAPI API calls for quest data
- [ ] Documentation complete and accurate
- [ ] Update script runs without errors

---

## **Timeline Estimate**

- **Phase 1** (Download): 2 hours
- **Phase 2** (CSV Parser): 6-8 hours
- **Phase 3** (Parse Quests): 2 hours
- **Phase 4** (Database): 2 hours
- **Phase 5** (Service): 3 hours
- **Phase 6** (CLI): 1 hour
- **Phase 7** (Scripts): 1 hour
- **Phase 8** (Tests): 3 hours
- **Phase 9** (Docs): 1 hour

**Total: 21-23 hours** (approximately 3 days of work)

---

## **Key Decisions & Rationale**

1. **TypeScript over Python**
   - Maintains consistency with existing codebase
   - No additional language dependencies
   - Users don't need Python installed

2. **Separate database (game.db vs fish.db)**
   - Clean separation of concerns
   - Different update schedules
   - Easier to maintain and backup

3. **Schema-based parsing**
   - Future-proof for game updates
   - Supports multiple sheets easily
   - Matches SaintCoinach architecture

4. **JSON intermediate format**
   - Easy to inspect and validate
   - Can be committed to git for version control
   - Allows manual corrections if needed

5. **SQLite for runtime**
   - Fast queries
   - No server required
   - Portable single file

---

## **Risks & Mitigations**

| Risk | Impact | Mitigation |
|------|--------|------------|
| CSV format changes between patches | High | Use versioned schemas, test after updates |
| Foreign key resolution errors | Medium | Comprehensive error handling, validation tests |
| Performance issues with large sheets | Low | Implement caching, lazy loading |
| Schema definitions incomplete | Medium | Start with essential fields, expand as needed |
| CSV parsing edge cases | Medium | Unit tests for various data types |

---

## **Future Enhancements**

1. **Additional Sheets**
   - Items (for quest rewards)
   - Achievements
   - Mounts/Minions

2. **Advanced Features**
   - Quest recommendations based on level
   - Nearest quest location
   - Quest reward filtering

3. **Performance**
   - Incremental updates (only changed data)
   - Compressed JSON storage
   - Database query optimization

4. **UI**
   - Interactive quest chain visualizer
   - Map integration
   - Progress tracking

---

## **Backup Plan: Docker SaintCoinach**

If GitHub repositories become unavailable, we can extract CSVs ourselves using SaintCoinach in Docker:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:6.0

# Clone SaintCoinach
RUN git clone https://github.com/xivapi/SaintCoinach.git /SaintCoinach
WORKDIR /SaintCoinach

# Build
RUN dotnet build SaintCoinach.sln

# Mount FFXIV game files at /game
# Mount output directory at /output
CMD ["dotnet", "run", "--project", "SaintCoinach.Cmd", "--", "/game", "rawexd", "/output"]
````

Usage:

```bash
docker build -t saintocinach .
docker run -v /path/to/ffxiv:/game -v ./output:/output saintocinach
```

This generates the same CSV files that are on GitHub, ensuring we're never blocked.

---

## **Conclusion**

This plan provides a complete, self-contained solution for offline quest tracking that:

- ✅ Eliminates all API dependencies
- ✅ Uses publicly available data sources
- ✅ Maintains consistency with existing fish tracking
- ✅ Scales to additional game data types
- ✅ Requires zero runtime dependencies

The implementation follows proven patterns from the fish tracking system while leveraging the same data sources (CSVs + schemas) that power tools like Carbuncle Plushy and XIVAPI itself.

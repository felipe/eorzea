/**
 * Helper to parse quest objectives from raw CSV row data
 */

import { readFileSync } from 'fs';
import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import type { QuestObjective, ObjectiveType, FishObjectiveDetails } from '../src/types/quest.js';

export class ObjectiveParser {
  private fishData: any = null;
  private fishDb: Database.Database | null = null;
  private itemNames = new Map<number, string>();
  private enemyNames = new Map<number, string>();
  private npcNames = new Map<number, string>();
  private eobjNames = new Map<number, string>();
  private questCsvRows = new Map<number, string[]>();

  constructor(
    private csvDir: string,
    private fishDataPath: string,
    private fishDbPath: string
  ) {}

  async initialize(): Promise<void> {
    // Load fish data
    try {
      const fishDataRaw = readFileSync(this.fishDataPath, 'utf-8');
      this.fishData = JSON.parse(fishDataRaw);
    } catch (error) {
      // Fish data not available
    }

    // Load fish database
    try {
      this.fishDb = new Database(this.fishDbPath, { readonly: true });
    } catch (error) {
      // Fish DB not available
    }

    // Load Item names from CSV
    await this.loadItemNames();
    await this.loadEnemyNames();
    await this.loadNPCNames();
    await this.loadObjectNames();

    // Load quest CSV rows for direct access
    await this.loadQuestCSV();
  }

  private async loadItemNames(): Promise<void> {
    const content = readFileSync(`${this.csvDir}/Item.csv`, 'utf-8');
    const records = parse(content, { skip_empty_lines: true });

    records.slice(1).forEach((row: any[]) => {
      const id = parseInt(row[0]);
      const name = row[10]; // Name is at index 10
      if (id && name) {
        this.itemNames.set(id, name);
      }
    });
  }

  private async loadEnemyNames(): Promise<void> {
    const content = readFileSync(`${this.csvDir}/BNpcName.csv`, 'utf-8');
    const records = parse(content, { skip_empty_lines: true });

    records.slice(1).forEach((row: any[]) => {
      const id = parseInt(row[0]);
      const name = row[1]; // Singular is at index 1
      if (id && name) {
        this.enemyNames.set(id, name);
      }
    });
  }

  private async loadNPCNames(): Promise<void> {
    const content = readFileSync(`${this.csvDir}/ENpcResident.csv`, 'utf-8');
    const records = parse(content, { skip_empty_lines: true });

    records.slice(1).forEach((row: any[]) => {
      const id = parseInt(row[0]);
      const name = row[1]; // Singular is at index 1
      if (id && name) {
        this.npcNames.set(id, name);
      }
    });
  }

  private async loadObjectNames(): Promise<void> {
    const content = readFileSync(`${this.csvDir}/EObjName.csv`, 'utf-8');
    const records = parse(content, { skip_empty_lines: true });

    records.slice(1).forEach((row: any[]) => {
      const id = parseInt(row[0]);
      const name = row[1]; // Singular is at index 1
      if (id && name) {
        this.eobjNames.set(id, name);
      }
    });
  }

  private async loadQuestCSV(): Promise<void> {
    const content = readFileSync(`${this.csvDir}/Quest.csv`, 'utf-8');
    const records = parse(content, { skip_empty_lines: true });

    records.slice(1).forEach((row: any[]) => {
      const id = parseInt(row[0]);
      if (id) {
        this.questCsvRows.set(id, row);
      }
    });
  }

  parseObjectives(questId: number): QuestObjective[] {
    const row = this.questCsvRows.get(questId);
    if (!row) return [];

    const objectives: QuestObjective[] = [];

    // ToDoQty starts at index 1199 (1198 + 1 for key column)
    // Script{Instruction} starts at index 51 (50 + 1)
    // Script{Arg} starts at index 101 (100 + 1)

    for (let i = 0; i < 24; i++) {
      const qty = parseInt(row[1199 + i] || '0');
      if (!qty || qty === 0) continue;

      const instruction = row[51 + i] || '';
      const targetId = parseInt(row[101 + i] || '0');

      if (!instruction || !targetId) continue;

      const objectiveType = this.detectObjectiveType(instruction, targetId);
      let targetName = '';
      let details: any = {};

      // Resolve details based on type
      if (objectiveType === 'fish') {
        const fishDetails = this.resolveFishDetails(targetId);
        if (fishDetails) {
          targetName = fishDetails.fishName;
          details.fish = fishDetails;
        } else {
          targetName = this.itemNames.get(targetId) || `Fish ${targetId}`;
        }
      } else if (objectiveType === 'item') {
        targetName = this.itemNames.get(targetId) || `Item ${targetId}`;
        details.item = {
          itemId: targetId,
          itemName: targetName,
        };
      } else if (objectiveType === 'enemy') {
        targetName = this.enemyNames.get(targetId) || `Enemy ${targetId}`;
        details.enemy = {
          enemyId: targetId,
          enemyName: targetName,
        };
      } else if (objectiveType === 'npc') {
        targetName = this.npcNames.get(targetId) || `NPC ${targetId}`;
        details.npc = {
          npcId: targetId,
          npcName: targetName,
        };
      } else if (objectiveType === 'interact') {
        targetName = this.eobjNames.get(targetId) || `Object ${targetId}`;
      } else {
        targetName = `Target ${targetId}`;
      }

      objectives.push({
        index: objectives.length + 1,
        type: objectiveType,
        instruction,
        quantity: qty,
        targetId,
        targetName,
        details: Object.keys(details).length > 0 ? details : undefined,
      });
    }

    return objectives;
  }

  private detectObjectiveType(instruction: string, targetId: number): ObjectiveType {
    if (!instruction) return 'unknown';

    // Check if it's a required item
    if (instruction.startsWith('RITEM')) {
      // Check if this item is a fish
      if (this.fishDb) {
        try {
          const result = this.fishDb
            .prepare('SELECT COUNT(*) as count FROM fish WHERE id = ?')
            .get(targetId) as any;
          if (result && result.count > 0) {
            return 'fish';
          }
        } catch (error) {
          // Fish DB not available
        }
      }
      return 'item';
    }

    if (instruction.startsWith('ENEMY')) return 'enemy';
    if (instruction.startsWith('ACTOR') && !instruction.includes('SEQ')) return 'npc';
    if (instruction.startsWith('LOC_')) return 'location';
    if (instruction.startsWith('GIMMICK') || instruction.startsWith('EOBJ')) return 'interact';

    return 'unknown';
  }

  private resolveFishDetails(fishId: number): FishObjectiveDetails | null {
    if (!this.fishData || !this.fishDb) return null;

    try {
      // Get fish from database
      const fishRow = this.fishDb.prepare('SELECT * FROM fish WHERE id = ?').get(fishId) as any;
      if (!fishRow) return null;

      // Get fish metadata from fish-data.json
      const fishInfo = this.fishData.FISH?.[fishId];
      if (!fishInfo) return null;

      // Get location info
      const spot = this.fishData.FISHING_SPOTS?.[fishInfo.location];
      const zone = spot ? this.fishData.ZONES?.[spot.territory_id] : null;
      const locationName =
        zone && spot ? `${zone.name_en} - ${spot.name_en}` : spot?.name_en || 'Unknown Location';

      // Get weather names
      const weatherSet = JSON.parse(fishRow.weather_set || '[]');
      const weather = weatherSet.map(
        (w: number) => this.fishData.WEATHER_TYPES?.[w]?.name_en || `Weather ${w}`
      );

      const prevWeatherSet = JSON.parse(fishRow.previous_weather_set || '[]');
      const previousWeather =
        prevWeatherSet.length > 0
          ? prevWeatherSet.map(
              (w: number) => this.fishData.WEATHER_TYPES?.[w]?.name_en || `Weather ${w}`
            )
          : undefined;

      // Get bait chain names
      const baitPath = JSON.parse(fishRow.best_catch_path || '[]');
      const baitChain = baitPath.map(
        (b: number) => this.fishData.ITEMS?.[b]?.name_en || this.itemNames.get(b) || `Bait ${b}`
      );

      // Format time window
      const timeWindow = `${String(fishRow.start_hour).padStart(2, '0')}:00 - ${String(fishRow.end_hour).padStart(2, '0')}:00 ET`;

      return {
        fishId,
        fishName: this.itemNames.get(fishId) || `Fish ${fishId}`,
        locationName,
        timeWindow,
        weather,
        previousWeather,
        baitChain,
        hookset: fishRow.hookset || 'Unknown',
        tug: fishRow.tug || 'unknown',
        bigFish: fishRow.big_fish === 1,
        folklore: fishRow.folklore === 1,
        fishEyes: fishRow.fish_eyes === 1,
        snagging: fishRow.snagging === 1 ? true : fishRow.snagging === 0 ? false : null,
      };
    } catch (error) {
      console.error(`Error resolving fish ${fishId}:`, error);
      return null;
    }
  }

  close(): void {
    if (this.fishDb) {
      this.fishDb.close();
    }
  }
}

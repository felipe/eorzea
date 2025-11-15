/**
 * Tests for ObjectiveParser
 */

import { ObjectiveParser } from '../../scripts/parse-objectives';
import { join } from 'path';

const CSV_DIR = join(process.cwd(), 'data', 'ffxiv-datamining', 'csv');
const FISH_DATA_PATH = join(process.cwd(), 'data', 'fish-data.json');
const FISH_DB_PATH = join(process.cwd(), 'data', 'fish.db');

describe('ObjectiveParser', () => {
  let parser: ObjectiveParser;

  beforeAll(async () => {
    parser = new ObjectiveParser(CSV_DIR, FISH_DATA_PATH, FISH_DB_PATH);
    await parser.initialize();
  });

  afterAll(() => {
    parser.close();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(parser).toBeDefined();
    });
  });

  describe('parseObjectives', () => {
    it('should parse objectives for quest with fish', () => {
      // Feast of Famine (ID: 65782) has fish objectives
      const objectives = parser.parseObjectives(65782);

      expect(Array.isArray(objectives)).toBe(true);
      expect(objectives.length).toBeGreaterThan(0);
    });

    it('should return empty array for quest with no objectives', () => {
      const objectives = parser.parseObjectives(999999999);
      expect(objectives).toEqual([]);
    });

    it('should detect fish objectives correctly', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      expect(fishObjective).toBeDefined();
      if (fishObjective) {
        expect(fishObjective.type).toBe('fish');
        expect(fishObjective.targetName).toBeTruthy();
        expect(fishObjective.quantity).toBeGreaterThan(0);
      }
    });

    it('should detect NPC objectives correctly', () => {
      const objectives = parser.parseObjectives(65782);
      const npcObjective = objectives.find((obj) => obj.type === 'npc');

      expect(npcObjective).toBeDefined();
      if (npcObjective) {
        expect(npcObjective.type).toBe('npc');
        expect(npcObjective.targetName).toBeTruthy();
      }
    });

    it('should have sequential index numbers', () => {
      const objectives = parser.parseObjectives(65782);

      objectives.forEach((obj, idx) => {
        expect(obj.index).toBe(idx + 1);
      });
    });

    it('should include fish details for fish objectives', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        expect(fish).toHaveProperty('fishId');
        expect(fish).toHaveProperty('fishName');
        expect(fish).toHaveProperty('locationName');
        expect(fish).toHaveProperty('timeWindow');
        expect(fish).toHaveProperty('weather');
        expect(fish).toHaveProperty('baitChain');
        expect(fish).toHaveProperty('hookset');
        expect(fish).toHaveProperty('tug');

        expect(typeof fish.fishId).toBe('number');
        expect(typeof fish.fishName).toBe('string');
        expect(typeof fish.locationName).toBe('string');
        expect(typeof fish.timeWindow).toBe('string');
        expect(Array.isArray(fish.weather)).toBe(true);
        expect(Array.isArray(fish.baitChain)).toBe(true);
        expect(typeof fish.hookset).toBe('string');
        expect(typeof fish.tug).toBe('string');
      }
    });

    it('should resolve weather names not IDs', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        if (fish.weather.length > 0) {
          fish.weather.forEach((w) => {
            // Weather should be named, not "Weather X"
            expect(w).not.toMatch(/^Weather \d+$/);
            expect(typeof w).toBe('string');
            expect(w.length).toBeGreaterThan(0);
          });
        }

        if (fish.previousWeather && fish.previousWeather.length > 0) {
          fish.previousWeather.forEach((w) => {
            expect(w).not.toMatch(/^Weather \d+$/);
            expect(typeof w).toBe('string');
            expect(w.length).toBeGreaterThan(0);
          });
        }
      }
    });

    it('should resolve location names properly', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        // Location should not be "Unknown Location"
        expect(fish.locationName).not.toBe('Unknown Location');
        expect(fish.locationName.length).toBeGreaterThan(0);
      }
    });

    it('should resolve bait chain with item names', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        if (fish.baitChain.length > 0) {
          fish.baitChain.forEach((bait) => {
            expect(typeof bait).toBe('string');
            expect(bait.length).toBeGreaterThan(0);
            // Bait should not be "Bait X"
            expect(bait).not.toMatch(/^Bait \d+$/);
          });
        }
      }
    });

    it('should format time windows correctly', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        // Time window should be in format "HH:00 - HH:00 ET"
        expect(fish.timeWindow).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2} ET$/);
      }
    });

    it('should have valid hookset values', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        if (fish.hookset && fish.hookset !== 'Unknown') {
          expect(['Precision', 'Powerful']).toContain(fish.hookset);
        }
      }
    });

    it('should have valid tug values', () => {
      const objectives = parser.parseObjectives(65782);
      const fishObjective = objectives.find((obj) => obj.type === 'fish');

      if (fishObjective && fishObjective.details?.fish) {
        const fish = fishObjective.details.fish;

        if (fish.tug && fish.tug !== 'unknown') {
          expect(['light', 'medium', 'heavy']).toContain(fish.tug);
        }
      }
    });

    it('should include NPC details for NPC objectives', () => {
      const objectives = parser.parseObjectives(65782);
      const npcObjective = objectives.find((obj) => obj.type === 'npc');

      if (npcObjective && npcObjective.details?.npc) {
        const npc = npcObjective.details.npc;

        expect(npc).toHaveProperty('npcId');
        expect(npc).toHaveProperty('npcName');
        expect(typeof npc.npcId).toBe('number');
        expect(typeof npc.npcName).toBe('string');
        expect(npc.npcId).toBeGreaterThan(0);
        expect(npc.npcName.length).toBeGreaterThan(0);
      }
    });
  });

  describe('objective types', () => {
    it('should correctly identify objective types', () => {
      const objectives = parser.parseObjectives(65782);

      objectives.forEach((obj) => {
        expect(['fish', 'item', 'enemy', 'npc', 'location', 'interact', 'unknown']).toContain(
          obj.type
        );
      });
    });

    it('should have valid target IDs', () => {
      const objectives = parser.parseObjectives(65782);

      objectives.forEach((obj) => {
        expect(typeof obj.targetId).toBe('number');
        expect(obj.targetId).toBeGreaterThan(0);
      });
    });

    it('should have valid quantities', () => {
      const objectives = parser.parseObjectives(65782);

      objectives.forEach((obj) => {
        expect(typeof obj.quantity).toBe('number');
        expect(obj.quantity).toBeGreaterThan(0);
      });
    });

    it('should have valid instruction strings', () => {
      const objectives = parser.parseObjectives(65782);

      objectives.forEach((obj) => {
        expect(typeof obj.instruction).toBe('string');
        expect(obj.instruction.length).toBeGreaterThan(0);
      });
    });
  });
});

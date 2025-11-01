/**
 * Tests for QuestTracker Service
 */

import { QuestTrackerService } from '../../src/services/questTracker';
import { join } from 'path';

// Use the actual database for testing
const DB_PATH = join(process.cwd(), 'data', 'game.db');

describe('QuestTrackerService', () => {
  let service: QuestTrackerService;

  beforeAll(() => {
    service = new QuestTrackerService(DB_PATH);
  });

  afterAll(() => {
    service.close();
  });

  describe('getTotalCount', () => {
    it('should return total quest count', () => {
      const count = service.getTotalCount();
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });
  });

  describe('getQuestById', () => {
    it('should return quest for valid ID', () => {
      // Test with Feast of Famine quest
      const quest = service.getQuestById(65782);

      expect(quest).not.toBeNull();
      if (quest) {
        expect(quest.id).toBe(65782);
        expect(quest.name).toBe('Feast of Famine');
        expect(quest.level).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return null for invalid ID', () => {
      const quest = service.getQuestById(999999999);
      expect(quest).toBeNull();
    });

    it('should parse objectives correctly', () => {
      const quest = service.getQuestById(65782);

      if (quest && quest.objectives) {
        expect(Array.isArray(quest.objectives)).toBe(true);
        expect(quest.objectives.length).toBeGreaterThan(0);

        // Check objective structure
        quest.objectives.forEach((obj) => {
          expect(obj).toHaveProperty('index');
          expect(obj).toHaveProperty('type');
          expect(obj).toHaveProperty('targetName');
          expect(obj).toHaveProperty('quantity');
          expect(typeof obj.index).toBe('number');
          expect(typeof obj.type).toBe('string');
          expect(typeof obj.targetName).toBe('string');
          expect(typeof obj.quantity).toBe('number');
        });
      }
    });

    it('should parse fish objectives with full details', () => {
      const quest = service.getQuestById(65782);

      if (quest && quest.objectives) {
        const fishObjective = quest.objectives.find((obj) => obj.type === 'fish');

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
          expect(Array.isArray(fish.weather)).toBe(true);
          expect(Array.isArray(fish.baitChain)).toBe(true);
        }
      }
    });

    it('should parse previous quests correctly', () => {
      const quest = service.getQuestById(65782);

      if (quest) {
        expect(Array.isArray(quest.previousQuests)).toBe(true);
      }
    });
  });

  describe('searchByName', () => {
    it('should find quests by partial name match', () => {
      const results = service.searchByName('Feast', 10);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((quest) => {
        expect(quest.name.toLowerCase()).toContain('feast');
      });
    });

    it('should be case-insensitive', () => {
      const lowerResults = service.searchByName('feast', 10);
      const upperResults = service.searchByName('FEAST', 10);
      expect(lowerResults.length).toBe(upperResults.length);
    });

    it('should respect limit parameter', () => {
      const results = service.searchByName('the', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no matches', () => {
      const results = service.searchByName('xyzabc123notaquest', 10);
      expect(results).toEqual([]);
    });
  });

  describe('getQuestsByLevelRange', () => {
    it('should return quests within level range', () => {
      const results = service.getQuestsByLevelRange(48, 52);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((quest) => {
        const displayLevel = quest.level + (quest.levelOffset || 0);
        expect(displayLevel).toBeGreaterThanOrEqual(48);
        expect(displayLevel).toBeLessThanOrEqual(52);
      });
    });

    it('should handle single level range', () => {
      const results = service.getQuestsByLevelRange(50, 50);
      expect(Array.isArray(results)).toBe(true);
      results.forEach((quest) => {
        const displayLevel = quest.level + (quest.levelOffset || 0);
        expect(displayLevel).toBe(50);
      });
    });

    it('should return empty array for invalid range', () => {
      const results = service.getQuestsByLevelRange(1000, 2000);
      expect(results).toEqual([]);
    });
  });

  describe('searchQuests', () => {
    it('should return quests for specific expansion', () => {
      const results = service.searchQuests({ expansionId: 0, limit: 10 }); // ARR expansion

      if (results.length > 0) {
        results.forEach((quest) => {
          expect(quest.expansionId).toBe(0);
        });
      }
    });

    it('should filter by journal genre', () => {
      const results = service.searchQuests({ journalGenreId: 110, limit: 10 });

      if (results.length > 0) {
        results.forEach((quest) => {
          expect(quest.journalGenreId).toBe(110);
        });
      }
    });

    it('should filter repeatable quests', () => {
      const results = service.searchQuests({ isRepeatable: true, limit: 10 });

      if (results.length > 0) {
        results.forEach((quest) => {
          expect(quest.isRepeatable).toBe(true);
        });
      }
    });
  });

  describe('data integrity', () => {
    it('should have valid quest IDs', () => {
      const quest = service.getQuestById(65782);
      expect(quest).not.toBeNull();
      if (quest) {
        expect(quest.id).toBeGreaterThan(0);
        expect(typeof quest.id).toBe('number');
      }
    });

    it('should have valid level values', () => {
      const results = service.getQuestsByLevelRange(1, 100);
      results.forEach((quest) => {
        expect(quest.level).toBeGreaterThanOrEqual(0);
        expect(quest.level).toBeLessThanOrEqual(100);
      });
    });

    it('should have valid boolean fields', () => {
      const quest = service.getQuestById(65782);
      if (quest) {
        if (quest.isRepeatable !== undefined) {
          expect(typeof quest.isRepeatable).toBe('boolean');
        }
        if (quest.canCancel !== undefined) {
          expect(typeof quest.canCancel).toBe('boolean');
        }
      }
    });

    it('should have weather names not IDs in fish objectives', () => {
      const quest = service.getQuestById(65782);

      if (quest && quest.objectives) {
        const fishObjective = quest.objectives.find((obj) => obj.type === 'fish');

        if (fishObjective && fishObjective.details?.fish) {
          const fish = fishObjective.details.fish;
          if (fish.weather.length > 0) {
            // Weather should be named, not "Weather X"
            fish.weather.forEach((w) => {
              expect(w).not.toMatch(/^Weather \d+$/);
            });
          }
        }
      }
    });

    it('should have location names not "Unknown Location" in fish objectives', () => {
      const quest = service.getQuestById(65782);

      if (quest && quest.objectives) {
        const fishObjective = quest.objectives.find((obj) => obj.type === 'fish');

        if (fishObjective && fishObjective.details?.fish) {
          const fish = fishObjective.details.fish;
          // Location should be named properly
          expect(fish.locationName).not.toBe('Unknown Location');
          expect(fish.locationName.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('quest relationships', () => {
    it('should store previous quests as array', () => {
      const quest = service.getQuestById(65782);
      if (quest) {
        expect(Array.isArray(quest.previousQuests)).toBe(true);
      }
    });

    it('should have valid previous quest IDs', () => {
      // Find a quest with prerequisites
      const results = service.searchByName('', 100);
      const questWithPrereqs = results.find((q) => q.previousQuests && q.previousQuests.length > 0);

      if (questWithPrereqs && questWithPrereqs.previousQuests) {
        questWithPrereqs.previousQuests.forEach((prereqId) => {
          expect(typeof prereqId).toBe('number');
          expect(prereqId).toBeGreaterThan(0);
        });
      }
    });
  });
});

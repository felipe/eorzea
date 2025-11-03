import { IntelligentSyncService } from '../../src/services/intelligentSync';
import { join } from 'path';

describe('IntelligentSyncService', () => {
  let service: IntelligentSyncService;
  const testDbPath = join(process.cwd(), 'data', 'game.db');

  beforeEach(() => {
    service = new IntelligentSyncService(testDbPath);
  });

  afterEach(() => {
    service.close();
  });

  describe('analyzeAchievements', () => {
    it('should analyze Shadowbringers achievement', () => {
      const result = service.analyzeAchievements([2298]);

      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0].achievementId).toBe(2298);
      expect(result.achievements[0].achievementName).toBe('Shadowbringers');
      expect(result.inferredQuests.length).toBeGreaterThan(0);
      expect(result.summary.highConfidence).toBeGreaterThan(0);
    });

    it('should analyze multiple achievements', () => {
      const result = service.analyzeAchievements([2298, 2958, 3496]);

      expect(result.achievements).toHaveLength(3);
      expect(result.inferredQuests.length).toBeGreaterThan(500);
      expect(result.summary.totalAchievements).toBe(3);
      expect(result.summary.totalQuestsInferred).toBeGreaterThan(500);
    });

    it('should return empty results for invalid achievement', () => {
      const result = service.analyzeAchievements([999999]);

      expect(result.achievements).toHaveLength(0);
      expect(result.inferredQuests).toHaveLength(0);
      expect(result.summary.totalQuestsInferred).toBe(0);
    });

    it('should have high confidence for MSQ achievements', () => {
      const result = service.analyzeAchievements([2298]);

      const allHighConfidence = result.inferredQuests.every((q) => q.confidence >= 90);
      expect(allHighConfidence).toBe(true);
    });

    it('should infer Shadowbringers final quest', () => {
      const result = service.analyzeAchievements([2298]);

      const shadowbringersQuest = result.inferredQuests.find(
        (q) => q.questName === 'Shadowbringers'
      );
      expect(shadowbringersQuest).toBeDefined();
      expect(shadowbringersQuest?.confidence).toBe(95);
      expect(shadowbringersQuest?.source).toBe('sync_inferred');
      expect(shadowbringersQuest?.inferredFrom).toBe(2298);
    });

    it('should include reason for each inference', () => {
      const result = service.analyzeAchievements([2298]);

      result.inferredQuests.forEach((quest) => {
        expect(quest.reason).toBeDefined();
        expect(quest.reason).toContain('Shadowbringers');
      });
    });
  });

  describe('getExpansionQuestChain', () => {
    it('should get Shadowbringers quest chain', () => {
      const quests = service.getExpansionQuestChain(3);

      expect(quests.length).toBeGreaterThan(0);
      quests.forEach((quest) => {
        expect(quest.id).toBeDefined();
        expect(quest.name).toBeDefined();
      });
    });

    it('should return empty array for invalid expansion', () => {
      const quests = service.getExpansionQuestChain(999);

      expect(quests).toHaveLength(0);
    });

    it('should return quests in order', () => {
      const quests = service.getExpansionQuestChain(3);

      for (let i = 1; i < quests.length; i++) {
        expect(quests[i].id).toBeGreaterThanOrEqual(quests[i - 1].id);
      }
    });
  });

  describe('confidence scoring', () => {
    it('should have consistent confidence scores', () => {
      const result = service.analyzeAchievements([2298]);

      result.inferredQuests.forEach((quest) => {
        expect(quest.confidence).toBeGreaterThanOrEqual(0);
        expect(quest.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should categorize confidence correctly', () => {
      const result = service.analyzeAchievements([2298]);

      const highConfidence = result.inferredQuests.filter((q) => q.confidence >= 90).length;
      const mediumConfidence = result.inferredQuests.filter(
        (q) => q.confidence >= 70 && q.confidence < 90
      ).length;
      const lowConfidence = result.inferredQuests.filter((q) => q.confidence < 70).length;

      expect(result.summary.highConfidence).toBe(highConfidence);
      expect(result.summary.mediumConfidence).toBe(mediumConfidence);
      expect(result.summary.lowConfidence).toBe(lowConfidence);
    });
  });

  describe('performance', () => {
    it('should analyze achievements quickly', () => {
      const start = Date.now();
      service.analyzeAchievements([2298, 2958, 3496]);
      const duration = Date.now() - start;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle empty array', () => {
      const result = service.analyzeAchievements([]);

      expect(result.achievements).toHaveLength(0);
      expect(result.inferredQuests).toHaveLength(0);
    });
  });
});

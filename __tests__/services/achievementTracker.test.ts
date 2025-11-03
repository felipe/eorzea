import { AchievementTrackerService } from '../../src/services/achievementTracker';
import { join } from 'path';

describe('AchievementTrackerService', () => {
  let service: AchievementTrackerService;
  const testDbPath = join(process.cwd(), 'data', 'game.db');

  beforeEach(() => {
    service = new AchievementTrackerService(testDbPath);
  });

  afterEach(() => {
    service.close();
  });

  describe('getAchievementById', () => {
    it('should get Shadowbringers achievement', () => {
      const achievement = service.getAchievementById(2298);

      expect(achievement).toBeDefined();
      expect(achievement?.id).toBe(2298);
      expect(achievement?.name).toBe('Shadowbringers');
    });

    it('should return null for invalid ID', () => {
      const achievement = service.getAchievementById(999999);

      expect(achievement).toBeNull();
    });

    it('should include all achievement properties', () => {
      const achievement = service.getAchievementById(2298);

      expect(achievement).toHaveProperty('id');
      expect(achievement).toHaveProperty('categoryId');
      expect(achievement).toHaveProperty('name');
      expect(achievement).toHaveProperty('description');
      expect(achievement).toHaveProperty('points');
      expect(achievement).toHaveProperty('icon');
      expect(achievement).toHaveProperty('achievementType');
    });
  });

  describe('searchAchievements', () => {
    it('should search achievements by query', () => {
      const achievements = service.searchAchievements({ query: 'Shadowbringers' });

      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((achievement) => {
        expect(
          achievement.name.includes('Shadowbringers') ||
            achievement.description.includes('Shadowbringers')
        ).toBe(true);
      });
    });

    it('should filter by category', () => {
      const achievements = service.searchAchievements({ categoryId: 76, limit: 10 });

      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((achievement) => {
        expect(achievement.categoryId).toBe(76);
      });
    });

    it('should filter achievements that reward titles', () => {
      const achievements = service.searchAchievements({ rewardsTitles: true, limit: 10 });

      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((achievement) => {
        expect(achievement.titleRewardId).toBeDefined();
        expect(achievement.titleRewardId).toBeGreaterThan(0);
      });
    });

    it('should respect limit parameter', () => {
      const achievements = service.searchAchievements({ limit: 5 });

      expect(achievements.length).toBeLessThanOrEqual(5);
    });

    it('should handle offset parameter', () => {
      const firstBatch = service.searchAchievements({ limit: 5, offset: 0 });
      const secondBatch = service.searchAchievements({ limit: 5, offset: 5 });

      expect(firstBatch[0].id).not.toBe(secondBatch[0].id);
    });
  });

  describe('getAchievementsByTitleReward', () => {
    it('should find achievements for Shadowbringer title', () => {
      const achievements = service.getAchievementsByTitleReward(431);

      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((achievement) => {
        expect(achievement.titleRewardId).toBe(431);
      });
    });

    it('should return empty array for title with no achievements', () => {
      const achievements = service.getAchievementsByTitleReward(999999);

      expect(achievements).toHaveLength(0);
    });
  });

  describe('getAchievementsByCategory', () => {
    it('should get achievements by category', () => {
      const achievements = service.getAchievementsByCategory(76);

      expect(achievements.length).toBeGreaterThan(0);
      achievements.forEach((achievement) => {
        expect(achievement.categoryId).toBe(76);
      });
    });

    it('should return empty array for invalid category', () => {
      const achievements = service.getAchievementsByCategory(999999);

      expect(achievements).toHaveLength(0);
    });
  });

  describe('getTitleRewardingAchievements', () => {
    it('should get all title-rewarding achievements', () => {
      const achievements = service.getTitleRewardingAchievements();

      expect(achievements.length).toBeGreaterThan(500);
      achievements.forEach((achievement) => {
        expect(achievement.titleRewardId).toBeDefined();
        expect(achievement.titleRewardId).toBeGreaterThan(0);
      });
    });

    it('should be sorted by ID', () => {
      const achievements = service.getTitleRewardingAchievements();

      for (let i = 1; i < achievements.length; i++) {
        expect(achievements[i].id).toBeGreaterThan(achievements[i - 1].id);
      }
    });
  });

  describe('getTotalCount', () => {
    it('should return correct total count', () => {
      const count = service.getTotalCount();

      expect(count).toBeGreaterThan(3000);
      expect(count).toBeLessThan(5000);
    });
  });

  describe('getTitleRewardCount', () => {
    it('should return correct title reward count', () => {
      const count = service.getTitleRewardCount();

      expect(count).toBeGreaterThan(500);
      expect(count).toBeLessThan(1000);
    });

    it('should match getTitleRewardingAchievements length', () => {
      const count = service.getTitleRewardCount();
      const achievements = service.getTitleRewardingAchievements();

      expect(count).toBe(achievements.length);
    });
  });

  describe('getAchievementWithTitle', () => {
    it('should get achievement with title name', () => {
      const result = service.getAchievementWithTitle(2298);

      expect(result).toBeDefined();
      expect(result.id).toBe(2298);
      expect(result.titleName).toBe('Shadowbringer');
    });

    it('should return null for invalid ID', () => {
      const result = service.getAchievementWithTitle(999999);

      expect(result).toBeNull();
    });

    it('should handle achievements without title rewards', () => {
      // Find an achievement without a title reward
      const achievements = service.searchAchievements({ limit: 100 });
      const noTitleAchievement = achievements.find((a) => !a.titleRewardId);

      if (noTitleAchievement) {
        const result = service.getAchievementWithTitle(noTitleAchievement.id);
        expect(result.titleName).toBeNull();
      }
    });
  });
});

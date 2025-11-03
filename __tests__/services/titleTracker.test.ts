import { TitleTrackerService } from '../../src/services/titleTracker';
import { join } from 'path';

describe('TitleTrackerService', () => {
  let service: TitleTrackerService;
  const testDbPath = join(process.cwd(), 'data', 'game.db');

  beforeEach(() => {
    service = new TitleTrackerService(testDbPath);
  });

  afterEach(() => {
    service.close();
  });

  describe('getTitleById', () => {
    it('should get Shadowbringer title', () => {
      const title = service.getTitleById(431);

      expect(title).toBeDefined();
      expect(title?.id).toBe(431);
      expect(title?.nameMasculine).toBe('Shadowbringer');
    });

    it('should return null for invalid ID', () => {
      const title = service.getTitleById(999999);

      expect(title).toBeNull();
    });

    it('should include all title properties', () => {
      const title = service.getTitleById(431);

      expect(title).toHaveProperty('id');
      expect(title).toHaveProperty('nameMasculine');
      expect(title).toHaveProperty('nameFeminine');
      expect(title).toHaveProperty('isPrefix');
      expect(title).toHaveProperty('sortOrder');
    });
  });

  describe('getTitleByName', () => {
    it('should find title by masculine name', () => {
      const title = service.getTitleByName('Shadowbringer');

      expect(title).toBeDefined();
      expect(title?.id).toBe(431);
    });

    it('should return null for non-existent title', () => {
      const title = service.getTitleByName('Nonexistent Title');

      expect(title).toBeNull();
    });
  });

  describe('searchTitles', () => {
    it('should search titles by query', () => {
      const titles = service.searchTitles({ query: 'Warrior' });

      expect(titles.length).toBeGreaterThan(0);
      titles.forEach((title) => {
        expect(
          title.nameMasculine.includes('Warrior') || title.nameFeminine.includes('Warrior')
        ).toBe(true);
      });
    });

    it('should filter by prefix', () => {
      const titles = service.searchTitles({ isPrefix: true, limit: 10 });

      expect(titles.length).toBeGreaterThan(0);
      titles.forEach((title) => {
        expect(title.isPrefix).toBe(true);
      });
    });

    it('should filter by suffix', () => {
      const titles = service.searchTitles({ isPrefix: false, limit: 10 });

      expect(titles.length).toBeGreaterThan(0);
      titles.forEach((title) => {
        expect(title.isPrefix).toBe(false);
      });
    });

    it('should respect limit parameter', () => {
      const titles = service.searchTitles({ limit: 5 });

      expect(titles.length).toBeLessThanOrEqual(5);
    });

    it('should handle offset parameter', () => {
      const firstBatch = service.searchTitles({ limit: 5, offset: 0 });
      const secondBatch = service.searchTitles({ limit: 5, offset: 5 });

      expect(firstBatch[0].id).not.toBe(secondBatch[0].id);
    });
  });

  describe('getAllTitles', () => {
    it('should return all titles', () => {
      const titles = service.getAllTitles();

      expect(titles.length).toBeGreaterThan(500);
      expect(titles[0]).toHaveProperty('id');
    });

    it('should be sorted by sort order', () => {
      const titles = service.getAllTitles();

      for (let i = 1; i < titles.length; i++) {
        expect(titles[i].sortOrder).toBeGreaterThanOrEqual(titles[i - 1].sortOrder);
      }
    });
  });

  describe('getTotalCount', () => {
    it('should return correct total count', () => {
      const count = service.getTotalCount();

      expect(count).toBeGreaterThan(500);
      expect(count).toBeLessThan(1000);
    });

    it('should match getAllTitles length', () => {
      const count = service.getTotalCount();
      const allTitles = service.getAllTitles();

      expect(count).toBe(allTitles.length);
    });
  });

  describe('getTitlesByType', () => {
    it('should get prefix titles', () => {
      const prefixTitles = service.getTitlesByType(true);

      expect(prefixTitles.length).toBeGreaterThan(0);
      prefixTitles.forEach((title) => {
        expect(title.isPrefix).toBe(true);
      });
    });

    it('should get suffix titles', () => {
      const suffixTitles = service.getTitlesByType(false);

      expect(suffixTitles.length).toBeGreaterThan(0);
      suffixTitles.forEach((title) => {
        expect(title.isPrefix).toBe(false);
      });
    });

    it('should have both prefix and suffix titles', () => {
      const prefixCount = service.getTitlesByType(true).length;
      const suffixCount = service.getTitlesByType(false).length;
      const totalCount = service.getTotalCount();

      expect(prefixCount + suffixCount).toBe(totalCount);
    });
  });
});

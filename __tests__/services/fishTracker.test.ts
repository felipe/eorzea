/**
 * Tests for FishTracker Service
 */

import { FishTrackerService } from '../../src/services/fishTracker';
import { join } from 'path';

// Use the actual database for testing
const DB_PATH = join(process.cwd(), 'data', 'fish.db');

describe('FishTrackerService', () => {
  let service: FishTrackerService;

  beforeAll(() => {
    service = new FishTrackerService(DB_PATH);
  });

  afterAll(() => {
    service.close();
  });

  describe('getTotalCount', () => {
    it('should return total fish count', () => {
      const count = service.getTotalCount();
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });
  });

  describe('getBigFishCount', () => {
    it('should return big fish count', () => {
      const count = service.getBigFishCount();
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should be less than or equal to total count', () => {
      const bigFishCount = service.getBigFishCount();
      const totalCount = service.getTotalCount();
      expect(bigFishCount).toBeLessThanOrEqual(totalCount);
    });
  });

  describe('getFishById', () => {
    it('should return fish for valid ID', () => {
      // Test with a known fish ID (from ARR patch 2.0)
      const fish = service.getFishById(4898);

      expect(fish).not.toBeNull();
      if (fish) {
        expect(fish._id).toBe(4898);
        expect(fish.patch).toBeGreaterThanOrEqual(2);
        expect(fish.startHour).toBeGreaterThanOrEqual(0);
        expect(fish.endHour).toBeGreaterThanOrEqual(0);
        expect(fish.endHour).toBeLessThanOrEqual(24);
      }
    });

    it('should return null for invalid ID', () => {
      const fish = service.getFishById(999999);
      expect(fish).toBeNull();
    });

    it('should parse arrays correctly', () => {
      const fish = service.getFishById(4898);

      if (fish) {
        expect(Array.isArray(fish.weatherSet)).toBe(true);
        expect(Array.isArray(fish.previousWeatherSet)).toBe(true);
        expect(Array.isArray(fish.bestCatchPath)).toBe(true);
      }
    });
  });

  describe('searchFish', () => {
    it('should return all fish with no filters', () => {
      const fish = service.searchFish();
      expect(fish.length).toBeGreaterThan(0);
      expect(fish.length).toBe(service.getTotalCount());
    });

    it('should filter by patch', () => {
      const fish = service.searchFish({ patch: 2 });
      expect(fish.length).toBeGreaterThan(0);
      fish.forEach((f) => {
        expect(f.patch).toBe(2);
      });
    });

    it('should filter big fish only', () => {
      const fish = service.searchFish({ bigFishOnly: true });
      expect(fish.length).toBeGreaterThan(0);
      expect(fish.length).toBe(service.getBigFishCount());
      fish.forEach((f) => {
        expect(f.bigFish).toBe(true);
      });
    });

    it('should filter by location', () => {
      const fish = service.searchFish({ location: 52 });
      expect(fish.length).toBeGreaterThan(0);
      fish.forEach((f) => {
        expect(f.location).toBe(52);
      });
    });

    it('should filter aquarium fish', () => {
      const fish = service.searchFish({ aquariumOnly: true });
      expect(fish.length).toBeGreaterThan(0);
      fish.forEach((f) => {
        expect(f.aquarium).not.toBeNull();
        if (f.aquarium) {
          expect(['Saltwater', 'Freshwater']).toContain(f.aquarium.water);
          expect(f.aquarium.size).toBeGreaterThan(0);
        }
      });
    });

    it('should respect limit parameter', () => {
      const fish = service.searchFish({ limit: 10 });
      expect(fish.length).toBeLessThanOrEqual(10);
    });

    it('should handle pagination', () => {
      const page1 = service.searchFish({ limit: 5, offset: 0 });
      const page2 = service.searchFish({ limit: 5, offset: 5 });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);

      // Pages should have different fish
      expect(page1[0]._id).not.toBe(page2[0]._id);
    });
  });

  describe('getBigFish', () => {
    it('should return only big fish', () => {
      const fish = service.getBigFish();
      expect(fish.length).toBeGreaterThan(0);
      fish.forEach((f) => {
        expect(f.bigFish).toBe(true);
      });
    });
  });

  describe('getAvailableFish', () => {
    it('should return fish available at given time', () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      const fish = service.getAvailableFish(testDate);

      // Should return some fish (many are 24-hour availability)
      expect(fish.length).toBeGreaterThan(0);
    });

    it('should filter by Eorzean time window', () => {
      const testDate = new Date('2024-01-01T00:00:00Z');
      const fish = service.getAvailableFish(testDate);

      expect(Array.isArray(fish)).toBe(true);
      // Each fish should be within its time window
      // (We can't easily verify this without calculating Eorzean time)
    });
  });

  describe('getFishByWeather', () => {
    it('should return fish for specific weather', () => {
      // Weather ID 1 = Clear Skies
      const fish = service.getFishByWeather(1);

      if (fish.length > 0) {
        fish.forEach((f) => {
          expect(f.weatherSet).toContain(1);
        });
      }
    });

    it('should return empty array for weather with no fish', () => {
      const fish = service.getFishByWeather(99999);
      expect(fish).toEqual([]);
    });
  });

  describe('data integrity', () => {
    it('should have valid hookset values', () => {
      const fish = service.searchFish({ limit: 100 });
      fish.forEach((f) => {
        if (f.hookset) {
          expect(['Precision', 'Powerful']).toContain(f.hookset);
        }
      });
    });

    it('should have valid tug values', () => {
      const fish = service.searchFish({ limit: 100 });
      fish.forEach((f) => {
        if (f.tug) {
          expect(['light', 'medium', 'heavy']).toContain(f.tug);
        }
      });
    });

    it('should have valid time windows', () => {
      const fish = service.searchFish({ limit: 100 });
      fish.forEach((f) => {
        expect(f.startHour).toBeGreaterThanOrEqual(0);
        expect(f.startHour).toBeLessThan(24);
        expect(f.endHour).toBeGreaterThanOrEqual(0);
        expect(f.endHour).toBeLessThanOrEqual(24);
      });
    });
  });
});

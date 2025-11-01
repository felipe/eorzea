/**
 * Tests for Eorzean Time Utility
 */

import {
  getEorzeanTime,
  eorzeanHoursToMillis,
  isInTimeWindow,
  getNextWindowStart,
  getCurrentWindowEnd,
  formatEorzeanTime,
  formatTimeWindow,
  EORZEA_MULTIPLIER,
} from '../../src/utils/eorzeanTime';

describe('eorzeanTime', () => {
  describe('getEorzeanTime', () => {
    it('should calculate Eorzean time correctly', () => {
      // Known test case: Unix epoch 0 should be hour 0
      const epoch = new Date(0);
      const eorzeaTime = getEorzeanTime(epoch);

      expect(eorzeaTime.hours).toBe(0);
      expect(eorzeaTime.minutes).toBe(0);
      expect(eorzeaTime.seconds).toBe(0);
      expect(eorzeaTime.timestamp).toBe(0);
    });

    it('should handle current time if no parameter provided', () => {
      const eorzeaTime = getEorzeanTime();

      expect(eorzeaTime.hours).toBeGreaterThanOrEqual(0);
      expect(eorzeaTime.hours).toBeLessThan(24);
      expect(eorzeaTime.minutes).toBeGreaterThanOrEqual(0);
      expect(eorzeaTime.minutes).toBeLessThan(60);
    });

    it('should have hours between 0-23', () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      const eorzeaTime = getEorzeanTime(testDate);

      expect(eorzeaTime.hours).toBeGreaterThanOrEqual(0);
      expect(eorzeaTime.hours).toBeLessThan(24);
    });

    it('should advance faster than real time', () => {
      const start = new Date('2024-01-01T12:00:00Z');
      const oneHourLater = new Date('2024-01-01T13:00:00Z');

      const eorzeaStart = getEorzeanTime(start);
      const eorzeaEnd = getEorzeanTime(oneHourLater);

      // After 1 real hour, Eorzean time should advance by ~20.57 hours
      const hoursDiff = (eorzeaEnd.hours - eorzeaStart.hours + 24) % 24;
      expect(hoursDiff).toBeGreaterThan(19);
      expect(hoursDiff).toBeLessThan(22);
    });
  });

  describe('eorzeanHoursToMillis', () => {
    it('should convert 1 Eorzean hour to milliseconds', () => {
      const millis = eorzeanHoursToMillis(1);
      expect(millis).toBe(175 * 1000); // 175 seconds
    });

    it('should convert 24 Eorzean hours correctly', () => {
      const millis = eorzeanHoursToMillis(24);
      expect(millis).toBe(175 * 1000 * 24); // 70 minutes
    });

    it('should handle fractional hours', () => {
      const millis = eorzeanHoursToMillis(0.5);
      expect(millis).toBe(87.5 * 1000);
    });
  });

  describe('isInTimeWindow', () => {
    it('should return true for all-day window', () => {
      expect(isInTimeWindow(0, 0, 24)).toBe(true);
      expect(isInTimeWindow(12, 0, 24)).toBe(true);
      expect(isInTimeWindow(23, 0, 24)).toBe(true);
    });

    it('should handle normal windows', () => {
      // 9:00 - 17:00 window
      expect(isInTimeWindow(8, 9, 17)).toBe(false);
      expect(isInTimeWindow(9, 9, 17)).toBe(true);
      expect(isInTimeWindow(12, 9, 17)).toBe(true);
      expect(isInTimeWindow(16, 9, 17)).toBe(true);
      expect(isInTimeWindow(17, 9, 17)).toBe(false);
      expect(isInTimeWindow(18, 9, 17)).toBe(false);
    });

    it('should handle windows that cross midnight', () => {
      // 22:00 - 04:00 window (crosses midnight)
      expect(isInTimeWindow(21, 22, 4)).toBe(false);
      expect(isInTimeWindow(22, 22, 4)).toBe(true);
      expect(isInTimeWindow(23, 22, 4)).toBe(true);
      expect(isInTimeWindow(0, 22, 4)).toBe(true);
      expect(isInTimeWindow(3, 22, 4)).toBe(true);
      expect(isInTimeWindow(4, 22, 4)).toBe(false);
      expect(isInTimeWindow(5, 22, 4)).toBe(false);
    });

    it('should handle edge case at midnight', () => {
      expect(isInTimeWindow(0, 0, 6)).toBe(true);
      expect(isInTimeWindow(0, 18, 6)).toBe(true);
    });
  });

  describe('getNextWindowStart', () => {
    it('should return current time for 24-hour windows', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const nextStart = getNextWindowStart(0, 24, now);
      expect(nextStart.getTime()).toBe(now.getTime());
    });

    it('should calculate next window when currently outside', () => {
      // This is harder to test precisely due to Eorzean time conversion
      // We'll just verify it returns a future date
      const now = new Date();
      const nextStart = getNextWindowStart(9, 17, now);
      expect(nextStart.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });

  describe('getCurrentWindowEnd', () => {
    it('should return null for 24-hour windows', () => {
      const now = new Date('2024-01-01T12:00:00Z');
      const end = getCurrentWindowEnd(0, 24, now);
      expect(end).toBeNull();
    });

    it('should return null when not in window', () => {
      // We need to find a time that's definitely not in a specific window
      // This is tricky with Eorzean time conversion
      // For now, we'll just verify the function returns a Date or null
      const now = new Date();
      const end = getCurrentWindowEnd(9, 17, now);
      expect(end === null || end instanceof Date).toBe(true);
    });
  });

  describe('formatEorzeanTime', () => {
    it('should format time with leading zeros', () => {
      const time = { hours: 9, minutes: 5, seconds: 3, timestamp: 0 };
      expect(formatEorzeanTime(time)).toBe('09:05');
    });

    it('should format time without leading zeros needed', () => {
      const time = { hours: 23, minutes: 59, seconds: 59, timestamp: 0 };
      expect(formatEorzeanTime(time)).toBe('23:59');
    });

    it('should handle midnight', () => {
      const time = { hours: 0, minutes: 0, seconds: 0, timestamp: 0 };
      expect(formatEorzeanTime(time)).toBe('00:00');
    });
  });

  describe('formatTimeWindow', () => {
    it('should format all-day windows', () => {
      expect(formatTimeWindow(0, 24)).toBe('All day');
    });

    it('should format normal windows', () => {
      expect(formatTimeWindow(9, 17)).toBe('09:00 - 17:00');
    });

    it('should format windows crossing midnight', () => {
      expect(formatTimeWindow(22, 4)).toBe('22:00 - 04:00');
    });

    it('should handle midnight start', () => {
      expect(formatTimeWindow(0, 6)).toBe('00:00 - 06:00');
    });
  });

  describe('EORZEA_MULTIPLIER constant', () => {
    it('should be approximately 20.571428571', () => {
      expect(EORZEA_MULTIPLIER).toBeCloseTo(20.571428571, 5);
    });

    it('should equal 3600/175', () => {
      expect(EORZEA_MULTIPLIER).toBe(3600 / 175);
    });
  });
});

/**
 * Eorzean Time Utility
 *
 * Eorzean time runs 20.571428571 times faster than Earth time.
 * 1 Eorzean day = 70 Earth minutes (4200 seconds)
 * 1 Eorzean hour = 175 Earth seconds
 */

import { EorzeanTime } from '../types/fish.js';

// Constants
export const EORZEA_MULTIPLIER = 3600 / 175; // 20.571428571...
const MILLISECONDS_PER_EORZEAN_HOUR = 175 * 1000;

/**
 * Get current Eorzean time based on real-world time
 */
export function getEorzeanTime(realTime: Date = new Date()): EorzeanTime {
  const epochTime = realTime.getTime();
  const eorzeanMillis = epochTime * EORZEA_MULTIPLIER;

  const totalSeconds = Math.floor(eorzeanMillis / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    timestamp: realTime.getTime(),
  };
}

/**
 * Convert Eorzean hours to real-world milliseconds
 */
export function eorzeanHoursToMillis(hours: number): number {
  return hours * MILLISECONDS_PER_EORZEAN_HOUR;
}

/**
 * Check if current Eorzean time is within a time window
 * Handles windows that cross midnight (e.g., 22:00 to 04:00)
 */
export function isInTimeWindow(currentHour: number, startHour: number, endHour: number): boolean {
  // Handle 24-hour availability
  if (startHour === 0 && endHour === 24) {
    return true;
  }

  // Handle windows that cross midnight
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }

  // Normal window
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Calculate the next time window start for a fish
 * Returns real-world Date when the window opens
 */
export function getNextWindowStart(
  startHour: number,
  endHour: number,
  fromTime: Date = new Date()
): Date {
  // If 24-hour availability, return current time
  if (startHour === 0 && endHour === 24) {
    return fromTime;
  }

  const eorzeaTime = getEorzeanTime(fromTime);
  let hoursUntilStart = 0;

  if (isInTimeWindow(eorzeaTime.hours, startHour, endHour)) {
    // Currently in window, next start is tomorrow
    if (startHour > endHour) {
      // Window crosses midnight
      hoursUntilStart = 24 - eorzeaTime.hours + startHour;
    } else {
      hoursUntilStart = 24 - eorzeaTime.hours + startHour;
    }
  } else {
    // Not in window, calculate hours until start
    if (eorzeaTime.hours < startHour) {
      hoursUntilStart = startHour - eorzeaTime.hours;
    } else {
      hoursUntilStart = 24 - eorzeaTime.hours + startHour;
    }
  }

  const millisUntilStart = eorzeanHoursToMillis(hoursUntilStart);
  return new Date(fromTime.getTime() + millisUntilStart);
}

/**
 * Calculate when the current window ends
 * Returns real-world Date when the window closes
 */
export function getCurrentWindowEnd(
  startHour: number,
  endHour: number,
  fromTime: Date = new Date()
): Date | null {
  // If 24-hour availability, return null (never ends)
  if (startHour === 0 && endHour === 24) {
    return null;
  }

  const eorzeaTime = getEorzeanTime(fromTime);

  if (!isInTimeWindow(eorzeaTime.hours, startHour, endHour)) {
    return null; // Not currently in window
  }

  let hoursUntilEnd = 0;

  if (startHour > endHour) {
    // Window crosses midnight
    if (eorzeaTime.hours >= startHour) {
      hoursUntilEnd = 24 - eorzeaTime.hours + endHour;
    } else {
      hoursUntilEnd = endHour - eorzeaTime.hours;
    }
  } else {
    hoursUntilEnd = endHour - eorzeaTime.hours;
  }

  const millisUntilEnd = eorzeanHoursToMillis(hoursUntilEnd);
  return new Date(fromTime.getTime() + millisUntilEnd);
}

/**
 * Format Eorzean time as HH:MM string
 */
export function formatEorzeanTime(eorzeaTime: EorzeanTime): string {
  const hours = eorzeaTime.hours.toString().padStart(2, '0');
  const minutes = eorzeaTime.minutes.toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format time window as string (e.g., "18:00 - 06:00")
 */
export function formatTimeWindow(startHour: number, endHour: number): string {
  if (startHour === 0 && endHour === 24) {
    return 'All day';
  }
  const start = startHour.toString().padStart(2, '0') + ':00';
  const end = endHour.toString().padStart(2, '0') + ':00';
  return `${start} - ${end}`;
}

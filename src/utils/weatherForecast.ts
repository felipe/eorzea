/**
 * FFXIV Weather Forecasting
 *
 * Based on community reverse-engineered weather algorithm.
 * Weather in FFXIV is deterministic and can be calculated from Unix timestamp.
 *
 * Weather changes every 8 Eorzean hours (23 minutes 20 seconds real time).
 * Weather periods: 0:00-8:00, 8:00-16:00, 16:00-24:00 ET
 */

export interface WeatherRate {
  weatherId: number;
  rate: number; // Cumulative probability (0-100)
}

export interface WeatherForecast {
  weatherId: number;
  startTime: Date;
  endTime: Date;
  previousWeatherId?: number;
}

// 8 Eorzean hours = 175 * 8 = 1400 seconds real time
const WEATHER_PERIOD_SECONDS = 1400;

/**
 * Calculate weather for a given timestamp and zone
 */
export function calculateWeather(timestamp: Date, weatherRates: WeatherRate[]): number {
  const unixTime = Math.floor(timestamp.getTime() / 1000);

  // Calculate Eorzean time bell
  const bell = unixTime / 175;

  // Get the 8-hour increment (0, 8, or 16)
  const increment = (Math.floor(bell / 8) % 3) * 8;

  // Calculate total Eorzean days since epoch
  const totalDays = Math.floor(unixTime / 4200);

  // Calculate weather seed
  const calcBase = totalDays * 100 + increment;
  const step1 = ((calcBase << 11) ^ calcBase) >>> 0;
  const step2 = ((step1 >>> 8) ^ step1) >>> 0;

  // Get weather chance (0-99)
  const chance = step2 % 100;

  // Find matching weather from rates (cumulative probability)
  for (const rate of weatherRates) {
    if (chance < rate.rate) {
      return rate.weatherId;
    }
  }

  // Fallback to last weather if no match (shouldn't happen with proper data)
  return weatherRates[weatherRates.length - 1]?.weatherId || 1;
}

/**
 * Get the start of the current weather period
 */
export function getWeatherPeriodStart(timestamp: Date): Date {
  const unixTime = Math.floor(timestamp.getTime() / 1000);
  const periodsSinceEpoch = Math.floor(unixTime / WEATHER_PERIOD_SECONDS);
  const periodStartUnix = periodsSinceEpoch * WEATHER_PERIOD_SECONDS;
  return new Date(periodStartUnix * 1000);
}

/**
 * Get the start of the next weather period
 */
export function getNextWeatherPeriodStart(timestamp: Date): Date {
  const currentPeriodStart = getWeatherPeriodStart(timestamp);
  return new Date(currentPeriodStart.getTime() + WEATHER_PERIOD_SECONDS * 1000);
}

/**
 * Get the start of the previous weather period
 */
export function getPreviousWeatherPeriodStart(timestamp: Date): Date {
  const currentPeriodStart = getWeatherPeriodStart(timestamp);
  return new Date(currentPeriodStart.getTime() - WEATHER_PERIOD_SECONDS * 1000);
}

/**
 * Generate weather forecast for next N periods
 */
export function forecastWeather(
  startTime: Date,
  weatherRates: WeatherRate[],
  periods: number = 10
): WeatherForecast[] {
  const forecasts: WeatherForecast[] = [];
  let currentPeriodStart = getWeatherPeriodStart(startTime);

  for (let i = 0; i < periods; i++) {
    const periodEnd = new Date(currentPeriodStart.getTime() + WEATHER_PERIOD_SECONDS * 1000);
    const weatherId = calculateWeather(currentPeriodStart, weatherRates);

    // Get previous weather if not first period
    let previousWeatherId: number | undefined;
    if (i > 0) {
      previousWeatherId = forecasts[i - 1].weatherId;
    } else if (currentPeriodStart.getTime() > startTime.getTime()) {
      // Calculate actual previous weather
      const prevPeriodStart = getPreviousWeatherPeriodStart(currentPeriodStart);
      previousWeatherId = calculateWeather(prevPeriodStart, weatherRates);
    }

    forecasts.push({
      weatherId,
      startTime: currentPeriodStart,
      endTime: periodEnd,
      previousWeatherId,
    });

    currentPeriodStart = periodEnd;
  }

  return forecasts;
}

/**
 * Find next weather window matching conditions
 */
export function findNextWeatherWindow(
  startTime: Date,
  weatherRates: WeatherRate[],
  requiredWeather: number[],
  requiredPreviousWeather?: number[],
  maxPeriodsToCheck: number = 100
): WeatherForecast | null {
  const forecasts = forecastWeather(startTime, weatherRates, maxPeriodsToCheck);

  for (const forecast of forecasts) {
    // Check if current weather matches
    const weatherMatches =
      requiredWeather.length === 0 || requiredWeather.includes(forecast.weatherId);

    // Check if previous weather matches (if required)
    let previousWeatherMatches = true;
    if (requiredPreviousWeather && requiredPreviousWeather.length > 0) {
      if (forecast.previousWeatherId === undefined) {
        previousWeatherMatches = false;
      } else {
        previousWeatherMatches = requiredPreviousWeather.includes(forecast.previousWeatherId);
      }
    }

    if (weatherMatches && previousWeatherMatches) {
      return forecast;
    }
  }

  return null;
}

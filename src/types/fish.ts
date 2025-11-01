/**
 * Fish and fishing-related type definitions
 * Data structure based on Carbuncle Plushy Fish Tracker
 * Source: https://github.com/icykoneko/ff14-fish-tracker-app (MIT License)
 */

export interface Fish {
  _id: number;
  name?: string; // Added when enriched with name data
  previousWeatherSet: number[];
  weatherSet: number[];
  startHour: number;
  endHour: number;
  location: number | null;
  bestCatchPath: number[];
  predators: number[] | Record<string, never>;
  intuitionLength: number | null;
  patch: number;
  folklore: boolean | null;
  collectable: boolean | null;
  fishEyes: boolean;
  bigFish: boolean;
  snagging: boolean | null;
  lure: number | null;
  hookset: 'Precision' | 'Powerful' | null;
  tug: 'light' | 'medium' | 'heavy' | null;
  gig: string | null;
  aquarium: AquariumInfo | null;
  dataMissing: boolean | null;
}

export interface AquariumInfo {
  water: 'Saltwater' | 'Freshwater';
  size: number;
}

export interface FishingSpot {
  _id: number;
  name?: string;
  zoneid: number;
  territory?: number;
  x?: number;
  y?: number;
  radius?: number;
  category?: number;
}

export interface Bait {
  _id: number;
  name?: string;
  icon?: number;
}

export interface WeatherType {
  _id: number;
  name?: string;
  icon?: number;
}

export interface WeatherRate {
  _id: number;
  rates: Array<{
    weather: number;
    rate: number;
  }>;
}

export interface Zone {
  _id: number;
  name?: string;
  regionId?: number;
  weatherRate?: number;
}

export interface Region {
  _id: number;
  name?: string;
}

/**
 * Eorzean time representation
 */
export interface EorzeanTime {
  hours: number;
  minutes: number;
  seconds: number;
  timestamp: number; // Real-world timestamp this represents
}

/**
 * Fish availability window
 */
export interface FishWindow {
  fish: Fish;
  isAvailableNow: boolean;
  nextWindowStart?: Date;
  nextWindowEnd?: Date;
  currentWeather?: string;
  requiredWeather?: string[];
}

/**
 * Raw data structure from Carbuncle Plushy
 */
export interface CarbunclePlushyData {
  FISH: Record<string, Fish>;
  FISHING_SPOTS: Record<string, FishingSpot>;
  ITEMS: Record<string, Bait>;
  WEATHER_TYPES: Record<string, WeatherType>;
  WEATHER_RATES: Record<string, WeatherRate>;
  ZONES: Record<string, Zone>;
  REGIONS: Record<string, Region>;
}

/**
 * Fish search/filter options
 */
export interface FishSearchOptions {
  name?: string;
  bigFishOnly?: boolean;
  patch?: number;
  location?: number;
  availableNow?: boolean;
  weatherId?: number;
  requiresFolklore?: boolean;
  aquariumOnly?: boolean;
  limit?: number;
  offset?: number;
}

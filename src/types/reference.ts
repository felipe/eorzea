/**
 * Reference data type definitions
 * Common reference tables used across the application
 */

export interface ClassJob {
  id: number;
  name: string;
  abbreviation?: string;
  class_job_category?: number;
  starting_level: number;
  modifier_hp?: number;
  modifier_mp?: number;
  modifier_str?: number;
  modifier_vit?: number;
  modifier_dex?: number;
  modifier_int?: number;
  modifier_mnd?: number;
  role?: number; // 1=Tank, 2=Melee DPS, 3=Ranged DPS, 4=Healer
  is_limited_job: boolean;
  can_queue_for_duty: boolean;
  item_starting_weapon?: number;
  item_soul_crystal?: number;
  primary_stat?: string;
  unlock_quest_id?: number;
  job_index?: number;
}

export type JobRole = 'Tank' | 'Healer' | 'Melee DPS' | 'Physical Ranged DPS' | 'Magical Ranged DPS' | 'Crafter' | 'Gatherer';

export interface PlaceName {
  id: number;
  name: string;
  name_plural?: string;
  name_no_article?: string;
}

export interface TerritoryType {
  id: number;
  name?: string;
  place_name_id?: number;
  region_place_name_id?: number;
  zone_place_name_id?: number;
  map_id?: number;
  territory_intended_use?: number; // 0=Overworld, 1=City, 2=Dungeon, etc.
  is_pvp: boolean;
  mount_allowed: boolean;
  is_indoor: boolean;
  weather_rate?: number;
  bg_path?: string;
}

export type TerritoryUse =
  | 'Overworld'
  | 'City'
  | 'Dungeon'
  | 'Trial'
  | 'Raid'
  | 'Housing'
  | 'Instanced'
  | 'PvP'
  | 'Gold Saucer'
  | 'Deep Dungeon';

export interface MapData {
  id: number;
  place_name_id?: number;
  place_name_region_id?: number;
  place_name_sub_id?: number;
  territory_type_id?: number;
  size_factor?: number;
  offset_x?: number;
  offset_y?: number;
  map_marker_range?: number;
  discovery_array_byte?: number;
  discovery_index?: number;
  hierarchy?: number;
  priority_ui?: number;
  priority_category_ui?: number;
  is_event: boolean;
}

/**
 * Coordinate conversion helpers
 */
export interface MapCoordinates {
  x: number;
  y: number;
  z?: number;
}

export interface DisplayCoordinates {
  x: number;
  y: number;
  formatted: string; // e.g., "X: 12.3, Y: 34.5"
}

/**
 * Location information combining multiple reference tables
 */
export interface Location {
  territory_id?: number;
  territory_name?: string;
  place_name?: string;
  region_name?: string;
  zone_name?: string;
  map_id?: number;
  coordinates?: MapCoordinates;
  display_coordinates?: DisplayCoordinates;
}

/**
 * Weather information
 */
export interface Weather {
  id: number;
  name: string;
  icon?: number;
  description?: string;
}

export interface WeatherRate {
  id: number;
  territory_id: number;
  weather_rates: Array<{
    weather_id: number;
    rate: number; // 0-100
  }>;
}

/**
 * Patch information
 */
export interface Patch {
  version: string; // e.g., "6.0", "6.1", "7.0"
  name: string; // e.g., "Endwalker", "Newfound Adventure"
  release_date: string; // ISO date
  major: number;
  minor: number;
  is_expansion: boolean;
}

/**
 * Expansion information
 */
export type ExpansionName =
  | 'A Realm Reborn'
  | 'Heavensward'
  | 'Stormblood'
  | 'Shadowbringers'
  | 'Endwalker'
  | 'Dawntrail';

export interface Expansion {
  id: number;
  name: ExpansionName;
  abbreviation: string; // ARR, HW, SB, ShB, EW, DT
  major_version: number; // 2, 3, 4, 5, 6, 7
  release_date: string;
  max_level: number;
  icon?: number;
}

/**
 * Currency information
 */
export type CurrencyType =
  | 'Gil'
  | 'Company Seal'
  | 'Tomestone'
  | 'MGP' // Manderville Gold Saucer Points
  | 'Wolf Mark'
  | 'Allied Seal'
  | 'Centurio Seal'
  | 'Sack of Nuts'
  | 'Bicolor Gemstone'
  | 'Scrip'; // Crafter/Gatherer Scrip

export interface Currency {
  type: CurrencyType;
  amount: number;
  icon?: number;
}

/**
 * Item level and equipment information
 */
export interface ItemLevel {
  id: number;
  value: number; // Actual item level
  strength?: number;
  vitality?: number;
  dexterity?: number;
  intelligence?: number;
  mind?: number;
  defense?: number;
  magic_defense?: number;
}

/**
 * Quest types and categories
 */
export type QuestType =
  | 'Main Scenario'
  | 'Side Story'
  | 'Job'
  | 'Feature'
  | 'Tribal'
  | 'Grand Company'
  | 'Chronicles'
  | 'Manderville'
  | 'Hildibrand'
  | 'Delivery'
  | 'Leve'
  | 'Seasonal Event';

/**
 * Duty types
 */
export type DutyType =
  | 'Dungeon'
  | 'Trial'
  | 'Raid'
  | 'Alliance Raid'
  | 'Guildhest'
  | 'PvP'
  | 'Deep Dungeon'
  | 'Variant Dungeon'
  | 'Criterion';

/**
 * Rarity/quality tiers
 */
export type RarityTier =
  | 'Common' // 1
  | 'Uncommon' // 2
  | 'Rare' // 3
  | 'Relic' // 4
  | 'Aetherial'; // 7

export const RarityColors: Record<RarityTier, string> = {
  Common: '#ffffff',
  Uncommon: '#ffffff',
  Rare: '#5ba7db',
  Relic: '#af9369',
  Aetherial: '#ff5aac',
};

/**
 * Time and availability
 */
export interface TimeWindow {
  start_hour: number; // 0-23 (Eorzean time)
  end_hour: number;
  start_minute?: number;
  end_minute?: number;
}

export interface AvailabilityInfo {
  is_available: boolean;
  time_requirements?: TimeWindow;
  weather_requirements?: number[];
  level_requirements?: number;
  job_requirements?: number[];
  quest_requirements?: number[];
  next_available?: Date; // Real-world time
  availability_description: string;
}

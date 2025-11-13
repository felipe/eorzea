/**
 * Gathering type definitions
 * Represents FFXIV gathering (Mining, Botany, Fishing) with nodes, items, and locations
 */

export type GatheringTypeName = 'Mining' | 'Quarrying' | 'Logging' | 'Harvesting' | 'Spearfishing';

export interface GatheringType {
  id: number;
  name: GatheringTypeName;
}

export interface GatheringPointBase {
  id: number;
  gathering_type_id: number;
  gathering_level: number;
  is_limited: boolean; // Timed/ephemeral nodes
}

export interface GatheringPoint {
  id: number;
  gathering_point_base_id: number;
  place_name_id?: number;
  territory_type_id?: number;
  map_id?: number;
  pos_x?: number;
  pos_y?: number;
  radius?: number;
  gathering_sub_category_id?: number;
}

export interface GatheringItem {
  id: number;
  item_id: number;
  gathering_item_level_id?: number;
  is_hidden: boolean; // Hidden items require certain stats/abilities
}

export interface GatheringItemPoint {
  id: number;
  gathering_point_id: number;
  gathering_item_id: number;
}

/**
 * Complete gathering point with all related data
 */
export interface GatheringPointComplete extends GatheringPoint {
  gathering_type_id?: number;
  gathering_type_name?: string;
  gathering_level?: number;
  is_limited?: boolean;
  place_name?: string;
  territory_name?: string;
  items?: GatheringItemWithDetails[];
  // Time/weather requirements (for timed nodes)
  start_hour?: number;
  end_hour?: number;
  weather_requirements?: number[];
}

/**
 * Gathering item with full details
 */
export interface GatheringItemWithDetails extends GatheringItem {
  item_name?: string;
  item_icon?: number;
  item_level?: number;
  gathering_points?: GatheringPointComplete[];
}

/**
 * Gathered item tracking (player progress)
 */
export interface GatheredItem {
  id: number;
  character_id: number;
  item_id: number;
  gathering_point_id?: number;
  gathered_at: string; // ISO timestamp
  is_hq: boolean;
  notes?: string;
}

/**
 * Gathering search options
 */
export interface GatheringSearchOptions {
  gathering_type?: GatheringTypeName | number;
  item_name?: string;
  level_min?: number;
  level_max?: number;
  territory?: string;
  place_name?: string;
  is_limited?: boolean;
  is_hidden?: boolean;
  available_now?: boolean; // Filter by current time/weather
  limit?: number;
  offset?: number;
}

/**
 * Gathering search result
 */
export interface GatheringSearchResult {
  points: GatheringPointComplete[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Gathering statistics (for progress tracking)
 */
export interface GatheringStats {
  character_id: number;
  gathering_type: GatheringTypeName;
  total_items: number;
  unique_items_gathered: number;
  unique_nodes_visited: number;
  hq_items_gathered: number;
  total_gathering_level?: number;
  progress_percentage: number;
}

/**
 * Time window for timed nodes
 */
export interface GatheringTimeWindow {
  start_hour: number; // Eorzean time (0-23)
  end_hour: number;
  duration_minutes: number; // Real-world minutes
  next_spawn?: Date; // Real-world time of next spawn
}

/**
 * Gathering node availability (similar to fish)
 */
export interface GatheringAvailability {
  is_available: boolean;
  gathering_point: GatheringPointComplete;
  current_time: {
    eorzean_hour: number;
    eorzean_minute: number;
  };
  time_window?: GatheringTimeWindow;
  next_available?: Date;
  weather_ok: boolean;
  weather_requirements?: string[];
}

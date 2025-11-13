/**
 * Item type definitions
 * Represents FFXIV items with all their properties, sources, and uses
 */

export interface Item {
  id: number;
  name: string;
  description?: string;
  icon?: number;
  level_item?: number;
  level_equip?: number;
  rarity?: number; // 1=Common, 2=Uncommon, 3=Rare, 4=Relic, 7=Aetherial
  item_ui_category_id?: number;
  item_search_category_id?: number;
  stack_size?: number;
  is_unique?: boolean;
  is_untradable?: boolean;
  is_dyeable?: boolean;
  is_collectible?: boolean;
  can_be_hq?: boolean;
  price_mid?: number;
  price_low?: number;
  desynth_skill?: number;
  is_crest_worthy?: boolean;
  materialize_type?: number;
  item_action_id?: number;
  cast_time_s?: number;
  cooldown_s?: number;
  class_job_category?: number;
  grand_company?: number;
  item_series_id?: number;
  base_param_modifier?: number;
  model_main?: string;
  model_sub?: string;
  class_job_repair?: number;
  item_repair_id?: number;
  item_glamour_id?: number;
  item_special_bonus?: number;
  is_pvp?: boolean;
  lot_size?: number;
  item_sub_category?: number;
  item_sort_category?: number;
  additional_data?: string; // JSON string
}

export interface ItemUICategory {
  id: number;
  name: string;
  icon?: number;
  order_minor?: number;
  order_major?: number;
}

export interface ItemSearchCategory {
  id: number;
  name: string;
  category?: number;
  order_major?: number;
  order_minor?: number;
  class_job?: number;
}

export type ItemSourceType =
  | 'quest'
  | 'crafting'
  | 'gathering'
  | 'monster'
  | 'shop'
  | 'achievement'
  | 'treasure'
  | 'dungeon'
  | 'trial'
  | 'raid'
  | 'fishing'
  | 'event'
  | 'vendor';

export interface ItemSource {
  id: number;
  item_id: number;
  source_type: ItemSourceType;
  source_id?: number;
  source_name?: string;
  source_details?: string; // JSON string with additional info
}

export interface ItemSourceDetails {
  location?: string;
  coordinates?: { x: number; y: number };
  drop_rate?: number;
  cost?: number;
  currency?: string;
  requirements?: string[];
  level?: number;
  patch?: string;
}

export type ItemUseType =
  | 'recipe_ingredient'
  | 'quest_required'
  | 'leve_required'
  | 'gc_supply'
  | 'desynth'
  | 'aetherial_reduction';

export interface ItemUse {
  id: number;
  item_id: number;
  use_type: ItemUseType;
  use_id?: number;
  use_name?: string;
  quantity_required?: number;
  use_details?: string; // JSON string
}

export interface ItemUseDetails {
  craft_job?: string;
  recipe_level?: number;
  quest_type?: string;
  quest_level?: number;
  required_job?: string;
  [key: string]: any;
}

/**
 * Complete item with all related data
 */
export interface ItemComplete extends Item {
  ui_category_name?: string;
  search_category_name?: string;
  sources?: ItemSource[];
  uses?: ItemUse[];
  recipes?: number[]; // Recipe IDs that produce this item
  ingredients_in?: number[]; // Recipe IDs that use this as ingredient
  quests?: number[]; // Quest IDs that reward or require this item
  gathering_points?: number[]; // Gathering point IDs where this can be gathered
}

/**
 * Item search options
 */
export interface ItemSearchOptions {
  name?: string;
  level_min?: number;
  level_max?: number;
  rarity?: number;
  category?: number;
  search_category?: number;
  can_be_hq?: boolean;
  is_tradable?: boolean;
  is_collectible?: boolean;
  source_type?: ItemSourceType;
  limit?: number;
  offset?: number;
}

/**
 * Item search result with pagination
 */
export interface ItemSearchResult {
  items: ItemComplete[];
  total: number;
  limit: number;
  offset: number;
}

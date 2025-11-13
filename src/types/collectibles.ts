/**
 * Collectibles type definitions
 * Represents FFXIV mounts, minions/companions, and orchestrion rolls
 */

export interface Mount {
  id: number;
  singular: string;
  plural?: string;
  name?: string;
  description?: string;
  enhanced_description?: string;
  tooltip?: string;
  move_speed?: number;
  fly_speed?: number;
  is_flying: boolean;
  icon?: number;
  ui_priority?: number;
  ride_height?: number;
  is_aquatic: boolean;
  is_seats: number; // Number of seats
  extra_seats: number;
  order_major?: number;
  order_minor?: number;
  icon_smart_id?: number;
  is_airborne: boolean;
  is_emote: boolean;
}

export interface Companion {
  id: number;
  singular: string;
  plural?: string;
  name?: string;
  description?: string;
  enhanced_description?: string;
  tooltip?: string;
  behavior_id?: number;
  icon?: number;
  order_major?: number;
  order_minor?: number;
  cost?: number; // Summoning cost
  hp?: number;
  skill_angle?: number;
  skill_cost?: number;
  is_battle: boolean;
  monster_note_target_id?: number;
}

export interface OrchestrionRoll {
  id: number;
  name: string;
  description?: string;
  icon?: number;
  orchestrion_category_id?: number;
  order_major?: number;
  order_minor?: number;
}

export interface OrchestrionCategory {
  id: number;
  name: string;
  order_major?: number;
  order_minor?: number;
}

export type CollectibleType = 'mount' | 'companion' | 'orchestrion';

export type CollectibleSourceType =
  | 'quest'
  | 'achievement'
  | 'shop'
  | 'dungeon'
  | 'trial'
  | 'raid'
  | 'crafting'
  | 'gathering'
  | 'event'
  | 'mogstation'
  | 'pvp'
  | 'treasure_map'
  | 'vendor'
  | 'fate'
  | 'hunt'
  | 'deep_dungeon'
  | 'eureka'
  | 'bozja';

export interface CollectibleSource {
  id: number;
  collectible_type: CollectibleType;
  collectible_id: number;
  source_type: CollectibleSourceType;
  source_id?: number;
  source_name?: string;
  source_details?: string; // JSON string
}

export interface CollectibleSourceDetails {
  location?: string;
  coordinates?: { x: number; y: number; z?: number };
  drop_rate?: number;
  cost?: number;
  currency?: string;
  requirements?: string[];
  level?: number;
  patch?: string;
  notes?: string;
  difficulty?: string;
  party_size?: number;
}

/**
 * Complete mount with source information
 */
export interface MountComplete extends Mount {
  sources?: CollectibleSource[];
  obtained?: boolean; // For character tracking
  obtained_at?: string;
  obtained_from?: string;
}

/**
 * Complete companion/minion with source information
 */
export interface CompanionComplete extends Companion {
  sources?: CollectibleSource[];
  obtained?: boolean;
  obtained_at?: string;
  obtained_from?: string;
}

/**
 * Complete orchestrion roll with source and category
 */
export interface OrchestrionComplete extends OrchestrionRoll {
  category_name?: string;
  sources?: CollectibleSource[];
  obtained?: boolean;
  obtained_at?: string;
  obtained_from?: string;
}

/**
 * Obtained collectibles tracking (player progress)
 */
export interface ObtainedMount {
  id: number;
  character_id: number;
  mount_id: number;
  obtained_at: string; // ISO timestamp
  obtained_from?: string;
  notes?: string;
}

export interface ObtainedCompanion {
  id: number;
  character_id: number;
  companion_id: number;
  obtained_at: string;
  obtained_from?: string;
  notes?: string;
}

export interface ObtainedOrchestrion {
  id: number;
  character_id: number;
  orchestrion_id: number;
  obtained_at: string;
  obtained_from?: string;
  notes?: string;
}

/**
 * Collectible search options
 */
export interface MountSearchOptions {
  name?: string;
  is_flying?: boolean;
  is_aquatic?: boolean;
  multi_seat?: boolean; // Has more than 1 seat
  source_type?: CollectibleSourceType;
  obtained?: boolean; // Filter by obtained status
  limit?: number;
  offset?: number;
}

export interface CompanionSearchOptions {
  name?: string;
  is_battle?: boolean;
  source_type?: CollectibleSourceType;
  obtained?: boolean;
  limit?: number;
  offset?: number;
}

export interface OrchestrionSearchOptions {
  name?: string;
  category_id?: number;
  category_name?: string;
  source_type?: CollectibleSourceType;
  obtained?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Search results
 */
export interface MountSearchResult {
  mounts: MountComplete[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanionSearchResult {
  companions: CompanionComplete[];
  total: number;
  limit: number;
  offset: number;
}

export interface OrchestrionSearchResult {
  orchestrion_rolls: OrchestrionComplete[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Collection statistics (for progress tracking)
 */
export interface CollectionStats {
  character_id: number;
  mounts: {
    total: number;
    obtained: number;
    flying: number;
    multi_seat: number;
    progress_percentage: number;
  };
  companions: {
    total: number;
    obtained: number;
    battle: number;
    progress_percentage: number;
  };
  orchestrion: {
    total: number;
    obtained: number;
    by_category: Record<string, number>;
    progress_percentage: number;
  };
}

/**
 * Collectible guide
 * Complete information on how to obtain a collectible
 */
export interface CollectibleGuide {
  collectible_type: CollectibleType;
  collectible_id: number;
  name: string;
  description?: string;
  icon?: number;
  sources: Array<{
    type: CollectibleSourceType;
    name: string;
    description: string;
    requirements?: string[];
    location?: string;
    difficulty?: string;
    estimated_time?: string;
    drop_rate?: number;
    cost?: {
      amount: number;
      currency: string;
    };
  }>;
  obtained: boolean;
  tips?: string[];
}

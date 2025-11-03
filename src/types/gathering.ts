/**
 * Gathering node and related type definitions
 * For mining, logging, and other gathering activities in FFXIV
 */

/**
 * Type of gathering node
 */
export type GatheringType = 'mining' | 'logging' | 'quarrying' | 'harvesting';

/**
 * Gathering node with location and time information
 */
export interface GatheringNode {
  _id: number;
  name?: string;
  type: GatheringType;
  level: number;
  location: number; // zone/map ID
  x?: number; // map coordinate
  y?: number; // map coordinate
  startHour: number; // Eorzean time (0-23, 24 = always available)
  endHour: number; // Eorzean time
  folklore?: boolean; // requires folklore book
  ephemeral?: boolean; // ephemeral node (collectables)
  legendary?: boolean; // legendary node (rare materials)
  patch: number;
  gatheringPointBaseId?: number; // reference to base gathering data
}

/**
 * Item available at a gathering node
 */
export interface GatheringItem {
  _id: number;
  nodeId: number;
  itemId: number;
  name?: string; // enriched from item data
  slot: number; // position in gathering window (1-8)
  hidden?: boolean; // requires ability to reveal
  requiredGathering?: number; // minimum gathering stat
  requiredPerception?: number; // minimum perception stat
  chance?: number; // base gathering chance percentage
  quantity?: { min: number; max: number }; // yield range
  isCollectable?: boolean;
  reduceId?: number; // aetherial reduction item ID
}

/**
 * Gathering node bonus condition (e.g., +1 gathering attempt)
 */
export interface GatheringBonus {
  nodeId: number;
  condition: string;
  bonus: string;
}

/**
 * Zone/Region information for gathering nodes
 */
export interface GatheringZone {
  _id: number;
  name?: string;
  regionId?: number;
  regionName?: string;
}

/**
 * Search/filter options for gathering nodes
 */
export interface GatheringSearchOptions {
  type?: GatheringType | GatheringType[];
  minLevel?: number;
  maxLevel?: number;
  location?: number;
  availableNow?: boolean;
  ephemeral?: boolean;
  legendary?: boolean;
  folklore?: boolean;
  hasCollectables?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Gathering window availability
 */
export interface GatheringWindow {
  node: GatheringNode;
  isAvailableNow: boolean;
  nextWindowStart?: Date;
  nextWindowEnd?: Date;
  minutesUntilAvailable?: number;
  items?: GatheringItem[];
}

/**
 * Player's gathering progress
 */
export interface GatheringProgress {
  characterId: string;
  nodeId: number;
  itemsGathered: number[]; // array of item IDs gathered from this node
  lastGathered?: Date;
  notes?: string;
}

/**
 * Gathering stats summary
 */
export interface GatheringStats {
  totalNodes: number;
  nodesByType: Record<GatheringType, number>;
  legendaryNodes: number;
  ephemeralNodes: number;
  timedNodes: number;
  alwaysAvailable: number;
}

/**
 * Quest types for offline quest tracking system
 */

export interface Quest {
  id: number;
  name: string;
  internalId?: string;
  level: number;
  levelOffset?: number;
  classJobCategoryId?: number | null;
  classJobRequiredId?: number | null;
  placeNameId?: number | null;
  journalGenreId?: number | null;
  expansionId?: number | null;
  previousQuests: number[];
  gilReward?: number;
  expFactor?: number;
  isRepeatable?: boolean;
  canCancel?: boolean;
  issuerStartId?: number | null;
  issuerLocationId?: number | null;
  targetEndId?: number | null;
  type?: number;
  sortKey?: number;
  objectives?: QuestObjective[]; // Quest objectives
}

export type ObjectiveType = 'fish' | 'item' | 'enemy' | 'npc' | 'location' | 'interact' | 'unknown';

export interface QuestObjective {
  index: number; // Objective number (1, 2, 3...)
  type: ObjectiveType; // Type of objective
  instruction: string; // Raw instruction (RITEM0, ENEMY0, etc.)
  quantity: number; // From ToDoQty
  targetId: number; // From Script{Arg}
  targetName: string; // Resolved name

  // Type-specific details
  details?: {
    fish?: FishObjectiveDetails;
    item?: ItemObjectiveDetails;
    enemy?: EnemyObjectiveDetails;
    npc?: NPCObjectiveDetails;
    location?: LocationObjectiveDetails;
  };
}

export interface FishObjectiveDetails {
  fishId: number;
  fishName: string;
  locationName: string; // "Western La Noscea - Isles of Umbra"
  timeWindow: string; // "20:00 - 04:00 ET"
  weather: string[]; // ["Clear Skies", "Fair Skies"]
  previousWeather?: string[]; // For weather transitions
  baitChain: string[]; // ["Lugworm", "Harbor Herring"]
  hookset: string; // "Powerful Hookset"
  tug: string; // "heavy"
  bigFish: boolean;
  folklore: boolean;
  fishEyes: boolean;
  snagging: boolean | null;
}

export interface ItemObjectiveDetails {
  itemId: number;
  itemName: string;
  icon?: number;
}

export interface EnemyObjectiveDetails {
  enemyId: number;
  enemyName: string;
}

export interface NPCObjectiveDetails {
  npcId: number;
  npcName: string;
}

export interface LocationObjectiveDetails {
  locationId: number;
  locationName: string;
}

export interface QuestSearchOptions {
  name?: string; // Partial name match
  level?: number; // Exact level
  minLevel?: number; // Minimum level
  maxLevel?: number; // Maximum level
  expansionId?: number; // Filter by expansion
  journalGenreId?: number; // Filter by quest type/genre
  placeNameId?: number; // Filter by location
  isRepeatable?: boolean; // Filter repeatable quests
  limit?: number; // Max results
  offset?: number; // Pagination offset
}

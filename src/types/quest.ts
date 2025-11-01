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

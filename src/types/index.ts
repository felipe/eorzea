// Character types
export interface Character {
  id: string;
  name: string;
  server: string;
  level: number;
  job: string;
  location?: Location;
}

// Location types
export interface Location {
  id: string;
  name: string;
  region: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  x: number;
  y: number;
  z?: number;
}

// Quest types
export interface Quest {
  id: string;
  name: string;
  level: number;
  type: QuestType;
  location: Location;
  objectives: QuestObjective[];
  rewards?: QuestReward[];
  description?: string;
}

export enum QuestType {
  MAIN_SCENARIO = 'main_scenario',
  SIDE_QUEST = 'side_quest',
  FEATURE_QUEST = 'feature_quest',
  JOB_QUEST = 'job_quest',
  BEAST_TRIBE = 'beast_tribe',
  RAID = 'raid',
  TRIAL = 'trial',
}

export interface QuestObjective {
  id: string;
  description: string;
  completed: boolean;
  order: number;
}

export interface QuestReward {
  type: 'experience' | 'gil' | 'item';
  amount?: number;
  itemName?: string;
  itemId?: string;
}

// API Response types
export interface XIVAPIResponse<T> {
  data: T;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  pageTotal: number;
  results: number;
  resultsPerPage: number;
  resultsTotal: number;
}

// Configuration types
export interface Config {
  apiKey?: string;
  defaultServer?: string;
  defaultCharacter?: string;
  cacheEnabled: boolean;
  cacheTTL: number;
}

/**
 * Player Profile Types
 *
 * Types for the offline-first player memory system
 */

export interface PlayerCharacter {
  id: string; // Lodestone ID
  name: string;
  server: string;
  dataCenter?: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  isActive: boolean;
  notes?: string;
  // Cached Lodestone data (updated only during sync)
  avatarUrl?: string;
  title?: string;
  freeCompany?: string;
}

export interface JobProgress {
  id: number;
  characterId: string;
  jobName: string;
  level: number;
  updatedAt: Date;
}

export interface CompletedQuest {
  id: number;
  characterId: string;
  questId: number;
  completedAt: Date;
  notes?: string;
}

export interface CaughtFish {
  id: number;
  characterId: string;
  fishId: number;
  caughtAt: Date;
  locationId?: number;
  notes?: string;
}

export interface Bookmark {
  id: number;
  characterId: string;
  type: 'quest' | 'fish' | 'location';
  itemId: number;
  notes?: string;
  priority: number; // 0=normal, 1=high
  createdAt: Date;
}

export interface SessionHistory {
  id: number;
  characterId?: string;
  command: string;
  args?: string; // JSON string
  timestamp: Date;
}

export interface Goal {
  id: number;
  characterId: string;
  title: string;
  description?: string;
  type?: string; // 'quest', 'fish', 'level', 'custom'
  targetValue?: number;
  currentValue: number;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface ProgressStats {
  character: PlayerCharacter;
  totalQuests: number;
  completedQuests: number;
  questCompletionPercentage: number;
  totalFish: number;
  caughtFish: number;
  fishCompletionPercentage: number;
  bigFishCaught: number;
  totalBigFish: number;
  totalTitles: number;
  unlockedTitles: number;
  titleCompletionPercentage: number;
  totalAchievements: number;
  unlockedAchievements: number;
  achievementCompletionPercentage: number;
  recentActivity: Array<{
    type: 'quest' | 'fish' | 'title' | 'achievement';
    id: number;
    name?: string;
    timestamp: Date;
    notes?: string;
  }>;
  topJobs: Array<{
    jobName: string;
    level: number;
  }>;
}

export interface CharacterSyncResult {
  success: boolean;
  characterId: string;
  changes: {
    jobsUpdated: number;
    newJobs: string[];
    levelChanges: Array<{
      jobName: string;
      oldLevel: number;
      newLevel: number;
    }>;
  };
  lastSyncedAt: Date;
}

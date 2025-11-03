/**
 * Title and Achievement Types
 */

export interface Title {
  id: number;
  nameMasculine: string;
  nameFeminine: string;
  isPrefix: boolean;
  sortOrder: number;
}

export interface Achievement {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  points: number;
  titleRewardId?: number;
  itemRewardId?: number;
  icon: number;
  achievementType: number;
}

export interface TitleSearchOptions {
  query?: string;
  isPrefix?: boolean;
  limit?: number;
  offset?: number;
}

export interface AchievementSearchOptions {
  query?: string;
  categoryId?: number;
  rewardsTitles?: boolean;
  limit?: number;
  offset?: number;
}

export interface UnlockedTitle {
  id: number;
  characterId: string;
  titleId: number;
  unlockedAt: Date;
  source: string;
  sourceId?: number;
  notes?: string;
}

export interface UnlockedAchievement {
  id: number;
  characterId: string;
  achievementId: number;
  unlockedAt: Date;
  source: string;
  notes?: string;
}

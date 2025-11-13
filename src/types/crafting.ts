/**
 * Crafting type definitions
 * Represents FFXIV crafting recipes, ingredients, and crafting requirements
 */

export type CraftTypeName =
  | 'Carpenter'
  | 'Blacksmith'
  | 'Armorer'
  | 'Goldsmith'
  | 'Leatherworker'
  | 'Weaver'
  | 'Alchemist'
  | 'Culinarian';

export interface CraftType {
  id: number;
  name: CraftTypeName;
  main_physical?: number;
  sub_physical?: number;
}

export interface RecipeLevelTable {
  id: number;
  class_job_level: number;
  stars: number;
  suggestedCraftsmanship: number;
  suggestedControl: number;
  difficulty: number;
  quality: number;
  durability: number;
  conditionsFlag?: number;
}

export interface Recipe {
  id: number;
  number?: number; // Recipe number shown in-game
  craft_type_id: number;
  recipe_level_table_id: number;
  item_result_id: number;
  amount_result: number;
  material_quality_factor?: number;
  difficulty_factor?: number;
  quality_factor?: number;
  durability_factor?: number;
  required_craftsmanship: number;
  required_control: number;
  quick_synth_craftsmanship?: number;
  quick_synth_control?: number;
  secret_recipe_book_id?: number;
  is_specialist: boolean;
  required_status_id?: number;
  item_required_id?: number;
  is_expert: boolean;
  can_quick_synth: boolean;
  can_hq: boolean;
  exp_reward: number;
  status_required?: string;
  is_secondary_result: boolean;
  patches?: string; // JSON array
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  item_id: number;
  quantity: number;
  position?: number; // Slot position (0-9)
}

/**
 * Complete recipe with all related data
 */
export interface RecipeComplete extends Recipe {
  result_item_name?: string;
  result_item_icon?: number;
  craft_type_name?: CraftTypeName;
  class_job_level?: number;
  stars?: number;
  suggested_craftsmanship?: number;
  suggested_control?: number;
  difficulty?: number;
  quality?: number;
  durability?: number;
  ingredients?: RecipeIngredientWithDetails[];
}

/**
 * Recipe ingredient with item details
 */
export interface RecipeIngredientWithDetails extends RecipeIngredient {
  item_name?: string;
  item_icon?: number;
  item_level?: number;
  can_be_hq?: boolean;
  sources?: Array<{
    type: string;
    name: string;
    details?: string;
  }>;
}

/**
 * Crafted item tracking (player progress)
 */
export interface CraftedItem {
  id: number;
  character_id: number;
  recipe_id: number;
  item_id: number;
  crafted_at: string; // ISO timestamp
  is_hq: boolean;
  is_collectible: boolean;
  collectibility?: number;
  notes?: string;
}

/**
 * Recipe search options
 */
export interface RecipeSearchOptions {
  craft_type?: CraftTypeName | number;
  result_item_name?: string;
  ingredient_item_name?: string;
  ingredient_item_id?: number;
  level_min?: number;
  level_max?: number;
  stars?: number;
  is_specialist?: boolean;
  is_expert?: boolean;
  can_hq?: boolean;
  craftsmanship_min?: number;
  control_min?: number;
  limit?: number;
  offset?: number;
}

/**
 * Recipe search result
 */
export interface RecipeSearchResult {
  recipes: RecipeComplete[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Crafting statistics (for progress tracking)
 */
export interface CraftingStats {
  character_id: number;
  craft_type: CraftTypeName;
  total_recipes: number;
  recipes_crafted: number;
  hq_items_crafted: number;
  collectibles_crafted: number;
  total_exp_earned: number;
  current_level?: number;
  progress_percentage: number;
}

/**
 * Crafting material tree (recursive)
 * Shows all materials needed including intermediate crafts
 */
export interface CraftingMaterialTree {
  item_id: number;
  item_name: string;
  quantity: number;
  can_be_hq: boolean;
  sources: Array<{
    type: 'crafting' | 'gathering' | 'shop' | 'other';
    details: string;
  }>;
  sub_materials?: CraftingMaterialTree[]; // Recursive for crafted ingredients
}

/**
 * Crafting guide for an item
 * Complete breakdown of how to craft something
 */
export interface CraftingGuide {
  recipe: RecipeComplete;
  total_materials: Array<{
    item_id: number;
    item_name: string;
    quantity_needed: number;
    can_be_hq: boolean;
    sources: Array<{
      type: string;
      description: string;
      location?: string;
    }>;
  }>;
  intermediate_crafts: RecipeComplete[];
  estimated_cost: number;
  estimated_time_minutes: number;
  requirements: {
    level: number;
    craftsmanship: number;
    control: number;
    specialist: boolean;
    special_item?: string;
  };
}

/**
 * Quick synth requirements
 */
export interface QuickSynthRequirements {
  can_quick_synth: boolean;
  required_craftsmanship: number;
  required_control: number;
  success_rate?: number;
  hq_chance?: number;
}

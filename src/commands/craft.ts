/**
 * Crafting CLI Commands
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { CraftingService } from '../services/craftingService.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface CraftCommandOptions {
  id?: string;
  guide?: boolean;
  crafted?: boolean;
  type?: string;
  ingredient?: string;
  level?: string;
  limit?: string;
}

export async function craftCommand(
  nameArg: string | undefined,
  options: CraftCommandOptions
): Promise<void> {
  const spinner = ora('Loading crafting data...').start();

  try {
    const service = new CraftingService();
    const profileService = getPlayerProfileService();

    // Handle specific recipe ID lookup
    if (options.id) {
      const recipeId = parseInt(options.id);

      // Handle marking as crafted
      if (options.crafted) {
        spinner.stop();
        await markRecipeCrafted(profileService, service, recipeId);
        service.close();
        return;
      }

      // Show crafting guide
      if (options.guide) {
        spinner.stop();
        await showCraftingGuide(service, recipeId);
        service.close();
        return;
      }

      // Show basic recipe details
      const recipe = service.getRecipeById(recipeId);

      spinner.stop();

      if (!recipe) {
        console.log(chalk.yellow(`Recipe with ID ${recipeId} not found`));
        service.close();
        return;
      }

      // Display detailed recipe information
      console.log(
        chalk.cyan.bold(`\n🔨 Recipe #${recipe.id} - ${recipe.result_item_name || 'Unknown Item'}`)
      );
      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Craft Type', recipe.craft_type_name || 'Unknown'],
        ['Level', recipe.class_job_level?.toString() || 'N/A'],
        ['Result', recipe.result_item_name || 'Unknown'],
        ['Amount', recipe.amount_result?.toString() || '1'],
      ];

      if (recipe.stars) {
        details.push(['Stars', '⭐'.repeat(recipe.stars)]);
      }

      if (recipe.suggested_craftsmanship) {
        details.push(['Craftsmanship', recipe.suggested_craftsmanship.toString()]);
      }

      if (recipe.suggested_control) {
        details.push(['Control', recipe.suggested_control.toString()]);
      }

      if (recipe.difficulty) {
        details.push(['Difficulty', recipe.difficulty.toString()]);
      }

      if (recipe.durability) {
        details.push(['Durability', recipe.durability.toString()]);
      }

      if (recipe.is_specialist) {
        details.push(['Specialist', chalk.yellow('Required')]);
      }

      if (recipe.is_expert) {
        details.push(['Expert Recipe', chalk.magenta('Yes')]);
      }

      if (recipe.can_hq) {
        details.push(['Can HQ', chalk.green('Yes')]);
      }

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        console.log(chalk.bold('\n📦 Ingredients:'));

        const ingredientTable = new Table({
          head: [chalk.cyan('Item'), chalk.cyan('Qty'), chalk.cyan('HQ')],
          style: {
            head: [],
            border: [],
          },
          colWidths: [45, 8, 6],
        });

        recipe.ingredients.forEach((ingredient) => {
          ingredientTable.push([
            `${ingredient.item_name || 'Unknown'} ${chalk.dim(`(#${ingredient.item_id})`)}`,
            ingredient.quantity.toString(),
            ingredient.can_be_hq ? chalk.green('✓') : chalk.gray('✗'),
          ]);
        });

        console.log(ingredientTable.toString());
      }

      console.log(chalk.dim(`\n💡 Tip: Use --guide to see complete crafting guide with material tree\n`));

      service.close();
      return;
    }

    // Search recipes by name
    const searchName = nameArg;
    if (!searchName && !options.type && !options.ingredient && !options.level) {
      spinner.stop();
      console.log(chalk.yellow('Please specify a search query or recipe ID'));
      console.log(chalk.cyan('  eorzea craft search <name>') + '         Search recipes');
      console.log(chalk.cyan('  eorzea craft --id <id>') + '              Get recipe details');
      console.log(chalk.cyan('  eorzea craft --id <id> --guide') + '     Get crafting guide');
      console.log(chalk.cyan('  eorzea craft --id <id> --crafted') + '   Mark as crafted');
      console.log(chalk.cyan('  eorzea craft --type <craft_type>') + '   Filter by craft type');
      console.log(chalk.cyan('  eorzea craft --ingredient <name>') + '   Find recipes using ingredient');
      console.log(chalk.cyan('  eorzea craft --level <level>') + '       Filter by level');
      service.close();
      return;
    }

    // Build search options
    const searchOptions: any = {};

    if (searchName) {
      searchOptions.result_item_name = searchName;
    }

    if (options.type) {
      searchOptions.craft_type = options.type;
    }

    if (options.ingredient) {
      searchOptions.ingredient_item_name = options.ingredient;
    }

    if (options.level) {
      const level = parseInt(options.level);
      searchOptions.level_min = level - 5;
      searchOptions.level_max = level + 5;
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    const results = service.searchRecipes(searchOptions);

    spinner.stop();

    if (results.recipes.length === 0) {
      console.log(chalk.yellow('No recipes found matching criteria'));
      service.close();
      return;
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Craft Type'),
        chalk.cyan('Level'),
        chalk.cyan('Result Item'),
        chalk.cyan('Stars'),
        chalk.cyan('HQ'),
      ],
      style: {
        head: [],
        border: [],
      },
      colWidths: [10, 15, 8, 35, 8, 6],
    });

    results.recipes.forEach((recipe) => {
      table.push([
        recipe.id.toString(),
        recipe.craft_type_name || 'Unknown',
        recipe.class_job_level?.toString() || 'N/A',
        recipe.result_item_name || 'Unknown',
        recipe.stars ? '⭐'.repeat(recipe.stars) : chalk.gray('✗'),
        recipe.can_hq ? chalk.green('✓') : chalk.gray('✗'),
      ]);
    });

    console.log(chalk.bold(`\n🔨 Recipes (${results.recipes.length}/${results.total} results):\n`));
    console.log(table.toString());

    console.log(chalk.dim(`\n💡 Tip: Use --id <recipeId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading crafting data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function showCraftingGuide(service: CraftingService, recipeId: number): Promise<void> {
  const guide = service.getCraftingGuide(recipeId);

  if (!guide) {
    console.log(chalk.red('Recipe not found'));
    return;
  }

  console.log(
    chalk.cyan.bold(`\n🔨 Complete Crafting Guide: ${guide.recipe.result_item_name}\n`)
  );
  console.log(chalk.gray('━'.repeat(80)));

  // Requirements
  console.log(chalk.bold('Requirements:'));
  console.log(`  ${chalk.dim('Craft Type:')} ${guide.recipe.craft_type_name}`);
  console.log(`  ${chalk.dim('Level:')} ${guide.requirements.level}`);

  if (guide.requirements.craftsmanship > 0) {
    console.log(`  ${chalk.dim('Craftsmanship:')} ${guide.requirements.craftsmanship}`);
  }

  if (guide.requirements.control > 0) {
    console.log(`  ${chalk.dim('Control:')} ${guide.requirements.control}`);
  }

  if (guide.requirements.specialist) {
    console.log(`  ${chalk.dim('Specialist:')} ${chalk.yellow('Required')}`);
  }

  if (guide.requirements.special_item) {
    console.log(`  ${chalk.dim('Special Item:')} ${guide.requirements.special_item}`);
  }

  // Immediate ingredients
  console.log(chalk.bold('\n📦 Direct Ingredients:'));
  if (guide.recipe.ingredients && guide.recipe.ingredients.length > 0) {
    guide.recipe.ingredients.forEach((ingredient) => {
      const sources =
        ingredient.sources && ingredient.sources.length > 0
          ? ` ${chalk.dim('[' + ingredient.sources[0].type + ']')}`
          : '';
      console.log(
        `  ${chalk.yellow('→')} ${ingredient.quantity}x ${ingredient.item_name}${sources}`
      );
    });
  }

  // Total materials (flattened)
  if (guide.total_materials.length > 0) {
    console.log(chalk.bold('\n🗂️  Total Materials Needed (includes sub-materials):'));
    guide.total_materials.forEach((material) => {
      const sources =
        material.sources.length > 0
          ? ` ${chalk.dim('[' + material.sources[0].type + ']')}`
          : '';
      console.log(
        `  ${chalk.yellow('→')} ${material.quantity_needed}x ${material.item_name}${sources}`
      );
    });
  }

  // Intermediate crafts
  if (guide.intermediate_crafts.length > 0) {
    console.log(chalk.bold('\n🔧 Intermediate Crafts Required:'));
    guide.intermediate_crafts.slice(0, 10).forEach((recipe) => {
      console.log(
        `  ${chalk.yellow('→')} ${recipe.result_item_name} (${recipe.craft_type_name} - Lv.${recipe.class_job_level}) ${chalk.dim(`#${recipe.id}`)}`
      );
    });
    if (guide.intermediate_crafts.length > 10) {
      console.log(chalk.dim(`  ... and ${guide.intermediate_crafts.length - 10} more recipes`));
    }
  }

  // Estimates
  console.log(chalk.bold('\n⏱️  Estimates:'));
  console.log(`  ${chalk.dim('Total Crafts:')} ${guide.intermediate_crafts.length + 1}`);
  console.log(`  ${chalk.dim('Estimated Time:')} ~${guide.estimated_time_minutes} minutes`);

  console.log('');
}

async function markRecipeCrafted(
  profileService: any,
  craftingService: CraftingService,
  recipeId: number
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const recipe = craftingService.getRecipeById(recipeId);

  if (!recipe) {
    console.log(chalk.red(`Recipe ${recipeId} not found.\n`));
    return;
  }

  craftingService.trackCraftedItem(character.id, recipeId, recipe.item_result_id);
  console.log(
    chalk.green(`✓ Marked recipe #${recipeId} (${recipe.result_item_name}) as crafted!`)
  );
  console.log('');
}

/**
 * Item CLI Commands
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { ItemService } from '../services/itemService.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface ItemCommandOptions {
  id?: string;
  name?: string;
  level?: string;
  rarity?: string;
  category?: string;
  limit?: string;
  guide?: boolean;
}

export async function itemCommand(nameArg: string | undefined, options: ItemCommandOptions): Promise<void> {
  const spinner = ora('Loading item data...').start();

  try {
    const service = new ItemService();
    const profileService = getPlayerProfileService();

    // Handle specific item ID lookup
    if (options.id) {
      const itemId = parseInt(options.id);

      // Show item guide
      if (options.guide) {
        spinner.stop();
        await showItemGuide(service, itemId);
        service.close();
        return;
      }

      // Show basic item details
      const item = service.getItemById(itemId);

      spinner.stop();

      if (!item) {
        console.log(chalk.yellow(`Item with ID ${itemId} not found`));
        service.close();
        return;
      }

      // Display detailed item information
      console.log(chalk.cyan.bold(`\n📦 Item #${item.id} - ${item.name}`));
      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Level', item.level_item?.toString() || 'N/A'],
        ['Rarity', getRarityDisplay(item.rarity)],
        ['Category', item.ui_category_name || 'Unknown'],
      ];

      if (item.description) {
        details.push(['Description', item.description]);
      }

      if (item.can_be_hq) {
        details.push(['HQ Available', chalk.green('Yes')]);
      }

      if (item.is_untradable) {
        details.push(['Tradable', chalk.red('No')]);
      }

      details.push(['Stack Size', item.stack_size?.toString() || '1']);

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show sources
      if (item.sources && item.sources.length > 0) {
        console.log(chalk.bold('\n📍 Sources:'));
        item.sources.slice(0, 5).forEach((source) => {
          console.log(`  ${chalk.yellow('→')} ${source.source_type}: ${source.source_name || 'Unknown'}`);
        });
        if (item.sources.length > 5) {
          console.log(chalk.dim(`  ... and ${item.sources.length - 5} more sources`));
        }
      }

      // Show uses
      if (item.uses && item.uses.length > 0) {
        console.log(chalk.bold('\n🔧 Used In:'));
        item.uses.slice(0, 5).forEach((use) => {
          console.log(`  ${chalk.yellow('→')} ${use.use_type}: ${use.use_name || 'Unknown'}`);
        });
        if (item.uses.length > 5) {
          console.log(chalk.dim(`  ... and ${item.uses.length - 5} more uses`));
        }
      }

      console.log(chalk.dim(`\n💡 Tip: Use --guide to see complete item guide\n`));

      service.close();
      return;
    }

    // Search items by name
    const searchName = nameArg || options.name;
    if (!searchName) {
      spinner.stop();
      console.log(chalk.yellow('Please specify a search query or item ID'));
      console.log(chalk.cyan('  eorzea item search <name>') + '  Search for items');
      console.log(chalk.cyan('  eorzea item --id <id>') + '      Get item details');
      console.log(chalk.cyan('  eorzea item --id <id> --guide') + ' Get complete item guide');
      service.close();
      return;
    }

    // Build search options
    const searchOptions: any = {
      name: searchName,
    };

    if (options.level) {
      const level = parseInt(options.level);
      searchOptions.level_min = level - 5;
      searchOptions.level_max = level + 5;
    }

    if (options.rarity) {
      searchOptions.rarity = parseInt(options.rarity);
    }

    if (options.category) {
      searchOptions.category = parseInt(options.category);
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    const results = service.searchItems(searchOptions);

    spinner.stop();

    if (results.items.length === 0) {
      console.log(chalk.yellow('No items found matching criteria'));
      service.close();
      return;
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Level'),
        chalk.cyan('Rarity'),
        chalk.cyan('Category'),
        chalk.cyan('HQ'),
      ],
      style: {
        head: [],
        border: [],
      },
      colWidths: [10, 35, 8, 10, 20, 5],
    });

    results.items.forEach((item) => {
      table.push([
        item.id.toString(),
        item.name || 'Unknown',
        item.level_item?.toString() || 'N/A',
        getRarityDisplay(item.rarity),
        item.ui_category_name || 'Unknown',
        item.can_be_hq ? chalk.green('✓') : chalk.gray('✗'),
      ]);
    });

    console.log(chalk.bold(`\n📦 Items (${results.items.length}/${results.total} results):\n`));
    console.log(table.toString());

    console.log(chalk.dim(`\n💡 Tip: Use --id <itemId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading item data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function showItemGuide(service: ItemService, itemId: number): Promise<void> {
  const guide = service.getItemGuide(itemId);

  if (!guide) {
    console.log(chalk.red('Item not found'));
    return;
  }

  console.log(chalk.cyan.bold(`\n📦 Complete Item Guide: ${guide.item.name}\n`));
  console.log(chalk.gray('━'.repeat(80)));

  // Basic info
  console.log(chalk.bold('Basic Information:'));
  console.log(`  ${chalk.dim('ID:')} ${guide.item.id}`);
  console.log(`  ${chalk.dim('Level:')} ${guide.item.level_item || 'N/A'}`);
  console.log(`  ${chalk.dim('Rarity:')} ${getRarityDisplay(guide.item.rarity)}`);
  console.log(`  ${chalk.dim('Category:')} ${guide.item.ui_category_name || 'Unknown'}`);

  if (guide.item.description) {
    console.log(`  ${chalk.dim('Description:')} ${guide.item.description}`);
  }

  // Sources (detailed)
  if (guide.sources_detailed.length > 0) {
    console.log(chalk.bold('\n📍 How to Obtain:'));
    guide.sources_detailed.forEach((source) => {
      console.log(`  ${chalk.yellow('→')} ${chalk.bold(source.type)}: ${source.description}`);
    });
  }

  // Recipes
  if (guide.recipes.length > 0) {
    console.log(chalk.bold('\n🔨 Crafting Recipes:'));
    guide.recipes.forEach((recipe) => {
      console.log(
        `  ${chalk.yellow('→')} ${recipe.craft_type} - Lv.${recipe.level} ${chalk.dim(`(Recipe #${recipe.id})`)}`
      );
    });
  }

  // Used in recipes
  if (guide.used_in_recipes.length > 0) {
    console.log(chalk.bold('\n🔧 Used as Ingredient In:'));
    guide.used_in_recipes.slice(0, 10).forEach((recipe) => {
      console.log(
        `  ${chalk.yellow('→')} ${recipe.name} (${recipe.craft_type}) - ${recipe.quantity}x ${chalk.dim(`#${recipe.id}`)}`
      );
    });
    if (guide.used_in_recipes.length > 10) {
      console.log(chalk.dim(`  ... and ${guide.used_in_recipes.length - 10} more recipes`));
    }
  }

  // Gathering locations
  if (guide.gathering_locations.length > 0) {
    console.log(chalk.bold('\n⛏️  Gathering Locations:'));
    guide.gathering_locations.forEach((location) => {
      console.log(
        `  ${chalk.yellow('→')} ${location.type} - ${location.location} (Lv.${location.level}) ${chalk.dim(`#${location.id}`)}`
      );
    });
  }

  // Uses
  if (guide.uses_detailed.length > 0) {
    console.log(chalk.bold('\n🎯 Uses:'));
    guide.uses_detailed.forEach((use) => {
      console.log(`  ${chalk.yellow('→')} ${use.description} (${use.quantity}x)`);
    });
  }

  console.log('');
}

function getRarityDisplay(rarity?: number): string {
  if (!rarity) return chalk.gray('Common');

  switch (rarity) {
    case 1:
      return chalk.white('Common');
    case 2:
      return chalk.green('Uncommon');
    case 3:
      return chalk.blue('Rare');
    case 4:
      return chalk.magenta('Epic');
    case 7:
      return chalk.yellow('Relic');
    default:
      return chalk.gray(`Rarity ${rarity}`);
  }
}

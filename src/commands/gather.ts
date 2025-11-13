/**
 * Gathering CLI Commands
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { GatheringService } from '../services/gatheringService.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface GatherCommandOptions {
  id?: string;
  mining?: boolean;
  botany?: boolean;
  available?: boolean;
  item?: string;
  level?: string;
  limit?: string;
  gathered?: boolean;
  location?: string;
  timed?: boolean;
}

export async function gatherCommand(options: GatherCommandOptions): Promise<void> {
  const spinner = ora('Loading gathering data...').start();

  try {
    const service = new GatheringService();
    const profileService = getPlayerProfileService();

    // Handle specific gathering point ID lookup
    if (options.id) {
      const pointId = parseInt(options.id);

      // Handle marking as gathered
      if (options.gathered) {
        spinner.stop();
        await markNodeGathered(profileService, service, pointId);
        service.close();
        return;
      }

      const point = service.getGatheringPointById(pointId);

      spinner.stop();

      if (!point) {
        console.log(chalk.yellow(`Gathering point with ID ${pointId} not found`));
        service.close();
        return;
      }

      // Display detailed gathering point information
      console.log(
        chalk.cyan.bold(
          `\n⛏️  Gathering Point #${point.id} - ${point.gathering_type_name || 'Unknown Type'}`
        )
      );
      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Type', point.gathering_type_name || 'Unknown'],
        ['Level', point.gathering_level?.toString() || 'N/A'],
        ['Location', point.place_name || 'Unknown'],
        ['Territory', point.territory_name || 'Unknown'],
        ['Timed Node', point.is_limited ? chalk.yellow('Yes') : chalk.gray('No')],
      ];

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show items available at this node
      if (point.items && point.items.length > 0) {
        console.log(chalk.bold('\n📦 Items Available:'));

        const itemTable = new Table({
          head: [chalk.cyan('Item'), chalk.cyan('Level'), chalk.cyan('Hidden')],
          style: {
            head: [],
            border: [],
          },
          colWidths: [45, 10, 10],
        });

        point.items.forEach((item) => {
          itemTable.push([
            `${item.item_name || 'Unknown'} ${chalk.dim(`(#${item.item_id})`)}`,
            item.item_level?.toString() || 'N/A',
            item.is_hidden ? chalk.yellow('Yes') : chalk.gray('No'),
          ]);
        });

        console.log(itemTable.toString());
      }

      console.log('');
      service.close();
      return;
    }

    // Search by item name
    if (options.item) {
      const results = service.searchGatheringPoints({
        item_name: options.item,
        limit: options.limit ? parseInt(options.limit) : 20,
      });

      spinner.stop();

      if (results.points.length === 0) {
        console.log(chalk.yellow(`No gathering points found for item: ${options.item}`));
        service.close();
        return;
      }

      console.log(chalk.bold(`\n⛏️  Gathering Points for "${options.item}" (${results.points.length} results):\n`));

      displayGatheringTable(results.points);

      console.log(chalk.dim(`\n💡 Tip: Use --id <pointId> to see detailed information\n`));
      service.close();
      return;
    }

    // Build search options
    let searchOptions: any = {};

    if (options.mining) {
      searchOptions.gathering_type = 'Mining';
    } else if (options.botany) {
      searchOptions.gathering_type = 'Botany';
    }

    if (options.level) {
      const level = parseInt(options.level);
      searchOptions.level_min = level - 2;
      searchOptions.level_max = level + 2;
    }

    if (options.location) {
      searchOptions.place_name = options.location;
    }

    if (options.timed) {
      searchOptions.is_limited = true;
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    let points;
    let title;

    if (options.available) {
      // Show available nodes (placeholder - full time support requires additional data)
      points = service.getAvailableNodes();
      if (searchOptions.limit) {
        points = points.slice(0, searchOptions.limit);
      }
      title = 'Currently Available Gathering Nodes';
      spinner.stop();
    } else if (options.mining) {
      points = service.getPointsByType('Mining', searchOptions.limit);
      title = 'Mining Nodes';
      spinner.stop();
    } else if (options.botany) {
      points = service.getPointsByType('Logging', searchOptions.limit);
      title = 'Botany Nodes';
      spinner.stop();
    } else if (options.timed) {
      points = service.getTimedNodes();
      if (searchOptions.limit) {
        points = points.slice(0, searchOptions.limit);
      }
      title = 'Timed/Limited Nodes';
      spinner.stop();
    } else {
      const results = service.searchGatheringPoints(searchOptions);
      points = results.points;
      title = 'Gathering Nodes';
      spinner.stop();
    }

    if (points.length === 0) {
      console.log(chalk.yellow('No gathering points found matching criteria'));
      service.close();
      return;
    }

    console.log(chalk.bold(`\n⛏️  ${title} (${points.length} results):\n`));

    displayGatheringTable(points);

    console.log(chalk.dim(`\n💡 Tip: Use --id <pointId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading gathering data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

function displayGatheringTable(points: any[]): void {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Type'),
      chalk.cyan('Level'),
      chalk.cyan('Location'),
      chalk.cyan('Timed'),
      chalk.cyan('Items'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 12, 8, 25, 8, 10],
  });

  points.forEach((point) => {
    table.push([
      point.id.toString(),
      point.gathering_type_name || 'Unknown',
      point.gathering_level?.toString() || 'N/A',
      point.place_name || 'Unknown',
      point.is_limited ? chalk.yellow('✓') : chalk.gray('✗'),
      point.items?.length?.toString() || '0',
    ]);
  });

  console.log(table.toString());
}

async function markNodeGathered(
  profileService: any,
  gatheringService: GatheringService,
  pointId: number
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const point = gatheringService.getGatheringPointById(pointId);

  if (!point) {
    console.log(chalk.red(`Gathering point ${pointId} not found.\n`));
    return;
  }

  // Mark the first item at this point as gathered (for simplicity)
  if (point.items && point.items.length > 0) {
    const firstItem = point.items[0];
    gatheringService.trackGatheredItem(character.id, firstItem.item_id, pointId);
    console.log(
      chalk.green(
        `✓ Marked item "${firstItem.item_name}" from gathering point #${pointId} as gathered!`
      )
    );
  } else {
    console.log(chalk.yellow(`No items found at gathering point #${pointId}\n`));
  }

  console.log('');
}

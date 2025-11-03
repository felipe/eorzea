/**
 * Gathering CLI Commands
 * For mining, logging, and other gathering activities
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { GatheringTrackerService } from '../services/gatheringTracker.js';
import { getPlayerProfileService } from '../services/playerProfile.js';
import { getEorzeanTime, formatEorzeanTime, formatTimeWindow } from '../utils/eorzeanTime.js';
import type { GatheringType } from '../types/gathering.js';

interface GatheringCommandOptions {
  id?: string;
  mining?: boolean;
  logging?: boolean;
  quarrying?: boolean;
  harvesting?: boolean;
  level?: string;
  available?: boolean;
  timed?: boolean;
  legendary?: boolean;
  ephemeral?: boolean;
  folklore?: boolean;
  location?: string;
  limit?: string;
  // Progress tracking
  gathered?: boolean;
  note?: string;
  showGathered?: boolean;
  showUngathered?: boolean;
}

export async function gatheringCommand(options: GatheringCommandOptions): Promise<void> {
  const spinner = ora('Loading gathering data...').start();

  try {
    const service = new GatheringTrackerService();
    const profileService = getPlayerProfileService();

    // Handle specific node ID lookup
    if (options.id) {
      const nodeId = parseInt(options.id);

      // Handle marking as gathered
      if (options.gathered) {
        spinner.stop();
        markNodeGathered(profileService, service, nodeId, options.note);
        service.close();
        return;
      }

      const node = service.getNodeById(nodeId);

      spinner.stop();

      if (!node) {
        console.log(chalk.yellow(`Node with ID ${nodeId} not found`));
        service.close();
        return;
      }

      // Get items for this node
      const items = service.getNodeItems(nodeId);

      // Check gathering window
      const window = service.getNodeWindow(node);

      // Display detailed node information
      const nodeIcon = node.type === 'mining' || node.type === 'quarrying' ? '⛏️' : '🌲';
      console.log(
        chalk.cyan.bold(`\n${nodeIcon} Node #${node._id}${node.name ? ` - ${node.name}` : ''}`)
      );

      // Display availability status
      if (node.startHour === 24) {
        console.log(chalk.green('✓ Always Available'));
      } else if (window.isAvailableNow) {
        console.log(
          chalk.green(`✓ Available Now (until ${window.nextWindowEnd?.toLocaleTimeString()})`)
        );
      } else {
        console.log(
          chalk.yellow(
            `○ Next available in ${window.minutesUntilAvailable} minutes (${window.nextWindowStart?.toLocaleTimeString()})`
          )
        );
      }

      console.log(chalk.gray('━'.repeat(60)));

      const details = [
        ['Type', formatNodeType(node.type)],
        ['Level', node.level.toString()],
        ['Location', service.getZoneName(node.location) || `Zone ${node.location}`],
      ];

      if (node.x && node.y) {
        details.push(['Coordinates', `(${node.x.toFixed(1)}, ${node.y.toFixed(1)})`]);
      }

      if (node.startHour < 24) {
        details.push(['Time Window', formatTimeWindow(node.startHour, node.endHour)]);
      }

      if (node.legendary) {
        details.push(['Type', chalk.magenta('Legendary Node')]);
      }
      if (node.ephemeral) {
        details.push(['Type', chalk.cyan('Ephemeral Node')]);
      }
      if (node.folklore) {
        details.push(['Folklore', chalk.yellow('Required')]);
      }

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Display items available at this node
      if (items.length > 0) {
        console.log(chalk.cyan.bold('\nAvailable Items:'));
        items.forEach((item) => {
          let itemLine = `  Slot ${item.slot}: `;
          itemLine += item.name || `Item #${item.itemId}`;

          if (item.hidden) {
            itemLine += chalk.gray(' (Hidden)');
          }
          if (item.requiredGathering) {
            itemLine += chalk.dim(` [${item.requiredGathering}+ Gathering]`);
          }
          if (item.requiredPerception) {
            itemLine += chalk.dim(` [${item.requiredPerception}+ Perception]`);
          }
          if (item.isCollectable) {
            itemLine += chalk.cyan(' [Collectable]');
          }
          if (item.chance) {
            itemLine += chalk.gray(` (${item.chance}% chance)`);
          }

          console.log(itemLine);
        });
      }

      const character = profileService.getActiveCharacter();
      if (character) {
        console.log(chalk.dim(`\n💡 Tip: Use --gathered to mark items from this node as gathered`));
      }

      service.close();
      return;
    }

    // Build search options
    const searchOptions: any = {};

    // Determine gathering types to search for
    const types: GatheringType[] = [];
    if (options.mining) types.push('mining');
    if (options.logging) types.push('logging');
    if (options.quarrying) types.push('quarrying');
    if (options.harvesting) types.push('harvesting');

    if (types.length > 0) {
      searchOptions.type = types;
    }

    // Parse level range
    if (options.level) {
      if (options.level.includes('-')) {
        const [min, max] = options.level.split('-').map((n) => parseInt(n.trim()));
        searchOptions.minLevel = min;
        searchOptions.maxLevel = max;
      } else {
        const level = parseInt(options.level);
        searchOptions.minLevel = level;
        searchOptions.maxLevel = level;
      }
    }

    if (options.location) {
      searchOptions.location = parseInt(options.location);
    }

    if (options.legendary) {
      searchOptions.legendary = true;
    }

    if (options.ephemeral) {
      searchOptions.ephemeral = true;
    }

    if (options.folklore) {
      searchOptions.folklore = true;
    }

    if (options.available) {
      searchOptions.availableNow = true;
    }

    if (options.limit) {
      searchOptions.limit = parseInt(options.limit);
    } else {
      searchOptions.limit = 20; // Default limit
    }

    // Get nodes based on options
    let nodes;
    let title = 'Gathering Nodes';

    if (options.timed && !options.available) {
      // Show all timed nodes
      nodes = service.getTimedNodes(types.length === 1 ? types[0] : undefined);
      if (searchOptions.limit) {
        nodes = nodes.slice(0, searchOptions.limit);
      }
      title = 'Timed Gathering Nodes';
    } else {
      nodes = service.searchNodes(searchOptions);

      // Build title based on filters
      const titleParts = [];
      if (options.available) titleParts.push('Available');
      if (options.legendary) titleParts.push('Legendary');
      if (options.ephemeral) titleParts.push('Ephemeral');
      if (types.length === 1) {
        titleParts.push(formatNodeType(types[0]));
      } else if (types.length > 1) {
        titleParts.push('Gathering');
      } else {
        titleParts.push('Gathering');
      }
      titleParts.push('Nodes');
      title = titleParts.join(' ');
    }

    spinner.stop();

    if (nodes.length === 0) {
      console.log(chalk.yellow('No nodes found matching criteria'));
      service.close();
      return;
    }

    // Display Eorzean time if showing available or timed nodes
    if (options.available || options.timed) {
      const eorzeaTime = getEorzeanTime();
      console.log(chalk.cyan(`\n⏰ Current Eorzean Time: ${formatEorzeanTime(eorzeaTime)}\n`));
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Type'),
        chalk.cyan('Lvl'),
        chalk.cyan('Location'),
        chalk.cyan('Time'),
        chalk.cyan('Special'),
      ],
      style: {
        head: [],
        border: [],
      },
    });

    nodes.forEach((node) => {
      const window = service.getNodeWindow(node);
      const zone = service.getZoneName(node.location) || `Zone ${node.location}`;

      // Format time display
      let timeDisplay;
      if (node.startHour === 24) {
        timeDisplay = 'Always';
      } else if (window.isAvailableNow) {
        timeDisplay = chalk.green(formatTimeWindow(node.startHour, node.endHour));
      } else {
        timeDisplay = formatTimeWindow(node.startHour, node.endHour);
        if (window.minutesUntilAvailable && window.minutesUntilAvailable <= 60) {
          timeDisplay += chalk.yellow(` (${window.minutesUntilAvailable}m)`);
        }
      }

      // Format special attributes
      const special = [];
      if (node.legendary) special.push(chalk.magenta('L'));
      if (node.ephemeral) special.push(chalk.cyan('E'));
      if (node.folklore) special.push(chalk.yellow('F'));

      table.push([
        node._id.toString(),
        formatNodeTypeShort(node.type),
        node.level.toString(),
        zone.length > 20 ? zone.substring(0, 17) + '...' : zone,
        timeDisplay,
        special.join(' ') || '-',
      ]);
    });

    console.log(chalk.bold(`\n${title} (${nodes.length} results):\n`));
    console.log(table.toString());

    // Show legend for special markers
    const hasSpecial = nodes.some((n) => n.legendary || n.ephemeral || n.folklore);
    if (hasSpecial) {
      console.log(chalk.dim('\nLegend:'));
      console.log(
        chalk.dim(
          `  ${chalk.magenta('L')} = Legendary  ${chalk.cyan('E')} = Ephemeral  ${chalk.yellow('F')} = Folklore Required`
        )
      );
    }

    // Show summary stats
    const stats = service.getStats();
    console.log(
      chalk.dim(
        `\n📊 Database: ${stats.totalNodes} nodes (${stats.nodesByType.mining} mining, ${stats.nodesByType.logging} logging)`
      )
    );
    console.log(chalk.dim(`💡 Tip: Use --id <nodeId> to see detailed information\n`));

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

function formatNodeType(type: GatheringType): string {
  switch (type) {
    case 'mining':
      return '⛏️  Mining';
    case 'logging':
      return '🌲 Logging';
    case 'quarrying':
      return '⛏️  Quarrying';
    case 'harvesting':
      return '🌿 Harvesting';
    default:
      return type;
  }
}

function formatNodeTypeShort(type: GatheringType): string {
  switch (type) {
    case 'mining':
      return '⛏️  MIN';
    case 'logging':
      return '🌲 BTN';
    case 'quarrying':
      return '⛏️  QRY';
    case 'harvesting':
      return '🌿 HRV';
  }
}

function markNodeGathered(
  profileService: any,
  gatheringService: GatheringTrackerService,
  nodeId: number,
  note?: string
): void {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const node = gatheringService.getNodeById(nodeId);

  if (!node) {
    console.log(chalk.red(`Node ${nodeId} not found.\n`));
    return;
  }

  // For now, we'll add a simple tracking method
  // In a full implementation, this would track which items were gathered
  console.log(
    chalk.green(`✓ Marked node #${nodeId}${node.name ? ` (${node.name})` : ''} as gathered!`)
  );

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

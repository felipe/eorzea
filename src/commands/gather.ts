/**
 * Gathering CLI Commands - Updated for Time-Aware Nodes
 *
 * This module provides CLI commands for browsing and searching gathering nodes
 * with real-time availability based on Eorzean time windows.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { GatheringNodeService } from '../services/gatheringNodeService.js';
import { getEorzeanTime, formatTimeWindow, isInTimeWindow } from '../utils/eorzeanTime.js';

/**
 * Options for the gather command
 */
export interface GatherCommandOptions {
  /** Show details for a specific node by ID */
  id?: string;
  /** Filter to show only mining nodes */
  mining?: boolean;
  /** Filter to show only botany (logging) nodes */
  botany?: boolean;
  /** Filter to show only currently available nodes */
  available?: boolean;
  /** Search for nodes that drop a specific item */
  item?: string;
  /** Filter nodes by level (±2 level range) */
  level?: string;
  /** Maximum number of results to display */
  limit?: string;
  /** Filter nodes by location name */
  location?: string;
  /** Show only timed nodes (ephemeral, unspoiled, legendary) */
  timed?: boolean;
}

/**
 * Main handler for the gather command.
 *
 * Displays gathering node information with time window awareness, allowing users to:
 * - View currently available nodes based on Eorzean time
 * - Search for nodes by type, level, location, or item
 * - See detailed information about specific nodes including time windows
 * - View all timed nodes with their next availability window
 *
 * @param options - Command options for filtering and display
 *
 * @example
 * ```bash
 * # Show currently available mining nodes
 * eorzea gather --available --mining
 *
 * # Show all timed nodes with next window info
 * eorzea gather --timed --limit 20
 *
 * # View specific node details
 * eorzea gather --id 10
 * ```
 */
export async function gatherCommand(options: GatherCommandOptions): Promise<void> {
  const spinner = ora('Loading gathering data...').start();

  try {
    const service = new GatheringNodeService();
    const now = new Date();
    const et = getEorzeanTime(now);

    // Handle specific node ID lookup
    if (options.id) {
      const nodeId = parseInt(options.id);
      const node = service.getNodeById(nodeId);

      spinner.stop();

      if (!node) {
        console.log(chalk.yellow(`Gathering node with ID ${nodeId} not found`));
        service.close();
        return;
      }

      // Display detailed node information
      console.log(
        chalk.cyan.bold(
          `\n⛏️  ${node.name || 'Gathering Node'} #${node.id} - ${getNodeTypeIcon(node.type)} ${node.type.toUpperCase()}`
        )
      );
      console.log(chalk.gray('━'.repeat(70)));

      const details: Array<[string, string]> = [
        ['Type', `${getNodeTypeIcon(node.type)} ${node.type}`],
        ['Level', node.level?.toString() || 'N/A'],
        ['Location', node.location_name || 'Unknown'],
      ];

      if (node.x && node.y) {
        details.push(['Coordinates', `(${node.x.toFixed(1)}, ${node.y.toFixed(1)})`]);
      }

      // Time window info
      const timeWindow = formatTimeWindow(node.start_hour, node.end_hour);
      const isAvailable = isInTimeWindow(et.hours, node.start_hour, node.end_hour);

      details.push(['Time Window', timeWindow]);
      details.push([
        'Status',
        isAvailable ? chalk.green('✓ Available NOW') : chalk.red('✗ Not Available'),
      ]);

      if (node.folklore) {
        details.push(['Requires Folklore', chalk.yellow('Yes')]);
      }
      if (node.ephemeral) {
        details.push(['Special Type', chalk.magenta('Ephemeral Node')]);
      }
      if (node.legendary) {
        details.push(['Special Type', chalk.yellow('⭐ Legendary Node')]);
      }
      if (node.patch) {
        details.push(['Patch', node.patch.toString()]);
      }

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show items available at this node
      const items = service.getItemsAtNode(nodeId);
      if (items.length > 0) {
        console.log(chalk.bold('\n📦 Items Available:'));

        const itemTable = new Table({
          head: [chalk.cyan('Slot'), chalk.cyan('Item'), chalk.cyan('Hidden')],
          style: {
            head: [],
            border: [],
          },
          colWidths: [8, 50, 10],
        });

        items.forEach((item) => {
          itemTable.push([
            item.slot.toString(),
            `${item.item_name || 'Unknown'} ${chalk.dim(`(#${item.item_id})`)}`,
            item.hidden ? chalk.yellow('Yes') : chalk.gray('No'),
          ]);
        });

        console.log(itemTable.toString());
      }

      console.log('');
      service.close();
      return;
    }

    // Determine gathering type filter
    let typeFilter: string | undefined;
    if (options.mining) {
      typeFilter = 'mining';
    } else if (options.botany) {
      typeFilter = 'logging'; // Logging is the primary botany type
    }

    // Handle available nodes
    if (options.available) {
      const availableNodes = service.getAvailableNodes(now, typeFilter);
      spinner.stop();

      if (availableNodes.length === 0) {
        console.log(chalk.yellow('No gathering nodes currently available'));
        service.close();
        return;
      }

      const limit = options.limit ? parseInt(options.limit) : 20;
      const displayNodes = availableNodes.slice(0, limit);

      console.log(
        chalk.bold(
          `\n⛏️  Currently Available Gathering Nodes (${displayNodes.length}/${availableNodes.length}):`
        )
      );
      console.log(
        chalk.dim(
          `   Eorzean Time: ${et.hours.toString().padStart(2, '0')}:${et.minutes.toString().padStart(2, '0')}\n`
        )
      );

      displayNodeTableWithTime(displayNodes);

      console.log(chalk.dim(`\n💡 Tip: Use --id <nodeId> to see detailed information\n`));
      service.close();
      return;
    }

    // Handle timed nodes
    if (options.timed) {
      const timedNodes = service.getTimedNodes(typeFilter);
      spinner.stop();

      if (timedNodes.length === 0) {
        console.log(chalk.yellow('No timed gathering nodes found'));
        service.close();
        return;
      }

      const limit = options.limit ? parseInt(options.limit) : 50;
      const displayNodes = timedNodes.slice(0, limit);

      console.log(
        chalk.bold(`\n⛏️  Timed Gathering Nodes (${displayNodes.length}/${timedNodes.length}):`)
      );
      console.log(
        chalk.dim(
          `   Eorzean Time: ${et.hours.toString().padStart(2, '0')}:${et.minutes.toString().padStart(2, '0')}\n`
        )
      );

      displayNodeTableWithTime(displayNodes);

      console.log(chalk.dim(`\n💡 Tip: Use --id <nodeId> to see detailed information\n`));
      service.close();
      return;
    }

    // Search by item name
    if (options.item) {
      const nodes = service.searchNodes({
        type: typeFilter,
        itemName: options.item,
        limit: options.limit ? parseInt(options.limit) : 20,
      });

      spinner.stop();

      if (nodes.length === 0) {
        console.log(chalk.yellow(`No gathering nodes found for item: ${options.item}`));
        service.close();
        return;
      }

      console.log(
        chalk.bold(`\n⛏️  Gathering Nodes for "${options.item}" (${nodes.length} results):\n`)
      );

      displayNodeTable(nodes);

      console.log(chalk.dim(`\n💡 Tip: Use --id <nodeId> to see detailed information\n`));
      service.close();
      return;
    }

    // General search
    const searchOptions: any = {
      type: typeFilter,
      location: options.location,
      limit: options.limit ? parseInt(options.limit) : 20,
    };

    if (options.level) {
      const level = parseInt(options.level);
      searchOptions.minLevel = level - 2;
      searchOptions.maxLevel = level + 2;
    }

    const nodes = service.searchNodes(searchOptions);
    spinner.stop();

    if (nodes.length === 0) {
      console.log(chalk.yellow('No gathering nodes found matching criteria'));
      service.close();
      return;
    }

    const typeLabel = options.mining ? 'Mining' : options.botany ? 'Botany' : 'Gathering';

    console.log(chalk.bold(`\n⛏️  ${typeLabel} Nodes (${nodes.length} results):\n`));

    displayNodeTable(nodes);

    console.log(chalk.dim(`\n💡 Tip: Use --id <nodeId> to see detailed information\n`));

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

/**
 * Returns an emoji icon for a gathering node type.
 *
 * @param type - The gathering type ('mining', 'logging', 'harvesting', 'quarrying')
 * @returns Emoji icon representing the gathering type
 */
function getNodeTypeIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'mining':
      return '⛏️';
    case 'quarrying':
      return '⛏️';
    case 'logging':
      return '🪓';
    case 'harvesting':
      return '🌿';
    default:
      return '📦';
  }
}

/**
 * Displays a formatted table of gathering nodes without time information.
 *
 * Used for general node listings where time availability is not the focus.
 * Shows node ID, name, type, level, location, and time window.
 *
 * @param nodes - Array of gathering nodes to display
 */
function displayNodeTable(nodes: any[]): void {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Lvl'),
      chalk.cyan('Location'),
      chalk.cyan('Time'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [8, 25, 12, 6, 25, 15],
  });

  nodes.forEach((node) => {
    const timeWindow = formatTimeWindow(node.start_hour, node.end_hour);
    table.push([
      node.id.toString(),
      node.name || chalk.dim('Unnamed'),
      `${getNodeTypeIcon(node.type)} ${node.type}`,
      node.level?.toString() || 'N/A',
      node.location_name || 'Unknown',
      node.start_hour === 0 && node.end_hour === 24
        ? chalk.gray('Always')
        : chalk.yellow(timeWindow),
    ]);
  });

  console.log(table.toString());
}

/**
 * Displays a formatted table of gathering nodes with real-time availability status.
 *
 * Used for timed node listings and available node displays.
 * Shows node ID, name, type, level, location, time window, and current status
 * (e.g., "Available NOW" or "in 3h 15m").
 *
 * @param nodes - Array of gathering nodes with availability information to display
 */
function displayNodeTableWithTime(nodes: any[]): void {
  const table = new Table({
    head: [
      chalk.cyan('ID'),
      chalk.cyan('Name'),
      chalk.cyan('Type'),
      chalk.cyan('Lvl'),
      chalk.cyan('Location'),
      chalk.cyan('Time Window'),
      chalk.cyan('Status'),
    ],
    style: {
      head: [],
      border: [],
    },
    colWidths: [8, 20, 10, 6, 20, 14, 16],
  });

  nodes.forEach((node) => {
    const status = node.is_available
      ? chalk.green('✓ NOW')
      : node.next_available
        ? chalk.yellow(`in ${formatTimeUntil(node.next_available)}`)
        : chalk.gray('N/A');

    table.push([
      node.id.toString(),
      node.name || chalk.dim('Unnamed'),
      `${getNodeTypeIcon(node.type)} ${node.type}`,
      node.level?.toString() || 'N/A',
      node.location_name || 'Unknown',
      chalk.yellow(node.time_window_display || 'N/A'),
      status,
    ]);
  });

  console.log(table.toString());
}

/**
 * Formats a future date as a human-readable time duration from now.
 *
 * Converts a future timestamp into a compact string showing how long until
 * that time (e.g., "3h 15m", "45m", "< 1m").
 *
 * @param date - Future date to calculate time until
 * @returns Formatted time duration string
 *
 * @example
 * ```typescript
 * const futureTime = new Date(Date.now() + 3.5 * 60 * 60 * 1000);
 * console.log(formatTimeUntil(futureTime)); // "3h 30m"
 * ```
 */
function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) {
    return '< 1m';
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else {
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

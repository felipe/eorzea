/**
 * Fish CLI Commands
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { FishTrackerService } from '../services/fishTracker.js';
import { getEorzeanTime, formatEorzeanTime, formatTimeWindow } from '../utils/eorzeanTime.js';

interface FishCommandOptions {
  id?: string;
  big?: boolean;
  patch?: string;
  location?: string;
  available?: boolean;
  aquarium?: boolean;
  limit?: string;
}

export async function fishCommand(options: FishCommandOptions): Promise<void> {
  const spinner = ora('Loading fish data...').start();

  try {
    const service = new FishTrackerService();

    // Handle specific fish ID lookup
    if (options.id) {
      const fishId = parseInt(options.id);
      const fish = service.getFishById(fishId);

      spinner.stop();

      if (!fish) {
        console.log(chalk.yellow(`Fish with ID ${fishId} not found`));
        service.close();
        return;
      }

      // Display detailed fish information
      console.log(chalk.cyan.bold(`\n🐟 Fish #${fish._id}`));
      console.log(chalk.gray('━'.repeat(60)));

      const details = [
        ['Patch', fish.patch.toFixed(1)],
        ['Location ID', fish.location || 'Unknown'],
        ['Time', formatTimeWindow(fish.startHour, fish.endHour)],
        ['Big Fish', fish.bigFish ? chalk.green('Yes') : chalk.gray('No')],
        ['Hookset', fish.hookset || 'N/A'],
        ['Tug', fish.tug || 'N/A'],
      ];

      if (fish.weatherSet.length > 0) {
        details.push(['Weather Required', fish.weatherSet.join(', ')]);
      }

      if (fish.folklore) {
        details.push(['Folklore', chalk.yellow('Required')]);
      }

      if (fish.aquarium) {
        details.push(['Aquarium', `${fish.aquarium.water} (Size ${fish.aquarium.size})`]);
      }

      if (fish.bestCatchPath.length > 0) {
        details.push(['Best Bait Path', fish.bestCatchPath.join(' → ')]);
      }

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      service.close();
      return;
    }

    // Build search options
    const searchOptions: any = {};

    if (options.big) {
      searchOptions.bigFishOnly = true;
    }

    if (options.patch) {
      searchOptions.patch = parseFloat(options.patch);
    }

    if (options.location) {
      searchOptions.location = parseInt(options.location);
    }

    if (options.aquarium) {
      searchOptions.aquariumOnly = true;
    }

    if (options.limit) {
      searchOptions.limit = parseInt(options.limit);
    } else {
      searchOptions.limit = 20; // Default limit
    }

    // Get fish based on options
    let fish;
    let title;

    if (options.available) {
      fish = service.getAvailableFish();
      if (searchOptions.limit) {
        fish = fish.slice(0, searchOptions.limit);
      }
      title = 'Currently Available Fish';
    } else {
      fish = service.searchFish(searchOptions);
      title = 'Fish';
    }

    spinner.stop();

    if (fish.length === 0) {
      console.log(chalk.yellow('No fish found matching criteria'));
      service.close();
      return;
    }

    // Display Eorzean time if showing available fish
    if (options.available) {
      const eorzeaTime = getEorzeanTime();
      console.log(chalk.cyan(`\n⏰ Current Eorzean Time: ${formatEorzeanTime(eorzeaTime)}\n`));
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Patch'),
        chalk.cyan('Time Window'),
        chalk.cyan('Big'),
        chalk.cyan('Hookset'),
        chalk.cyan('Tug'),
      ],
      style: {
        head: [],
        border: [],
      },
    });

    fish.forEach((f) => {
      table.push([
        f._id.toString(),
        f.patch.toFixed(1),
        formatTimeWindow(f.startHour, f.endHour),
        f.bigFish ? chalk.green('✓') : chalk.gray('✗'),
        f.hookset || '-',
        f.tug || '-',
      ]);
    });

    console.log(chalk.bold(`\n${title} (${fish.length} results):\n`));
    console.log(table.toString());

    // Show summary stats
    const stats = service.getBigFishCount();
    const total = service.getTotalCount();

    console.log(chalk.dim(`\n📊 Database: ${total} total fish, ${stats} big fish`));
    console.log(chalk.dim(`💡 Tip: Use --id <fishId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading fish data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

/**
 * Fish CLI Commands
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { FishTrackerService } from '../services/fishTracker.js';
import { getPlayerProfileService } from '../services/playerProfile.js';
import { getEorzeanTime, formatEorzeanTime, formatTimeWindow } from '../utils/eorzeanTime.js';

interface FishCommandOptions {
  id?: string;
  big?: boolean;
  patch?: string;
  location?: string;
  available?: boolean;
  aquarium?: boolean;
  limit?: string;
  // Progress tracking
  caught?: boolean;
  note?: string;
  showCaught?: boolean;
  showUncaught?: boolean;
}

export async function fishCommand(options: FishCommandOptions): Promise<void> {
  const spinner = ora('Loading fish data...').start();

  try {
    const service = new FishTrackerService();
    const profileService = getPlayerProfileService();

    // Handle specific fish ID lookup
    if (options.id) {
      const fishId = parseInt(options.id);

      // Handle marking as caught
      if (options.caught) {
        spinner.stop();
        markFishCaught(profileService, service, fishId, options.note);
        service.close();
        return;
      }

      const fish = service.getFishById(fishId);

      spinner.stop();

      if (!fish) {
        console.log(chalk.yellow(`Fish with ID ${fishId} not found`));
        service.close();
        return;
      }

      // Check if caught
      const character = profileService.getActiveCharacter();
      const isCaught = character ? profileService.isFishCaught(character.id, fishId) : false;

      // Display detailed fish information
      console.log(chalk.cyan.bold(`\n🐟 Fish #${fish._id}${fish.name ? ` - ${fish.name}` : ''}`));

      if (character) {
        if (isCaught) {
          console.log(chalk.green('✓ CAUGHT'));
        } else {
          console.log(chalk.gray('○ Not caught yet'));
        }
      }

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

      if (character && !isCaught) {
        console.log(chalk.dim(`\n💡 Tip: Use --caught to mark this fish as caught`));
      }

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

    // Filter by caught status if requested
    const character = profileService.getActiveCharacter();
    if (character && (options.showCaught || options.showUncaught)) {
      fish = fish.filter((f) => {
        const isCaught = profileService.isFishCaught(character.id, f._id);
        if (options.showCaught) return isCaught;
        if (options.showUncaught) return !isCaught;
        return true;
      });
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
    const tableHead = character
      ? [
          chalk.cyan('✓'),
          chalk.cyan('ID'),
          chalk.cyan('Patch'),
          chalk.cyan('Time Window'),
          chalk.cyan('Big'),
          chalk.cyan('Hookset'),
          chalk.cyan('Tug'),
        ]
      : [
          chalk.cyan('ID'),
          chalk.cyan('Patch'),
          chalk.cyan('Time Window'),
          chalk.cyan('Big'),
          chalk.cyan('Hookset'),
          chalk.cyan('Tug'),
        ];

    const table = new Table({
      head: tableHead,
      style: {
        head: [],
        border: [],
      },
    });

    fish.forEach((f) => {
      const row = [
        f._id.toString(),
        f.patch.toFixed(1),
        formatTimeWindow(f.startHour, f.endHour),
        f.bigFish ? chalk.green('✓') : chalk.gray('✗'),
        f.hookset || '-',
        f.tug || '-',
      ];

      if (character) {
        const isCaught = profileService.isFishCaught(character.id, f._id);
        row.unshift(isCaught ? chalk.green('✓') : chalk.gray('○'));
      }

      table.push(row);
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

function markFishCaught(
  profileService: any,
  fishService: FishTrackerService,
  fishId: number,
  note?: string
): void {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const fish = fishService.getFishById(fishId);

  if (!fish) {
    console.log(chalk.red(`Fish ${fishId} not found.\n`));
    return;
  }

  profileService.markFishCaught(character.id, fishId, fish.location, note);
  console.log(
    chalk.green(`✓ Marked fish #${fishId}${fish.name ? ` (${fish.name})` : ''} as caught!`)
  );

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

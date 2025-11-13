/**
 * Collectibles CLI Commands (Mounts, Minions, Orchestrion Rolls)
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { CollectiblesService } from '../services/collectiblesService.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface CollectibleCommandOptions {
  id?: string;
  obtained?: boolean;
  flying?: boolean;
  aquatic?: boolean;
  battle?: boolean;
  limit?: string;
  note?: string;
}

// ============================================================================
// MOUNT COMMAND
// ============================================================================

export async function mountCommand(
  nameArg: string | undefined,
  options: CollectibleCommandOptions
): Promise<void> {
  const spinner = ora('Loading mount data...').start();

  try {
    const service = new CollectiblesService();
    const profileService = getPlayerProfileService();
    const character = profileService.getActiveCharacter();

    // Handle specific mount ID lookup
    if (options.id) {
      const mountId = parseInt(options.id);

      // Handle marking as obtained
      if (options.obtained) {
        spinner.stop();
        await markMountObtained(profileService, service, mountId, options.note);
        service.close();
        return;
      }

      const mount = service.getMountById(mountId);

      spinner.stop();

      if (!mount) {
        console.log(chalk.yellow(`Mount with ID ${mountId} not found`));
        service.close();
        return;
      }

      // Display detailed mount information
      console.log(chalk.cyan.bold(`\n🐴 Mount #${mount.id} - ${mount.singular || mount.name}`));

      if (character) {
        if (mount.obtained) {
          console.log(chalk.green('✓ OBTAINED'));
        } else {
          console.log(chalk.gray('○ Not obtained yet'));
        }
      }

      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Name', mount.singular || mount.name || 'Unknown'],
        ['Description', mount.description || 'N/A'],
        ['Flying', mount.is_flying ? chalk.green('Yes') : chalk.gray('No')],
        ['Aquatic', mount.is_aquatic ? chalk.green('Yes') : chalk.gray('No')],
        ['Seats', mount.is_seats?.toString() || '1'],
      ];

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show sources
      if (mount.sources && mount.sources.length > 0) {
        console.log(chalk.bold('\n📍 How to Obtain:'));
        mount.sources.forEach((source) => {
          console.log(`  ${chalk.yellow('→')} ${source.source_type}: ${source.source_name || 'Unknown'}`);
        });
      }

      if (character && !mount.obtained) {
        console.log(chalk.dim(`\n💡 Tip: Use --obtained to mark this mount as obtained`));
      }

      console.log('');
      service.close();
      return;
    }

    // Search mounts by name
    const searchName = nameArg;
    const searchOptions: any = {};

    if (searchName) {
      searchOptions.name = searchName;
    }

    if (options.flying !== undefined) {
      searchOptions.is_flying = options.flying;
    }

    if (options.aquatic !== undefined) {
      searchOptions.is_aquatic = options.aquatic;
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    const results = service.searchMounts(searchOptions);

    spinner.stop();

    if (results.mounts.length === 0) {
      console.log(chalk.yellow('No mounts found matching criteria'));
      service.close();
      return;
    }

    // Create table
    const tableHead = character
      ? [
          chalk.cyan('✓'),
          chalk.cyan('ID'),
          chalk.cyan('Name'),
          chalk.cyan('Flying'),
          chalk.cyan('Seats'),
        ]
      : [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Flying'), chalk.cyan('Seats')];

    const table = new Table({
      head: tableHead,
      style: {
        head: [],
        border: [],
      },
    });

    results.mounts.forEach((mount) => {
      const row = [
        mount.id.toString(),
        mount.singular || mount.name || 'Unknown',
        mount.is_flying ? chalk.green('✓') : chalk.gray('✗'),
        mount.is_seats?.toString() || '1',
      ];

      if (character) {
        row.unshift(mount.obtained ? chalk.green('✓') : chalk.gray('○'));
      }

      table.push(row);
    });

    console.log(chalk.bold(`\n🐴 Mounts (${results.mounts.length}/${results.total} results):\n`));
    console.log(table.toString());

    console.log(chalk.dim(`\n💡 Tip: Use --id <mountId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading mount data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function markMountObtained(
  profileService: any,
  collectiblesService: CollectiblesService,
  mountId: number,
  note?: string
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const mount = collectiblesService.getMountById(mountId);

  if (!mount) {
    console.log(chalk.red(`Mount ${mountId} not found.\n`));
    return;
  }

  collectiblesService.trackObtainedMount(parseInt(character.id), mountId, undefined, note);
  console.log(chalk.green(`✓ Marked mount "${mount.singular || mount.name}" as obtained!`));

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

// ============================================================================
// MINION COMMAND
// ============================================================================

export async function minionCommand(
  nameArg: string | undefined,
  options: CollectibleCommandOptions
): Promise<void> {
  const spinner = ora('Loading minion data...').start();

  try {
    const service = new CollectiblesService();
    const profileService = getPlayerProfileService();
    const character = profileService.getActiveCharacter();

    // Handle specific companion ID lookup
    if (options.id) {
      const companionId = parseInt(options.id);

      // Handle marking as obtained
      if (options.obtained) {
        spinner.stop();
        await markMinionObtained(profileService, service, companionId, options.note);
        service.close();
        return;
      }

      const companion = service.getCompanionById(companionId);

      spinner.stop();

      if (!companion) {
        console.log(chalk.yellow(`Minion with ID ${companionId} not found`));
        service.close();
        return;
      }

      // Display detailed companion information
      console.log(
        chalk.cyan.bold(`\n🐾 Minion #${companion.id} - ${companion.singular || companion.name}`)
      );

      if (character) {
        if (companion.obtained) {
          console.log(chalk.green('✓ OBTAINED'));
        } else {
          console.log(chalk.gray('○ Not obtained yet'));
        }
      }

      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Name', companion.singular || companion.name || 'Unknown'],
        ['Description', companion.description || 'N/A'],
        ['Battle Minion', companion.is_battle ? chalk.green('Yes') : chalk.gray('No')],
      ];

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show sources
      if (companion.sources && companion.sources.length > 0) {
        console.log(chalk.bold('\n📍 How to Obtain:'));
        companion.sources.forEach((source) => {
          console.log(`  ${chalk.yellow('→')} ${source.source_type}: ${source.source_name || 'Unknown'}`);
        });
      }

      if (character && !companion.obtained) {
        console.log(chalk.dim(`\n💡 Tip: Use --obtained to mark this minion as obtained`));
      }

      console.log('');
      service.close();
      return;
    }

    // Search companions by name
    const searchName = nameArg;
    const searchOptions: any = {};

    if (searchName) {
      searchOptions.name = searchName;
    }

    if (options.battle !== undefined) {
      searchOptions.is_battle = options.battle;
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    const results = service.searchCompanions(searchOptions);

    spinner.stop();

    if (results.companions.length === 0) {
      console.log(chalk.yellow('No minions found matching criteria'));
      service.close();
      return;
    }

    // Create table
    const tableHead = character
      ? [chalk.cyan('✓'), chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Battle')]
      : [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Battle')];

    const table = new Table({
      head: tableHead,
      style: {
        head: [],
        border: [],
      },
    });

    results.companions.forEach((companion) => {
      const row = [
        companion.id.toString(),
        companion.singular || companion.name || 'Unknown',
        companion.is_battle ? chalk.green('✓') : chalk.gray('✗'),
      ];

      if (character) {
        row.unshift(companion.obtained ? chalk.green('✓') : chalk.gray('○'));
      }

      table.push(row);
    });

    console.log(
      chalk.bold(`\n🐾 Minions (${results.companions.length}/${results.total} results):\n`)
    );
    console.log(table.toString());

    console.log(chalk.dim(`\n💡 Tip: Use --id <minionId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading minion data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function markMinionObtained(
  profileService: any,
  collectiblesService: CollectiblesService,
  companionId: number,
  note?: string
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const companion = collectiblesService.getCompanionById(companionId);

  if (!companion) {
    console.log(chalk.red(`Minion ${companionId} not found.\n`));
    return;
  }

  collectiblesService.trackObtainedCompanion(parseInt(character.id), companionId, undefined, note);
  console.log(
    chalk.green(`✓ Marked minion "${companion.singular || companion.name}" as obtained!`)
  );

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

// ============================================================================
// ORCHESTRION COMMAND
// ============================================================================

export async function orchestrionCommand(
  nameArg: string | undefined,
  options: CollectibleCommandOptions
): Promise<void> {
  const spinner = ora('Loading orchestrion data...').start();

  try {
    const service = new CollectiblesService();
    const profileService = getPlayerProfileService();
    const character = profileService.getActiveCharacter();

    // Handle specific orchestrion ID lookup
    if (options.id) {
      const orchestrionId = parseInt(options.id);

      // Handle marking as obtained
      if (options.obtained) {
        spinner.stop();
        await markOrchestrionObtained(profileService, service, orchestrionId, options.note);
        service.close();
        return;
      }

      const orchestrion = service.getOrchestrionById(orchestrionId);

      spinner.stop();

      if (!orchestrion) {
        console.log(chalk.yellow(`Orchestrion roll with ID ${orchestrionId} not found`));
        service.close();
        return;
      }

      // Display detailed orchestrion information
      console.log(chalk.cyan.bold(`\n🎵 Orchestrion Roll #${orchestrion.id} - ${orchestrion.name}`));

      if (character) {
        if (orchestrion.obtained) {
          console.log(chalk.green('✓ OBTAINED'));
        } else {
          console.log(chalk.gray('○ Not obtained yet'));
        }
      }

      console.log(chalk.gray('━'.repeat(60)));

      const details: Array<[string, string]> = [
        ['Name', orchestrion.name || 'Unknown'],
        ['Category', orchestrion.category_name || 'Unknown'],
        ['Description', orchestrion.description || 'N/A'],
      ];

      details.forEach(([key, value]) => {
        console.log(`  ${chalk.dim(key + ':')} ${value}`);
      });

      // Show sources
      if (orchestrion.sources && orchestrion.sources.length > 0) {
        console.log(chalk.bold('\n📍 How to Obtain:'));
        orchestrion.sources.forEach((source) => {
          console.log(`  ${chalk.yellow('→')} ${source.source_type}: ${source.source_name || 'Unknown'}`);
        });
      }

      if (character && !orchestrion.obtained) {
        console.log(
          chalk.dim(`\n💡 Tip: Use --obtained to mark this orchestrion roll as obtained`)
        );
      }

      console.log('');
      service.close();
      return;
    }

    // Search orchestrion by name
    const searchName = nameArg;
    const searchOptions: any = {};

    if (searchName) {
      searchOptions.name = searchName;
    }

    searchOptions.limit = options.limit ? parseInt(options.limit) : 20;

    const results = service.searchOrchestrion(searchOptions);

    spinner.stop();

    if (results.orchestrion_rolls.length === 0) {
      console.log(chalk.yellow('No orchestrion rolls found matching criteria'));
      service.close();
      return;
    }

    // Create table
    const tableHead = character
      ? [chalk.cyan('✓'), chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Category')]
      : [chalk.cyan('ID'), chalk.cyan('Name'), chalk.cyan('Category')];

    const table = new Table({
      head: tableHead,
      style: {
        head: [],
        border: [],
      },
    });

    results.orchestrion_rolls.forEach((roll) => {
      const row = [
        roll.id.toString(),
        roll.name || 'Unknown',
        roll.category_name || 'Unknown',
      ];

      if (character) {
        row.unshift(roll.obtained ? chalk.green('✓') : chalk.gray('○'));
      }

      table.push(row);
    });

    console.log(
      chalk.bold(
        `\n🎵 Orchestrion Rolls (${results.orchestrion_rolls.length}/${results.total} results):\n`
      )
    );
    console.log(table.toString());

    console.log(chalk.dim(`\n💡 Tip: Use --id <rollId> to see detailed information\n`));

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading orchestrion data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

async function markOrchestrionObtained(
  profileService: any,
  collectiblesService: CollectiblesService,
  orchestrionId: number,
  note?: string
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const orchestrion = collectiblesService.getOrchestrionById(orchestrionId);

  if (!orchestrion) {
    console.log(chalk.red(`Orchestrion roll ${orchestrionId} not found.\n`));
    return;
  }

  collectiblesService.trackObtainedOrchestrion(parseInt(character.id), orchestrionId, undefined, note);
  console.log(chalk.green(`✓ Marked orchestrion roll "${orchestrion.name}" as obtained!`));

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

// ============================================================================
// COLLECTION STATS COMMAND
// ============================================================================

export async function collectionCommand(): Promise<void> {
  const spinner = ora('Loading collection data...').start();

  try {
    const service = new CollectiblesService();
    const profileService = getPlayerProfileService();
    const character = profileService.getActiveCharacter();

    if (!character) {
      spinner.stop();
      console.log(chalk.red('No active character.'));
      console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
      service.close();
      return;
    }

    const stats = service.getCollectionStats(parseInt(character.id));

    spinner.stop();

    console.log(chalk.cyan.bold(`\n📊 Collection Progress for ${character.name}\n`));
    console.log(chalk.gray('━'.repeat(60)));

    // Mounts
    console.log(chalk.bold('\n🐴 Mounts:'));
    console.log(
      `  ${chalk.dim('Progress:')} ${chalk.green(stats.mounts.obtained)}/${stats.mounts.total} (${stats.mounts.progress_percentage}%)`
    );
    console.log(`  ${chalk.dim('Flying Mounts:')} ${stats.mounts.flying}`);
    console.log(`  ${chalk.dim('Multi-Seat Mounts:')} ${stats.mounts.multi_seat}`);

    // Progress bar
    const mountBar = generateProgressBar(stats.mounts.progress_percentage);
    console.log(`  ${mountBar}`);

    // Companions
    console.log(chalk.bold('\n🐾 Minions:'));
    console.log(
      `  ${chalk.dim('Progress:')} ${chalk.green(stats.companions.obtained)}/${stats.companions.total} (${stats.companions.progress_percentage}%)`
    );
    console.log(`  ${chalk.dim('Battle Minions:')} ${stats.companions.battle}`);

    // Progress bar
    const companionBar = generateProgressBar(stats.companions.progress_percentage);
    console.log(`  ${companionBar}`);

    // Orchestrion
    console.log(chalk.bold('\n🎵 Orchestrion Rolls:'));
    console.log(
      `  ${chalk.dim('Progress:')} ${chalk.green(stats.orchestrion.obtained)}/${stats.orchestrion.total} (${stats.orchestrion.progress_percentage}%)`
    );

    // Progress bar
    const orchestrionBar = generateProgressBar(stats.orchestrion.progress_percentage);
    console.log(`  ${orchestrionBar}`);

    console.log('');

    service.close();
  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Error loading collection data:'));
    if (error instanceof Error) {
      console.error(chalk.red(`  ${error.message}`));
    }
    process.exit(1);
  }
}

function generateProgressBar(percentage: number, width: number = 30): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar =
    chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));

  return `[${bar}] ${percentage.toFixed(1)}%`;
}

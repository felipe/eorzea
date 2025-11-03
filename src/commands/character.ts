import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getLodestoneClient } from '../services/lodestone.js';
import { getPlayerProfileService } from '../services/playerProfile.js';
import { getConfig } from '../utils/config.js';

export interface CharacterCommandOptions {
  name?: string;
  server?: string;
  id?: string;
  // Profile management
  add?: boolean;
  list?: boolean;
  active?: boolean;
  switch?: string;
  remove?: string;
  sync?: boolean;
}

export async function characterCommand(options: CharacterCommandOptions): Promise<void> {
  // Handle profile management commands
  if (options.add) {
    await addCharacterToProfile(options);
    return;
  }

  if (options.list) {
    listCharacters();
    return;
  }

  if (options.active) {
    showActiveCharacter();
    return;
  }

  if (options.switch) {
    switchActiveCharacter(options.switch);
    return;
  }

  if (options.remove) {
    removeCharacter(options.remove);
    return;
  }

  if (options.sync) {
    await syncCharacter(options.id);
    return;
  }

  // Original lookup functionality (Lodestone search)
  await lookupCharacter(options);
}

/**
 * Add a character to the profile (requires internet)
 */
async function addCharacterToProfile(options: CharacterCommandOptions): Promise<void> {
  const profileService = getPlayerProfileService();

  if (!options.name) {
    console.log(chalk.red('Error: Character name is required'));
    console.log(
      chalk.yellow('Usage: eorzea character --add --name "Character Name" --server "ServerName"')
    );
    return;
  }

  if (!options.server) {
    console.log(chalk.red('Error: Server name is required'));
    console.log(
      chalk.yellow('Usage: eorzea character --add --name "Character Name" --server "ServerName"')
    );
    return;
  }

  const spinner = ora(`Adding character "${options.name}" from ${options.server}...`).start();

  try {
    const character = await profileService.createCharacter(options.name, options.server);

    spinner.succeed(chalk.green(`Character "${character.name}" added successfully!`));

    console.log(chalk.bold.cyan('\n=== Character Added ===\n'));
    console.log(`${chalk.bold('Name:')} ${character.name}`);
    console.log(
      `${chalk.bold('Server:')} ${character.server} ${character.dataCenter ? `(${character.dataCenter})` : ''}`
    );
    console.log(`${chalk.bold('Lodestone ID:')} ${character.id}`);
    console.log(`${chalk.bold('Active:')} ${character.isActive ? chalk.green('Yes') : 'No'}`);

    if (character.title) {
      console.log(`${chalk.bold('Title:')} ${character.title}`);
    }

    if (character.freeCompany) {
      console.log(`${chalk.bold('Free Company:')} ${character.freeCompany}`);
    }

    // Show job levels
    const jobs = profileService.getJobProgress(character.id);
    if (jobs.length > 0) {
      console.log(chalk.bold.cyan('\n=== Job Levels (Synced) ===\n'));
      const topJobs = jobs.slice(0, 10);
      topJobs.forEach((job) => {
        console.log(`  ${job.jobName}: ${chalk.green(job.level)}`);
      });
      if (jobs.length > 10) {
        console.log(chalk.gray(`  ... and ${jobs.length - 10} more`));
      }
    }

    console.log(chalk.bold.green('\n✓ Character ready! All progress tracking now works offline.'));
    console.log(chalk.yellow('  Use "eorzea sync" to update job levels from Lodestone later.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to add character'));

    const errorMessage = (error as Error).message;
    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      console.error(chalk.yellow('\n⚠️  Cannot add character: No internet connection'));
      console.error(chalk.yellow('   Character data must be fetched from Lodestone.'));
      console.error(chalk.yellow('   Please connect to the internet and try again.\n'));
    } else {
      console.error(chalk.red(`\n${errorMessage}\n`));
    }
  }
}

/**
 * List all characters in profile
 */
function listCharacters(): void {
  const profileService = getPlayerProfileService();
  const characters = profileService.listCharacters();

  if (characters.length === 0) {
    console.log(chalk.yellow('No characters in your profile.'));
    console.log(
      chalk.gray('Use "eorzea character --add --name <name> --server <server>" to add one.\n')
    );
    return;
  }

  console.log(chalk.bold.cyan('\n=== Your Characters ===\n'));

  const table = new Table({
    head: ['Active', 'Name', 'Server', 'DC', 'Jobs', 'Last Sync'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
  });

  characters.forEach((character) => {
    const jobs = profileService.getJobProgress(character.id);
    const topJob = jobs.length > 0 ? `${jobs[0].jobName} ${jobs[0].level}` : 'None';
    const lastSync = character.lastSyncedAt ? formatRelativeTime(character.lastSyncedAt) : 'Never';

    table.push([
      character.isActive ? chalk.green('★') : '',
      character.name,
      character.server,
      character.dataCenter || 'N/A',
      topJob,
      lastSync,
    ]);
  });

  console.log(table.toString());
  console.log(
    chalk.gray('\nTip: Use "eorzea character --switch <name>" to switch active character\n')
  );
}

/**
 * Show active character details
 */
function showActiveCharacter(): void {
  const profileService = getPlayerProfileService();
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.yellow('No active character.'));
    console.log(
      chalk.gray('Use "eorzea character --add --name <name> --server <server>" to add one.\n')
    );
    return;
  }

  console.log(chalk.bold.cyan('\n=== Active Character ===\n'));
  console.log(`${chalk.bold('Name:')} ${character.name}`);
  console.log(
    `${chalk.bold('Server:')} ${character.server} ${character.dataCenter ? `(${character.dataCenter})` : ''}`
  );
  console.log(`${chalk.bold('Lodestone ID:')} ${character.id}`);

  if (character.title) {
    console.log(`${chalk.bold('Title:')} ${character.title}`);
  }

  if (character.freeCompany) {
    console.log(`${chalk.bold('Free Company:')} ${character.freeCompany}`);
  }

  if (character.lastSyncedAt) {
    console.log(`${chalk.bold('Last Synced:')} ${formatRelativeTime(character.lastSyncedAt)}`);
  }

  // Show top jobs
  const jobs = profileService.getTopJobs(character.id, 10);
  if (jobs.length > 0) {
    console.log(chalk.bold.cyan('\n=== Top Jobs ===\n'));
    jobs.forEach((job) => {
      console.log(`  ${job.jobName}: ${chalk.green(job.level)}`);
    });
  }

  // Show some stats
  const stats = profileService.getProgressStats(character.id, 5);
  console.log(chalk.bold.cyan('\n=== Progress ===\n'));
  console.log(
    `Quests Completed: ${chalk.green(stats.completedQuests)} / ${stats.totalQuests} (${stats.questCompletionPercentage.toFixed(1)}%)`
  );
  console.log(
    `Fish Caught: ${chalk.green(stats.caughtFish)} / ${stats.totalFish} (${stats.fishCompletionPercentage.toFixed(1)}%)`
  );
  console.log(`Big Fish: ${chalk.green(stats.bigFishCaught)} / ${stats.totalBigFish}`);

  console.log('');
}

/**
 * Switch active character
 */
function switchActiveCharacter(nameOrId: string): void {
  const profileService = getPlayerProfileService();
  const characters = profileService.listCharacters();

  // Try to find by name or ID
  const character = characters.find(
    (c) => c.name.toLowerCase() === nameOrId.toLowerCase() || c.id === nameOrId
  );

  if (!character) {
    console.log(chalk.red(`Character "${nameOrId}" not found.`));
    console.log(chalk.yellow('Use "eorzea character --list" to see all characters.\n'));
    return;
  }

  profileService.setActiveCharacter(character.id);
  console.log(
    chalk.green(`✓ Active character switched to: ${character.name} (${character.server})\n`)
  );
}

/**
 * Remove a character
 */
function removeCharacter(nameOrId: string): void {
  const profileService = getPlayerProfileService();
  const characters = profileService.listCharacters();

  // Try to find by name or ID
  const character = characters.find(
    (c) => c.name.toLowerCase() === nameOrId.toLowerCase() || c.id === nameOrId
  );

  if (!character) {
    console.log(chalk.red(`Character "${nameOrId}" not found.`));
    console.log(chalk.yellow('Use "eorzea character --list" to see all characters.\n'));
    return;
  }

  profileService.removeCharacter(character.id);
  console.log(chalk.green(`✓ Character "${character.name}" removed from profile.\n`));
}

/**
 * Sync character data from Lodestone
 */
async function syncCharacter(characterId?: string): Promise<void> {
  const profileService = getPlayerProfileService();

  let character;
  if (characterId) {
    character = profileService.getCharacterById(characterId);
  } else {
    character = profileService.getActiveCharacter();
  }

  if (!character) {
    console.log(chalk.red('No character to sync.'));
    console.log(chalk.yellow('Use --id <lodestone_id> or set an active character.\n'));
    return;
  }

  const spinner = ora(`Syncing ${character.name} from Lodestone...`).start();

  try {
    const result = await profileService.syncCharacterFromLodestone(character.id);

    spinner.succeed(chalk.green(`Character "${character.name}" synced successfully!`));

    console.log(chalk.bold.cyan('\n=== Sync Results ===\n'));
    console.log(`${chalk.bold('Last Synced:')} ${result.lastSyncedAt.toLocaleString()}`);
    console.log(`${chalk.bold('Jobs Updated:')} ${result.changes.jobsUpdated}`);

    if (result.changes.newJobs.length > 0) {
      console.log(chalk.bold.green('\nNew Jobs:'));
      result.changes.newJobs.forEach((job) => {
        console.log(`  + ${job}`);
      });
    }

    if (result.changes.levelChanges.length > 0) {
      console.log(chalk.bold.cyan('\nLevel Changes:'));
      result.changes.levelChanges.forEach((change) => {
        const diff = change.newLevel - change.oldLevel;
        const arrow = diff > 0 ? chalk.green('↑') : chalk.red('↓');
        console.log(
          `  ${change.jobName}: ${change.oldLevel} → ${change.newLevel} ${arrow} ${Math.abs(diff)}`
        );
      });
    }

    if (result.changes.jobsUpdated === 0) {
      console.log(chalk.gray('No changes detected.'));
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to sync character'));

    const errorMessage = (error as Error).message;
    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      console.error(chalk.yellow('\n⚠️  Cannot sync: No internet connection'));
      console.error(
        chalk.yellow(`   Using cached data from ${formatRelativeTime(character.lastSyncedAt!)}`)
      );
      console.error(chalk.yellow('   Your progress tracking still works offline!\n'));
    } else {
      console.error(chalk.red(`\n${errorMessage}\n`));
    }
  }
}

/**
 * Original Lodestone lookup (read-only, doesn't save to profile)
 */
async function lookupCharacter(options: CharacterCommandOptions): Promise<void> {
  const config = getConfig().get();
  const lodestoneClient = getLodestoneClient();

  // Use provided values or fall back to config defaults
  const characterName = options.name || config.character.defaultName;
  const serverName = options.server || config.character.defaultServer;

  // If ID is provided, fetch character directly
  if (options.id) {
    await fetchCharacterById(lodestoneClient, options.id);
    return;
  }

  // Search for character by name
  if (!characterName) {
    console.log(chalk.yellow('No search criteria provided.'));
    console.log(chalk.gray('\nAvailable commands:'));
    console.log(
      chalk.gray(
        '  eorzea character --add --name <name> --server <server>  Add character to profile'
      )
    );
    console.log(
      chalk.gray('  eorzea character --list                                 List all characters')
    );
    console.log(
      chalk.gray('  eorzea character --active                               Show active character')
    );
    console.log(
      chalk.gray(
        '  eorzea character --switch <name>                        Switch active character'
      )
    );
    console.log(
      chalk.gray('  eorzea character --sync                                 Sync from Lodestone')
    );
    console.log(
      chalk.gray('  eorzea character --name <name> --server <server>        Search Lodestone\n')
    );
    return;
  }

  const spinner = ora(`Searching for character: ${characterName}`).start();

  try {
    const searchResults = await lodestoneClient.searchCharacter(characterName, serverName);

    if (!searchResults.characters || searchResults.characters.length === 0) {
      spinner.fail(chalk.red('No characters found'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${searchResults.characters.length} character(s)`));

    // Display search results in a table
    const table = new Table({
      head: ['ID', 'Name', 'Server', 'DC'].map((h) => chalk.cyan(h)),
      style: {
        head: [],
        border: [],
      },
    });

    searchResults.characters.forEach((character) => {
      table.push([character.id, character.name, character.server, character.dataCenter || 'N/A']);
    });

    console.log('\n' + table.toString());

    // If only one result, fetch full details
    if (searchResults.characters.length === 1) {
      console.log(chalk.yellow('\nFetching character details...\n'));
      await fetchCharacterById(lodestoneClient, searchResults.characters[0].id);
    } else {
      console.log(
        chalk.yellow('\nTip: Use --id <ID> to view detailed information for a specific character')
      );
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to search for character'));

    // Check for network errors (offline)
    const errorMessage = (error as Error).message;
    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      console.error(chalk.yellow('\n⚠️  Character lookup is not available offline'));
      console.error(
        chalk.yellow('   This feature requires an internet connection to access Lodestone.')
      );
    } else {
      console.error(chalk.red(errorMessage));
    }
  }
}

async function fetchCharacterById(lodestoneClient: any, characterId: string): Promise<void> {
  const spinner = ora(`Fetching character details for ID: ${characterId}`).start();

  try {
    const character = await lodestoneClient.getCharacter(characterId);

    if (!character) {
      spinner.fail(chalk.red('Character not found'));
      return;
    }

    spinner.succeed(chalk.green('Character details retrieved'));

    // Display character information
    console.log(chalk.bold.cyan('\n=== Character Information ===\n'));
    console.log(`${chalk.bold('Name:')} ${character.name}`);
    console.log(
      `${chalk.bold('Server:')} ${character.server} ${character.dataCenter ? `(${character.dataCenter})` : ''}`
    );

    if (character.job && character.level) {
      console.log(`${chalk.bold('Active Class/Job:')} ${character.job} (Level ${character.level})`);
    }

    if (character.title) {
      console.log(`${chalk.bold('Title:')} ${character.title}`);
    }

    if (character.freeCompany) {
      console.log(`${chalk.bold('Free Company:')} ${character.freeCompany}`);
    }

    // Fetch and display all class/job levels
    try {
      const classJobs = await lodestoneClient.getCharacterClassJobs(characterId);

      if (classJobs) {
        console.log(chalk.bold.cyan('\n=== Class/Job Levels ===\n'));

        // Display combat jobs
        const combatJobs = [
          'Paladin',
          'Warrior',
          'DarkKnight',
          'Gunbreaker',
          'WhiteMage',
          'Scholar',
          'Astrologian',
          'Sage',
          'Monk',
          'Dragoon',
          'Ninja',
          'Samurai',
          'Reaper',
          'Bard',
          'Machinist',
          'Dancer',
          'BlackMage',
          'Summoner',
          'RedMage',
          'BlueMage',
        ];
        const crafters = [
          'Carpenter',
          'Blacksmith',
          'Armorer',
          'Goldsmith',
          'Leatherworker',
          'Weaver',
          'Alchemist',
          'Culinarian',
        ];
        const gatherers = ['Miner', 'Botanist', 'Fisher'];

        const displayJobs = (title: string, jobs: string[]) => {
          const leveled = jobs.filter(
            (job) => classJobs[job]?.Level && parseInt(classJobs[job].Level) > 0
          );
          if (leveled.length > 0) {
            console.log(chalk.bold(`${title}:`));
            leveled.forEach((job) => {
              const level = classJobs[job].Level || '0';
              console.log(`  ${job}: ${chalk.green(level)}`);
            });
            console.log('');
          }
        };

        displayJobs('Combat Jobs', combatJobs);
        displayJobs('Crafters', crafters);
        displayJobs('Gatherers', gatherers);
      }
    } catch (error) {
      // Silently fail if class/job data isn't available
      console.log(chalk.yellow('Note: Could not fetch detailed class/job information'));
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch character details'));

    // Check for network errors (offline)
    const errorMessage = (error as Error).message;
    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')
    ) {
      console.error(chalk.yellow('\n⚠️  Character lookup is not available offline'));
      console.error(
        chalk.yellow('   This feature requires an internet connection to access Lodestone.')
      );
    } else {
      console.error(chalk.red(errorMessage));
    }
  }
}

/**
 * Format a date as relative time
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

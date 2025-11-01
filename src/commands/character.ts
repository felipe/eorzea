import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getLodestoneClient } from '../services/lodestone.js';
import { getConfig } from '../utils/config.js';

export interface CharacterCommandOptions {
  name?: string;
  server?: string;
  id?: string;
}

export async function characterCommand(options: CharacterCommandOptions): Promise<void> {
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
    console.log(chalk.red('Error: Character name is required'));
    console.log(chalk.yellow('Use --name <name> or set DEFAULT_CHARACTER_NAME in your .env file'));
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
          'Darkknight',
          'Gunbreaker',
          'Whitemage',
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
          'Blackmage',
          'Summoner',
          'Redmage',
          'Bluemage',
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

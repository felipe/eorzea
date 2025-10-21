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
    console.log(
      chalk.yellow('Use --name <name> or set DEFAULT_CHARACTER_NAME in your .env file')
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
    console.error(chalk.red((error as Error).message));
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
    console.log(`${chalk.bold('Server:')} ${character.server} ${character.dataCenter ? `(${character.dataCenter})` : ''}`);

    if (character.job && character.level) {
      console.log(`${chalk.bold('Active Class/Job:')} ${character.job} (Level ${character.level})`);
    }

    if (character.title) {
      console.log(`${chalk.bold('Title:')} ${character.title}`);
    }

    if (character.freeCompany) {
      console.log(`${chalk.bold('Free Company:')} ${character.freeCompany}`);
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch character details'));
    console.error(chalk.red((error as Error).message));
  }
}

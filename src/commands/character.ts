import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getXIVAPIClient } from '../services/xivapi.js';
import { getConfig } from '../utils/config.js';

export interface CharacterCommandOptions {
  name?: string;
  server?: string;
  id?: string;
}

export async function characterCommand(options: CharacterCommandOptions): Promise<void> {
  const config = getConfig().get();
  const apiClient = getXIVAPIClient({
    apiKey: config.xivapi.apiKey,
    rateLimitMs: config.xivapi.rateLimitMs,
  });

  // Use provided values or fall back to config defaults
  const characterName = options.name || config.character.defaultName;
  const serverName = options.server || config.character.defaultServer;

  // If ID is provided, fetch character directly
  if (options.id) {
    await fetchCharacterById(apiClient, parseInt(options.id, 10));
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
    const searchResults = await apiClient.searchCharacter(characterName, serverName);

    if (!searchResults.Results || searchResults.Results.length === 0) {
      spinner.fail(chalk.red('No characters found'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${searchResults.Results.length} character(s)`));

    // Display search results in a table
    const table = new Table({
      head: ['ID', 'Name', 'Server', 'DC'].map((h) => chalk.cyan(h)),
      style: {
        head: [],
        border: [],
      },
    });

    searchResults.Results.forEach((result: any) => {
      table.push([result.ID, result.Name, result.Server, result.DC || 'N/A']);
    });

    console.log('\n' + table.toString());

    // If only one result, fetch full details
    if (searchResults.Results.length === 1) {
      console.log(chalk.yellow('\nFetching character details...\n'));
      await fetchCharacterById(apiClient, searchResults.Results[0].ID);
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

async function fetchCharacterById(apiClient: any, characterId: number): Promise<void> {
  const spinner = ora(`Fetching character details for ID: ${characterId}`).start();

  try {
    const characterData = await apiClient.getCharacter(characterId);

    if (!characterData || !characterData.Character) {
      spinner.fail(chalk.red('Character not found'));
      return;
    }

    spinner.succeed(chalk.green('Character details retrieved'));

    const char = characterData.Character;

    // Display character information
    console.log(chalk.bold.cyan('\n=== Character Information ===\n'));
    console.log(`${chalk.bold('Name:')} ${char.Name}`);
    console.log(`${chalk.bold('Server:')} ${char.Server} (${char.DC})`);
    console.log(
      `${chalk.bold('Active Class/Job:')} ${char.ActiveClassJob?.Name || 'N/A'} (Level ${char.ActiveClassJob?.Level || 'N/A'})`
    );

    // Display minions, mounts, title if available
    if (characterData.Minions) {
      console.log(`${chalk.bold('Minions:')} ${characterData.Minions.length}`);
    }
    if (characterData.Mounts) {
      console.log(`${chalk.bold('Mounts:')} ${characterData.Mounts.length}`);
    }
    if (char.Title) {
      console.log(`${chalk.bold('Title:')} ${char.Title.Name || 'None'}`);
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch character details'));
    console.error(chalk.red((error as Error).message));
  }
}

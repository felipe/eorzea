import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { getXIVAPIClient } from '../services/xivapi.js';
import { getConfig } from '../utils/config.js';

export interface QuestCommandOptions {
  list?: boolean;
  search?: string;
  level?: string;
  id?: string;
}

export async function questCommand(options: QuestCommandOptions): Promise<void> {
  const config = getConfig().get();
  const apiClient = getXIVAPIClient({
    apiKey: config.xivapi.apiKey,
    rateLimitMs: config.xivapi.rateLimitMs,
  });

  // Get quest by ID
  if (options.id) {
    await fetchQuestById(apiClient, parseInt(options.id, 10));
    return;
  }

  // Search quests by query
  if (options.search) {
    await searchQuests(apiClient, options.search);
    return;
  }

  // List quests by level
  if (options.level) {
    await listQuestsByLevel(apiClient, parseInt(options.level, 10));
    return;
  }

  // Default: show usage
  console.log(chalk.yellow('Please specify an action:'));
  console.log(chalk.cyan('  --search <query>') + '  Search for quests by name');
  console.log(chalk.cyan('  --level <level>') + '   List quests for a specific level');
  console.log(chalk.cyan('  --id <id>') + '         Get details for a specific quest');
}

async function searchQuests(apiClient: any, query: string): Promise<void> {
  const spinner = ora(`Searching for quests: ${query}`).start();

  try {
    const results = await apiClient.searchQuests(query);

    if (!results.Results || results.Results.length === 0) {
      spinner.fail(chalk.red('No quests found'));
      return;
    }

    spinner.succeed(
      chalk.green(`Found ${results.Results.length} quest(s) (Page 1 of ${results.Pagination.PageTotal})`)
    );

    displayQuestTable(results.Results);

    if (results.Pagination.PageTotal > 1) {
      console.log(
        chalk.yellow(
          `\nShowing page 1 of ${results.Pagination.PageTotal}. Total results: ${results.Pagination.ResultsTotal}`
        )
      );
    }

    console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to search quests'));
    console.error(chalk.red((error as Error).message));
  }
}

async function listQuestsByLevel(apiClient: any, level: number): Promise<void> {
  const spinner = ora(`Finding quests for level ${level}`).start();

  try {
    const results = await apiClient.getQuestsByLevel(level);

    if (!results.Results || results.Results.length === 0) {
      spinner.fail(chalk.red(`No quests found for level ${level}`));
      return;
    }

    spinner.succeed(chalk.green(`Found ${results.Results.length} quest(s) for level ${level}`));

    displayQuestTable(results.Results);

    console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch quests'));
    console.error(chalk.red((error as Error).message));
  }
}

async function fetchQuestById(apiClient: any, questId: number): Promise<void> {
  const spinner = ora(`Fetching quest details for ID: ${questId}`).start();

  try {
    const quest = await apiClient.getQuest(questId);

    if (!quest) {
      spinner.fail(chalk.red('Quest not found'));
      return;
    }

    spinner.succeed(chalk.green('Quest details retrieved'));

    // Display quest information
    console.log(chalk.bold.cyan('\n=== Quest Information ===\n'));
    console.log(`${chalk.bold('Name:')} ${quest.Name || 'Unknown'}`);
    console.log(`${chalk.bold('ID:')} ${quest.ID}`);
    console.log(`${chalk.bold('Level:')} ${quest.ClassJobLevel0 || quest.Level || 'N/A'}`);

    if (quest.JournalGenre?.Name) {
      console.log(`${chalk.bold('Type:')} ${quest.JournalGenre.Name}`);
    }

    if (quest.PlaceName?.Name) {
      console.log(`${chalk.bold('Location:')} ${quest.PlaceName.Name}`);
    }

    if (quest.IssuerLocation) {
      console.log(
        `${chalk.bold('Start Location:')} X: ${quest.IssuerLocation.X.toFixed(1)}, Y: ${quest.IssuerLocation.Y.toFixed(1)}`
      );
    }

    // Display quest description if available
    if (quest.GameContentLinks) {
      console.log(chalk.bold('\nQuest Chain:'));
      console.log(chalk.dim('This quest is part of a larger quest chain'));
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch quest details'));
    console.error(chalk.red((error as Error).message));
  }
}

function displayQuestTable(quests: any[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Level', 'Type', 'Location'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 40, 8, 20, 25],
  });

  quests.forEach((quest: any) => {
    table.push([
      quest.ID,
      quest.Name || 'Unknown',
      quest.ClassJobLevel0 || quest.Level || 'N/A',
      quest.JournalGenre?.Name || 'N/A',
      quest.PlaceName?.Name || 'N/A',
    ]);
  });

  console.log('\n' + table.toString());
}

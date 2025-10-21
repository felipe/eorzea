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
    language: 'en',
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

    if (!results.results || results.results.length === 0) {
      spinner.fail(chalk.red('No quests found'));
      return;
    }

    spinner.succeed(
      chalk.green(`Found ${results.results.length} quest(s)`)
    );

    displayQuestTableV2(results.results);

    if (results.next) {
      console.log(
        chalk.yellow(
          `\nMore results available. Use the 'next' cursor to fetch additional pages.`
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

    if (!results.results || results.results.length === 0) {
      spinner.fail(chalk.red(`No quests found for level ${level}`));
      return;
    }

    spinner.succeed(chalk.green(`Found ${results.results.length} quest(s) for level ${level}`));

    displayQuestTableV2(results.results);

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

    if (!quest || !quest.fields) {
      spinner.fail(chalk.red('Quest not found'));
      return;
    }

    spinner.succeed(chalk.green('Quest details retrieved'));

    // Display quest information (V2 API format)
    console.log(chalk.bold.cyan('\n=== Quest Information ===\n'));
    console.log(`${chalk.bold('Name:')} ${quest.fields.Name || 'Unknown'}`);
    console.log(`${chalk.bold('ID:')} ${quest.row_id}`);
    console.log(`${chalk.bold('Level:')} ${quest.fields.ClassJobLevel0 || 'N/A'}`);

    if (quest.fields.JournalGenre?.fields?.Name) {
      console.log(`${chalk.bold('Type:')} ${quest.fields.JournalGenre.fields.Name}`);
    }

    if (quest.fields.PlaceName?.fields?.Name) {
      console.log(`${chalk.bold('Location:')} ${quest.fields.PlaceName.fields.Name}`);
    }

    if (quest.fields.IssuerLocation?.fields) {
      const loc = quest.fields.IssuerLocation.fields;
      console.log(
        `${chalk.bold('Start Location:')} X: ${loc.X?.toFixed(1) || 'N/A'}, Y: ${loc.Y?.toFixed(1) || 'N/A'}`
      );
    }

    // Show additional quest information
    if (quest.fields.GilReward) {
      console.log(`${chalk.bold('Gil Reward:')} ${quest.fields.GilReward}`);
    }

    if (quest.fields.ExpFactor) {
      console.log(`${chalk.bold('Experience Factor:')} ${quest.fields.ExpFactor}`);
    }

    if (quest.fields.IsRepeatable !== undefined) {
      console.log(`${chalk.bold('Repeatable:')} ${quest.fields.IsRepeatable ? 'Yes' : 'No'}`);
    }

    if (quest.fields.Expansion?.fields?.Name) {
      console.log(`${chalk.bold('Expansion:')} ${quest.fields.Expansion.fields.Name}`);
    }

    if (quest.fields.ItemRewardType && Array.isArray(quest.fields.ItemRewardType)) {
      const items = quest.fields.ItemRewardType.filter((item: any) => item?.value > 0);
      if (items.length > 0) {
        console.log(`${chalk.bold('Item Rewards:')} ${items.length} item(s)`);
      }
    }

    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch quest details'));
    console.error(chalk.red((error as Error).message));
  }
}

function displayQuestTableV2(quests: any[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Level', 'Type', 'Location'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 40, 8, 20, 25],
  });

  quests.forEach((quest: any) => {
    const fields = quest.fields || {};
    table.push([
      quest.row_id || 'N/A',
      fields.Name || 'Unknown',
      fields.ClassJobLevel0 || 'N/A',
      fields.JournalGenre?.fields?.Name || 'N/A',
      fields.PlaceName?.fields?.Name || 'N/A',
    ]);
  });

  console.log('\n' + table.toString());
}

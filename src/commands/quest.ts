import chalk from 'chalk';
import Table from 'cli-table3';
import { QuestTrackerService } from '../services/questTracker.js';

export interface QuestCommandOptions {
  list?: boolean;
  search?: string;
  level?: string;
  id?: string;
}

export async function questCommand(options: QuestCommandOptions): Promise<void> {
  const questTracker = new QuestTrackerService();

  try {
    // Get quest by ID
    if (options.id) {
      await fetchQuestById(questTracker, parseInt(options.id, 10));
      return;
    }

    // Search quests by query
    if (options.search) {
      await searchQuests(questTracker, options.search);
      return;
    }

    // List quests by level
    if (options.level) {
      await listQuestsByLevel(questTracker, parseInt(options.level, 10));
      return;
    }

    // Default: show usage
    console.log(chalk.yellow('Please specify an action:'));
    console.log(chalk.cyan('  --search <query>') + '  Search for quests by name');
    console.log(chalk.cyan('  --level <level>') + '   List quests for a specific level');
    console.log(chalk.cyan('  --id <id>') + '         Get details for a specific quest');
  } finally {
    questTracker.close();
  }
}

async function searchQuests(questTracker: QuestTrackerService, query: string): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Searching for quests: "${query}"\n`));

  const results = questTracker.searchByName(query, 20);

  if (!results || results.length === 0) {
    console.log(chalk.red('No quests found'));
    return;
  }

  console.log(chalk.green(`Found ${results.length} quest(s)\n`));

  displayQuestTable(results);

  console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
}

async function listQuestsByLevel(questTracker: QuestTrackerService, level: number): Promise<void> {
  console.log(chalk.cyan(`\n📋 Finding quests for level ${level}\n`));

  // Get quests within ±2 levels for better results
  const results = questTracker.getQuestsByLevelRange(level - 2, level + 2);

  if (!results || results.length === 0) {
    console.log(chalk.red(`No quests found for level ${level}`));
    return;
  }

  console.log(
    chalk.green(`Found ${results.length} quest(s) for levels ${level - 2}-${level + 2}\n`)
  );

  displayQuestTable(results);

  console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
}

async function fetchQuestById(questTracker: QuestTrackerService, questId: number): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Fetching quest details for ID: ${questId}\n`));

  const quest = questTracker.getQuestById(questId);

  if (!quest) {
    console.log(chalk.red('Quest not found'));
    return;
  }

  // Display quest information
  console.log(chalk.bold.cyan('=== Quest Information ===\n'));
  console.log(`${chalk.bold('Name:')} ${quest.name}`);
  console.log(`${chalk.bold('ID:')} ${quest.id}`);

  if (quest.internalId) {
    console.log(`${chalk.bold('Internal ID:')} ${quest.internalId}`);
  }

  // Level information
  if (quest.level) {
    const displayLevel = quest.level + (quest.levelOffset || 0);
    console.log(`${chalk.bold('Level Required:')} ${displayLevel}`);
  }

  if (quest.classJobCategoryId) {
    console.log(`${chalk.bold('Class/Job Category ID:')} ${quest.classJobCategoryId}`);
  }

  if (quest.classJobRequiredId) {
    console.log(`${chalk.bold('Required Class/Job ID:')} ${quest.classJobRequiredId}`);
  }

  if (quest.journalGenreId) {
    console.log(`${chalk.bold('Quest Type ID:')} ${quest.journalGenreId}`);
  }

  if (quest.placeNameId) {
    console.log(`${chalk.bold('Location ID:')} ${quest.placeNameId}`);
  }

  if (quest.expansionId) {
    console.log(`${chalk.bold('Expansion ID:')} ${quest.expansionId}`);
  }

  // Prerequisites
  if (quest.previousQuests && quest.previousQuests.length > 0) {
    console.log(chalk.bold('\nPrerequisites:'));
    quest.previousQuests.forEach((prereqId: number) => {
      const prereq = questTracker.getQuestById(prereqId);
      const prereqName = prereq?.name || 'Unknown Quest';
      console.log(`  ${chalk.yellow('→')} ${prereqName} ${chalk.dim(`(ID: ${prereqId})`)}`);
    });
  }

  // Rewards section
  if (quest.gilReward || quest.expFactor) {
    console.log(chalk.bold('\nRewards:'));

    if (quest.gilReward) {
      console.log(`  ${chalk.yellow('Gil:')} ${quest.gilReward.toLocaleString()}`);
    }

    if (quest.expFactor) {
      console.log(`  ${chalk.blue('Experience Factor:')} ${quest.expFactor}`);
    }
  }

  // Additional info
  console.log(chalk.bold('\nAdditional Info:'));

  if (quest.isRepeatable !== undefined) {
    console.log(
      `  ${chalk.bold('Repeatable:')} ${quest.isRepeatable ? chalk.green('Yes') : chalk.gray('No')}`
    );
  }

  if (quest.canCancel !== undefined) {
    console.log(
      `  ${chalk.bold('Can Cancel:')} ${quest.canCancel ? chalk.green('Yes') : chalk.gray('No')}`
    );
  }

  console.log('');
}

function displayQuestTable(quests: any[]): void {
  const table = new Table({
    head: ['ID', 'Name', 'Level', 'Type ID', 'Location ID'].map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: [10, 50, 8, 10, 12],
  });

  quests.forEach((quest: any) => {
    const displayLevel = quest.level + (quest.levelOffset || 0);
    table.push([
      quest.id || 'N/A',
      quest.name || 'Unknown',
      displayLevel || 'N/A',
      quest.journalGenreId || 'N/A',
      quest.placeNameId || 'N/A',
    ]);
  });

  console.log(table.toString());
}

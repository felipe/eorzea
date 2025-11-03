import chalk from 'chalk';
import Table from 'cli-table3';
import { QuestTrackerService } from '../services/questTracker.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface QuestCommandOptions {
  list?: boolean;
  search?: string;
  level?: string;
  id?: string;
  // Progress tracking
  complete?: boolean;
  incomplete?: boolean;
  note?: string;
  showCompleted?: boolean;
  showIncomplete?: boolean;
}

export async function questCommand(options: QuestCommandOptions): Promise<void> {
  const questTracker = new QuestTrackerService();
  const profileService = getPlayerProfileService();

  try {
    // Get quest by ID
    if (options.id) {
      const questId = parseInt(options.id, 10);

      // Handle completion tracking
      if (options.complete) {
        await markQuestComplete(profileService, questTracker, questId, options.note);
        return;
      }

      if (options.incomplete) {
        await markQuestIncomplete(profileService, questTracker, questId);
        return;
      }

      // Show quest details
      await fetchQuestById(questTracker, profileService, questId);
      return;
    }

    // Search quests by query
    if (options.search) {
      await searchQuests(questTracker, profileService, options.search, options);
      return;
    }

    // List quests by level
    if (options.level) {
      await listQuestsByLevel(questTracker, profileService, parseInt(options.level, 10), options);
      return;
    }

    // Default: show usage
    console.log(chalk.yellow('Please specify an action:'));
    console.log(chalk.cyan('  --search <query>') + '      Search for quests by name');
    console.log(chalk.cyan('  --level <level>') + '       List quests for a specific level');
    console.log(chalk.cyan('  --id <id>') + '             Get details for a specific quest');
    console.log(chalk.cyan('  --id <id> --complete') + '  Mark quest as complete');
    console.log(chalk.cyan('  --id <id> --incomplete') + 'Mark quest as incomplete');
    console.log(chalk.cyan('  --show-completed') + '      Filter completed quests');
    console.log(chalk.cyan('  --show-incomplete') + '     Filter incomplete quests');
  } finally {
    questTracker.close();
  }
}

async function markQuestComplete(
  profileService: any,
  questTracker: QuestTrackerService,
  questId: number,
  note?: string
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const quest = questTracker.getQuestById(questId);

  if (!quest) {
    console.log(chalk.red(`Quest ${questId} not found.\n`));
    return;
  }

  profileService.markQuestComplete(character.id, questId, note);
  console.log(chalk.green(`✓ Marked "${quest.name}" as complete!`));

  if (note) {
    console.log(chalk.gray(`  Note: ${note}`));
  }

  console.log('');
}

async function markQuestIncomplete(
  profileService: any,
  questTracker: QuestTrackerService,
  questId: number
): Promise<void> {
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const quest = questTracker.getQuestById(questId);

  if (!quest) {
    console.log(chalk.red(`Quest ${questId} not found.\n`));
    return;
  }

  profileService.markQuestIncomplete(character.id, questId);
  console.log(chalk.yellow(`○ Marked "${quest.name}" as incomplete.\n`));
}

async function searchQuests(
  questTracker: QuestTrackerService,
  profileService: any,
  query: string,
  options: QuestCommandOptions
): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Searching for quests: "${query}"\n`));

  const results = questTracker.searchByName(query, 20);

  if (!results || results.length === 0) {
    console.log(chalk.red('No quests found'));
    return;
  }

  // Filter by completion status if requested
  let filteredResults = results;
  const character = profileService.getActiveCharacter();

  if (character && (options.showCompleted || options.showIncomplete)) {
    filteredResults = results.filter((quest) => {
      const isComplete = profileService.isQuestComplete(character.id, quest.id);
      if (options.showCompleted) return isComplete;
      if (options.showIncomplete) return !isComplete;
      return true;
    });
  }

  console.log(chalk.green(`Found ${filteredResults.length} quest(s)\n`));

  displayQuestTable(filteredResults, profileService);

  console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
}

async function listQuestsByLevel(
  questTracker: QuestTrackerService,
  profileService: any,
  level: number,
  options: QuestCommandOptions
): Promise<void> {
  console.log(chalk.cyan(`\n📋 Finding quests for level ${level}\n`));

  // Get quests within ±2 levels for better results
  const results = questTracker.getQuestsByLevelRange(level - 2, level + 2);

  if (!results || results.length === 0) {
    console.log(chalk.red(`No quests found for level ${level}`));
    return;
  }

  // Filter by completion status if requested
  let filteredResults = results;
  const character = profileService.getActiveCharacter();

  if (character && (options.showCompleted || options.showIncomplete)) {
    filteredResults = results.filter((quest) => {
      const isComplete = profileService.isQuestComplete(character.id, quest.id);
      if (options.showCompleted) return isComplete;
      if (options.showIncomplete) return !isComplete;
      return true;
    });
  }

  console.log(
    chalk.green(`Found ${filteredResults.length} quest(s) for levels ${level - 2}-${level + 2}\n`)
  );

  displayQuestTable(filteredResults, profileService);

  console.log(chalk.cyan('\nTip: Use --id <ID> to view detailed information for a specific quest'));
}

async function fetchQuestById(
  questTracker: QuestTrackerService,
  profileService: any,
  questId: number
): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Fetching quest details for ID: ${questId}\n`));

  const quest = questTracker.getQuestById(questId);

  if (!quest) {
    console.log(chalk.red('Quest not found'));
    return;
  }

  // Check completion status
  const character = profileService.getActiveCharacter();
  let isComplete = false;
  let completionInfo = null;

  if (character) {
    isComplete = profileService.isQuestComplete(character.id, quest.id);
    if (isComplete) {
      const completed = profileService
        .getCompletedQuests(character.id)
        .find((q: any) => q.questId === quest.id);
      completionInfo = completed;
    }
  }

  // Display quest information
  console.log(chalk.bold.cyan('=== Quest Information ===\n'));
  console.log(`${chalk.bold('Name:')} ${quest.name}`);
  console.log(`${chalk.bold('ID:')} ${quest.id}`);

  // Show completion status
  if (character) {
    if (isComplete) {
      console.log(`${chalk.bold('Status:')} ${chalk.green('✓ Complete')}`);
      if (completionInfo?.completedAt) {
        const date = new Date(completionInfo.completedAt);
        console.log(
          `${chalk.bold('Completed:')} ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
        );
      }
      if (completionInfo?.notes) {
        console.log(`${chalk.bold('Note:')} ${chalk.gray(completionInfo.notes)}`);
      }
    } else {
      console.log(`${chalk.bold('Status:')} ${chalk.gray('○ Not complete')}`);
    }
  }

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

  // Objectives section
  if (quest.objectives && quest.objectives.length > 0) {
    console.log(chalk.bold('\nObjectives:'));
    console.log(chalk.dim('━'.repeat(80)));

    quest.objectives.forEach((obj: any) => {
      if (obj.type === 'fish') {
        displayFishObjective(obj);
      } else if (obj.type === 'item') {
        displayItemObjective(obj);
      } else if (obj.type === 'enemy') {
        displayEnemyObjective(obj);
      } else if (obj.type === 'npc') {
        displayNPCObjective(obj);
      } else if (obj.type === 'interact') {
        displayInteractObjective(obj);
      } else {
        console.log(
          `\n  ${chalk.cyan(obj.index + '.')} ${chalk.yellow(obj.type)}: ${obj.targetName} ${chalk.dim(`(qty: ${obj.quantity})`)}`
        );
      }
    });

    console.log(chalk.dim('━'.repeat(80)));
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

function displayQuestTable(quests: any[], profileService?: any): void {
  const character = profileService?.getActiveCharacter();

  const table = new Table({
    head: (character
      ? ['✓', 'ID', 'Name', 'Level', 'Type ID', 'Location ID']
      : ['ID', 'Name', 'Level', 'Type ID', 'Location ID']
    ).map((h) => chalk.cyan(h)),
    style: {
      head: [],
      border: [],
    },
    colWidths: character ? [3, 10, 45, 8, 10, 12] : [10, 50, 8, 10, 12],
  });

  quests.forEach((quest: any) => {
    const displayLevel = quest.level + (quest.levelOffset || 0);
    const isComplete = character ? profileService.isQuestComplete(character.id, quest.id) : false;
    const statusIcon = isComplete ? chalk.green('✓') : chalk.gray('○');

    const row = [
      quest.id || 'N/A',
      quest.name || 'Unknown',
      displayLevel || 'N/A',
      quest.journalGenreId || 'N/A',
      quest.placeNameId || 'N/A',
    ];

    if (character) {
      row.unshift(statusIcon);
    }

    table.push(row);
  });

  console.log(table.toString());
}

function tugSymbol(tug: string): string {
  switch (tug.toLowerCase()) {
    case 'light':
      return '!';
    case 'medium':
      return '!!';
    case 'heavy':
      return '!!!';
    default:
      return tug;
  }
}

function displayFishObjective(obj: any): void {
  const fish = obj.details?.fish;
  if (!fish) {
    console.log(
      `\n  ${chalk.cyan(obj.index + '.')} ${chalk.yellow('🎣 Fish')}: ${obj.targetName} ${chalk.dim(`(qty: ${obj.quantity})`)}`
    );
    return;
  }

  console.log(chalk.bold.cyan(`\n  ${obj.index}. 🎣 Catch ${obj.quantity}x ${obj.targetName}`));
  console.log(`     ${chalk.gray('Location:')} ${fish.locationName}`);
  console.log(`     ${chalk.gray('Time:')} ${fish.timeWindow}`);

  if (fish.weather && fish.weather.length > 0) {
    console.log(`     ${chalk.gray('Weather:')} ${fish.weather.join(', ')}`);
  }

  if (fish.previousWeather && fish.previousWeather.length > 0) {
    console.log(`     ${chalk.gray('Previous Weather:')} ${fish.previousWeather.join(', ')}`);
  }

  if (fish.baitChain && fish.baitChain.length > 0) {
    console.log(`     ${chalk.gray('Bait:')} ${fish.baitChain.join(' → ')}`);
  }

  console.log(`     ${chalk.gray('Hookset:')} ${fish.hookset}`);
  console.log(`     ${chalk.gray('Tug:')} ${tugSymbol(fish.tug)}`);

  const flags = [];
  if (fish.bigFish) flags.push(chalk.yellow('Big Fish'));
  if (fish.folklore) flags.push(chalk.magenta('Folklore'));
  if (fish.fishEyes) flags.push(chalk.blue('Fish Eyes'));
  if (fish.snagging) flags.push(chalk.red('Snagging'));

  if (flags.length > 0) {
    console.log(`     ${chalk.gray('Special:')} ${flags.join(', ')}`);
  }

  console.log(chalk.dim(`     💡 eorzea fish --id ${obj.targetId}`));
}

function displayItemObjective(obj: any): void {
  const item = obj.details?.item;
  console.log(
    `\n  ${chalk.cyan(obj.index + '.')} ${chalk.yellow('📦 Item')}: ${obj.targetName} ${chalk.dim(`(qty: ${obj.quantity})`)}`
  );
  if (item?.itemId) {
    console.log(chalk.dim(`     Item ID: ${item.itemId}`));
  }
}

function displayEnemyObjective(obj: any): void {
  const enemy = obj.details?.enemy;
  console.log(
    `\n  ${chalk.cyan(obj.index + '.')} ${chalk.red('⚔️  Enemy')}: ${obj.targetName} ${chalk.dim(`(qty: ${obj.quantity})`)}`
  );
  if (enemy?.enemyId) {
    console.log(chalk.dim(`     Enemy ID: ${enemy.enemyId}`));
  }
}

function displayNPCObjective(obj: any): void {
  const npc = obj.details?.npc;
  console.log(`\n  ${chalk.cyan(obj.index + '.')} ${chalk.green('💬 NPC')}: ${obj.targetName}`);
  if (npc?.npcId) {
    console.log(chalk.dim(`     NPC ID: ${npc.npcId}`));
  }
}

function displayInteractObjective(obj: any): void {
  console.log(
    `\n  ${chalk.cyan(obj.index + '.')} ${chalk.blue('🔍 Interact')}: ${obj.targetName} ${chalk.dim(`(qty: ${obj.quantity})`)}`
  );
}

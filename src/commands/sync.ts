/**
 * Intelligent Sync Command
 *
 * Sync achievements and infer quest completions
 */

import chalk from 'chalk';
import { getPlayerProfileService } from '../services/playerProfile.js';
import { getAchievementTrackerService } from '../services/achievementTracker.js';
import { getIntelligentSyncService } from '../services/intelligentSync.js';

export interface SyncCommandOptions {
  achievements?: string; // Comma-separated achievement IDs
  dryRun?: boolean;
}

export async function syncCommand(options: SyncCommandOptions): Promise<void> {
  const profileService = getPlayerProfileService();
  const achievementTracker = getAchievementTrackerService();

  const activeChar = profileService.getActiveCharacter();
  if (!activeChar) {
    console.log(
      chalk.yellow('No active character. Use "eorzea character --add" to create a character first.')
    );
    return;
  }

  if (!options.achievements) {
    console.log(chalk.yellow('Please provide achievement IDs with --achievements'));
    console.log(chalk.gray('Example: eorzea sync --achievements 2298,2958,3496'));
    return;
  }

  // Parse achievement IDs
  const achievementIds = options.achievements.split(',').map((id) => parseInt(id.trim()));

  console.log(chalk.bold.cyan(`\n🔄 Intelligent Sync for ${activeChar.name}\n`));

  // Show what achievements we're processing
  console.log(chalk.bold('Processing achievements:'));
  for (const achievementId of achievementIds) {
    const achievement = achievementTracker.getAchievementById(achievementId);
    if (achievement) {
      console.log(
        `  ${chalk.cyan(`#${achievement.id}`)} ${achievement.name}${
          achievement.titleRewardId ? chalk.yellow(' ★') : ''
        }`
      );
    } else {
      console.log(chalk.red(`  #${achievementId} - Not found`));
    }
  }
  console.log();

  if (options.dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be saved\n'));

    // Just analyze without saving
    const intelligentSync = getIntelligentSyncService();
    const result = intelligentSync.analyzeAchievements(achievementIds);

    console.log(chalk.bold('Analysis Results:'));
    console.log(`  ${chalk.green('Achievements:')} ${result.achievements.length}`);
    console.log(`  ${chalk.green('Quests to infer:')} ${result.inferredQuests.length}`);
    console.log(`  ${chalk.green('High confidence (≥90%):')} ${result.summary.highConfidence}`);
    console.log(
      `  ${chalk.yellow('Medium confidence (70-89%):')} ${result.summary.mediumConfidence}`
    );
    console.log(`  ${chalk.red('Low confidence (<70%):')} ${result.summary.lowConfidence}`);
    console.log();

    if (result.inferredQuests.length > 0) {
      console.log(chalk.bold('Sample inferred quests (first 10):'));
      for (const quest of result.inferredQuests.slice(0, 10)) {
        console.log(
          `  ${chalk.cyan(`#${quest.questId}`)} ${quest.questName} ${chalk.gray(
            `(${quest.confidence}%)`
          )}`
        );
        console.log(`    ${chalk.dim(quest.reason)}`);
      }
      if (result.inferredQuests.length > 10) {
        console.log(chalk.gray(`  ... and ${result.inferredQuests.length - 10} more`));
      }
    }
  } else {
    // Perform actual sync
    const result = await profileService.performIntelligentSync(activeChar.id, achievementIds);

    console.log(chalk.green('✓ Sync completed!\n'));
    console.log(chalk.bold('Results:'));
    console.log(`  ${chalk.green('Achievements processed:')} ${result.achievementsProcessed}`);
    console.log(`  ${chalk.green('Quests inferred:')} ${result.questsInferred}`);
    console.log(`  ${chalk.green('High confidence (≥90%):')} ${result.highConfidence}`);
    console.log(`  ${chalk.yellow('Medium confidence (70-89%):')} ${result.mediumConfidence}`);
    console.log(`  ${chalk.red('Low confidence (<70%):')} ${result.lowConfidence}`);
    console.log();

    // Show updated progress
    const stats = profileService.getProgressStats(activeChar.id);
    console.log(
      chalk.bold(
        `Progress: ${stats.completedQuests.toLocaleString()} / ${stats.totalQuests.toLocaleString()} quests (${stats.questCompletionPercentage.toFixed(1)}%)`
      )
    );
  }

  console.log();
}

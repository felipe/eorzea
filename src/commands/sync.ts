/**
 * Intelligent Sync Command
 *
 * Sync achievements and infer quest completions
 */

import chalk from 'chalk';
import { getPlayerProfileService } from '../services/playerProfile.js';
import { getAchievementTrackerService } from '../services/achievementTracker.js';
import { getIntelligentSyncService } from '../services/intelligentSync.js';
import {
  parseAchievementsFromFile,
  getMSQAchievementCount,
} from '../parsers/lodestoneAchievementParser.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

export interface SyncCommandOptions {
  achievements?: string; // Comma-separated achievement IDs
  fromFile?: string; // Path to Lodestone achievement text file
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

  // Handle file-based sync
  if (options.fromFile) {
    await syncFromFile(options.fromFile, activeChar.id, profileService, options.dryRun);
    return;
  }

  // Handle manual achievement ID sync
  if (!options.achievements) {
    console.log(chalk.yellow('Please provide achievement IDs with --achievements'));
    console.log(chalk.gray('Example: eorzea sync --achievements 2298,2958,3496'));
    console.log(chalk.gray('Or use: eorzea sync --from-file achievements.txt'));
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

/**
 * Sync achievements from Lodestone text file
 */
async function syncFromFile(
  filePath: string,
  characterId: string,
  profileService: any,
  dryRun?: boolean
): Promise<void> {
  const resolvedPath = resolve(filePath);

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    console.log(chalk.red(`Error: File not found: ${filePath}`));
    console.log(chalk.gray('Make sure the file path is correct.'));
    return;
  }

  console.log(chalk.bold.cyan('\n📄 Parsing Lodestone achievements from file...\n'));

  try {
    // Parse the file
    const result = parseAchievementsFromFile(resolvedPath);

    console.log(chalk.bold(`Found ${result.total} achievements in file\n`));

    if (result.matched === 0) {
      console.log(chalk.yellow('No achievements matched in database.'));
      console.log(chalk.gray('Make sure the file contains Lodestone achievement data.'));
      return;
    }

    // Show matching results
    console.log(chalk.bold('Matching results:'));
    console.log(`  ${chalk.green('Matched:')} ${result.matched}`);
    console.log(`  ${chalk.yellow('Not found in DB:')} ${result.unmatched}`);

    const msqCount = getMSQAchievementCount(result);
    if (msqCount > 0) {
      console.log(`  ${chalk.cyan('MSQ achievements:')} ${msqCount}`);
    }

    // Show sample of matched achievements
    if (result.achievements.length > 0) {
      console.log(chalk.bold('\nSample matched achievements (first 10):'));
      for (const achievement of result.achievements.slice(0, 10)) {
        console.log(
          `  ${chalk.green('✓')} ${achievement.name} ${chalk.gray(`→ #${achievement.achievementId}`)}`
        );
      }
      if (result.achievements.length > 10) {
        console.log(chalk.gray(`  ... and ${result.achievements.length - 10} more`));
      }
    }

    // Show unmatched if any
    if (result.unmatchedNames.length > 0) {
      console.log(chalk.bold('\nNot found in database (will be skipped):'));
      for (const name of result.unmatchedNames.slice(0, 5)) {
        console.log(`  ${chalk.red('✗')} ${name}`);
      }
      if (result.unmatchedNames.length > 5) {
        console.log(chalk.gray(`  ... and ${result.unmatchedNames.length - 5} more`));
      }
    }

    console.log();

    // Get achievement IDs
    const achievementIds = result.achievements
      .map((a) => a.achievementId)
      .filter((id): id is number => id !== undefined);

    if (achievementIds.length === 0) {
      console.log(chalk.yellow('No valid achievements to sync.'));
      return;
    }

    // Use intelligent sync to estimate quest inferences
    const intelligentSync = getIntelligentSyncService();
    const inferenceResult = intelligentSync.analyzeAchievements(achievementIds);

    console.log(chalk.bold('Estimated impact:'));
    console.log(`  ${chalk.cyan('Quests to infer:')} ${inferenceResult.inferredQuests.length}`);
    console.log(`  ${chalk.green('High confidence:')} ${inferenceResult.summary.highConfidence}`);
    console.log(
      `  ${chalk.yellow('Medium confidence:')} ${inferenceResult.summary.mediumConfidence}`
    );
    console.log(`  ${chalk.red('Low confidence:')} ${inferenceResult.summary.lowConfidence}`);
    console.log();

    if (dryRun) {
      console.log(chalk.yellow('🔍 DRY RUN MODE - No changes saved\n'));
      return;
    }

    // Perform actual sync
    console.log(chalk.bold('Syncing achievements...\n'));
    const syncResult = await profileService.performIntelligentSync(characterId, achievementIds);

    console.log(chalk.green('✓ Sync completed!\n'));
    console.log(chalk.bold('Results:'));
    console.log(`  ${chalk.green('Achievements synced:')} ${syncResult.achievementsProcessed}`);
    console.log(`  ${chalk.green('Quests inferred:')} ${syncResult.questsInferred}`);
    console.log(`  ${chalk.green('High confidence:')} ${syncResult.highConfidence}`);
    console.log(`  ${chalk.yellow('Medium confidence:')} ${syncResult.mediumConfidence}`);
    console.log(`  ${chalk.red('Low confidence:')} ${syncResult.lowConfidence}`);
    console.log();

    // Show updated progress
    const stats = profileService.getProgressStats(characterId);
    console.log(
      chalk.bold(
        `Progress: ${stats.completedQuests.toLocaleString()} / ${stats.totalQuests.toLocaleString()} quests (${stats.questCompletionPercentage.toFixed(1)}%)`
      )
    );
    console.log();
  } catch (error: any) {
    console.log(chalk.red(`Error parsing file: ${error.message}`));
    console.log(chalk.gray('Make sure the file contains valid Lodestone achievement data.'));
  }
}

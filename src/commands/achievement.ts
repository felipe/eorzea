/**
 * Achievement Command
 *
 * Search, view, and track achievement unlocks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAchievementTrackerService } from '../services/achievementTracker.js';
import { getTitleTrackerService } from '../services/titleTracker.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export const achievementCommand = new Command('achievement')
  .description('Search and track achievements')
  .alias('ach')
  .addCommand(
    new Command('search')
      .description('Search for achievements')
      .argument('[query]', 'Search query')
      .option('-t, --with-titles', 'Only show achievements that reward titles')
      .option('-c, --category <id>', 'Filter by category ID')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (query, options) => {
        const achievementTracker = getAchievementTrackerService();

        try {
          const results = achievementTracker.searchAchievements({
            query,
            categoryId: options.category ? parseInt(options.category) : undefined,
            rewardsTitles: options.withTitles,
            limit: parseInt(options.limit),
          });

          if (results.length === 0) {
            console.log(chalk.yellow('No achievements found'));
            return;
          }

          console.log(chalk.bold(`Found ${results.length} achievement(s):\n`));

          for (const achievement of results) {
            console.log(
              `${chalk.cyan(`#${achievement.id}`)} ${chalk.bold(achievement.name)} ${
                achievement.titleRewardId ? chalk.yellow('★') : ''
              }`
            );
            console.log(`  ${chalk.gray(achievement.description)}`);
            console.log(`  ${chalk.gray(`Points: ${achievement.points}`)}`);
            console.log();
          }
        } catch (error) {
          console.error(chalk.red('Error searching achievements:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('view')
      .description('View achievement details')
      .argument('<id>', 'Achievement ID')
      .action(async (id) => {
        const achievementTracker = getAchievementTrackerService();
        const titleTracker = getTitleTrackerService();
        const profileService = getPlayerProfileService();

        try {
          const achievementId = parseInt(id);
          const achievement = achievementTracker.getAchievementById(achievementId);

          if (!achievement) {
            console.log(chalk.yellow(`Achievement #${achievementId} not found`));
            return;
          }

          console.log(chalk.bold.cyan(`Achievement #${achievement.id}`));
          console.log();
          console.log(`${chalk.bold('Name:')} ${achievement.name}`);
          console.log(`${chalk.bold('Description:')} ${achievement.description}`);
          console.log(`${chalk.bold('Points:')} ${achievement.points}`);
          console.log(`${chalk.bold('Category:')} ${achievement.categoryId}`);

          // Show title reward if any
          if (achievement.titleRewardId) {
            const title = titleTracker.getTitleById(achievement.titleRewardId);
            if (title) {
              console.log();
              console.log(`${chalk.bold('Title Reward:')} ${chalk.yellow(title.nameMasculine)}`);
            }
          }

          console.log();

          // Check if unlocked for active character
          const activeChar = profileService.getActiveCharacter();
          if (activeChar) {
            const isUnlocked = profileService.isAchievementUnlocked(activeChar.id, achievementId);
            if (isUnlocked) {
              console.log(chalk.green('✓ Unlocked'));
            } else {
              console.log(chalk.gray('Not unlocked'));
            }
          }
        } catch (error) {
          console.error(chalk.red('Error viewing achievement:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('unlock')
      .description('Mark an achievement as unlocked')
      .argument('<id>', 'Achievement ID')
      .option('-n, --notes <notes>', 'Add notes')
      .action(async (id, options) => {
        const achievementTracker = getAchievementTrackerService();
        const titleTracker = getTitleTrackerService();
        const profileService = getPlayerProfileService();

        try {
          const achievementId = parseInt(id);
          const achievement = achievementTracker.getAchievementById(achievementId);

          if (!achievement) {
            console.log(chalk.yellow(`Achievement #${achievementId} not found`));
            return;
          }

          const activeChar = profileService.getActiveCharacter();
          if (!activeChar) {
            console.log(
              chalk.yellow(
                'No active character. Use "eorzea character add" to create a character first.'
              )
            );
            return;
          }

          // Check if already unlocked
          if (profileService.isAchievementUnlocked(activeChar.id, achievementId)) {
            console.log(chalk.yellow(`Achievement "${achievement.name}" is already unlocked`));
            return;
          }

          profileService.markAchievementUnlocked(
            activeChar.id,
            achievementId,
            'manual',
            options.notes
          );

          console.log(chalk.green(`✓ Unlocked achievement: ${achievement.name}`));

          // Auto-unlock title if this achievement rewards one
          if (achievement.titleRewardId) {
            const title = titleTracker.getTitleById(achievement.titleRewardId);
            if (
              title &&
              !profileService.isTitleUnlocked(activeChar.id, achievement.titleRewardId)
            ) {
              profileService.markTitleUnlocked(
                activeChar.id,
                achievement.titleRewardId,
                'achievement',
                achievementId,
                `Auto-unlocked from achievement: ${achievement.name}`
              );
              console.log(chalk.green(`  ✓ Auto-unlocked title: ${title.nameMasculine}`));
            }
          }

          if (options.notes) {
            console.log(chalk.gray(`  Notes: ${options.notes}`));
          }
        } catch (error) {
          console.error(chalk.red('Error unlocking achievement:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List unlocked achievements for active character')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (options) => {
        const achievementTracker = getAchievementTrackerService();
        const profileService = getPlayerProfileService();

        try {
          const activeChar = profileService.getActiveCharacter();
          if (!activeChar) {
            console.log(
              chalk.yellow(
                'No active character. Use "eorzea character add" to create a character first.'
              )
            );
            return;
          }

          const unlockedAchievements = profileService.getUnlockedAchievements(
            activeChar.id,
            parseInt(options.limit)
          );

          if (unlockedAchievements.length === 0) {
            console.log(chalk.yellow('No achievements unlocked yet'));
            return;
          }

          console.log(
            chalk.bold(
              `${activeChar.name}'s Achievements (${unlockedAchievements.length} shown):\n`
            )
          );

          for (const unlocked of unlockedAchievements) {
            const achievement = achievementTracker.getAchievementById(unlocked.achievementId);
            if (achievement) {
              console.log(
                `${chalk.cyan(`#${achievement.id}`)} ${chalk.bold(achievement.name)} ${
                  achievement.titleRewardId ? chalk.yellow('★') : ''
                }`
              );
              console.log(`  ${chalk.gray(achievement.description)}`);
              console.log(
                `  ${chalk.gray(`Unlocked: ${unlocked.unlockedAt.toLocaleDateString()}`)}`
              );
              if (unlocked.notes) {
                console.log(`  ${chalk.gray(`Notes: ${unlocked.notes}`)}`);
              }
              console.log();
            }
          }
        } catch (error) {
          console.error(chalk.red('Error listing achievements:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('stats').description('Show achievement statistics').action(async () => {
      const achievementTracker = getAchievementTrackerService();
      const profileService = getPlayerProfileService();

      try {
        const activeChar = profileService.getActiveCharacter();
        if (!activeChar) {
          console.log(
            chalk.yellow(
              'No active character. Use "eorzea character add" to create a character first.'
            )
          );
          return;
        }

        const totalAchievements = achievementTracker.getTotalCount();
        const unlockedCount = profileService.getUnlockedAchievementCount(activeChar.id);
        const percentage = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;

        console.log(chalk.bold.cyan(`${activeChar.name}'s Achievements\n`));
        console.log(`${chalk.bold('Unlocked:')} ${unlockedCount} / ${totalAchievements}`);
        console.log(`${chalk.bold('Progress:')} ${percentage.toFixed(1)}%`);

        // Show title-rewarding achievements
        const titleRewardingAchievements = achievementTracker.getTitleRewardingAchievements();
        const unlockedTitleAchievements = titleRewardingAchievements.filter((a) =>
          profileService.isAchievementUnlocked(activeChar.id, a.id)
        ).length;

        console.log();
        console.log(
          `${chalk.bold('Title Achievements:')} ${unlockedTitleAchievements} / ${
            titleRewardingAchievements.length
          }`
        );
      } catch (error) {
        console.error(chalk.red('Error showing achievement stats:'), error);
        process.exit(1);
      }
    })
  );

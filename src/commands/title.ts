/**
 * Title Command
 *
 * Search, view, and track title unlocks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getTitleTrackerService } from '../services/titleTracker.js';
import { getPlayerProfileService } from '../services/playerProfile.js';

export const titleCommand = new Command('title')
  .description('Search and track titles')
  .addCommand(
    new Command('search')
      .description('Search for titles')
      .argument('[query]', 'Search query')
      .option('-p, --prefix', 'Only show prefix titles')
      .option('-s, --suffix', 'Only show suffix titles')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (query, options) => {
        const titleTracker = getTitleTrackerService();

        try {
          const results = titleTracker.searchTitles({
            query,
            isPrefix: options.prefix ? true : options.suffix ? false : undefined,
            limit: parseInt(options.limit),
          });

          if (results.length === 0) {
            console.log(chalk.yellow('No titles found'));
            return;
          }

          console.log(chalk.bold(`Found ${results.length} title(s):\n`));

          for (const title of results) {
            const position = title.isPrefix ? 'Prefix' : 'Suffix';
            console.log(
              `${chalk.cyan(`#${title.id}`)} ${chalk.bold(title.nameMasculine)}${
                title.nameFeminine !== title.nameMasculine ? ` / ${title.nameFeminine}` : ''
              }`
            );
            console.log(`  ${chalk.gray(`Position: ${position}`)}`);
            console.log();
          }
        } catch (error) {
          console.error(chalk.red('Error searching titles:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('view')
      .description('View title details')
      .argument('<id>', 'Title ID')
      .action(async (id) => {
        const titleTracker = getTitleTrackerService();
        const profileService = getPlayerProfileService();

        try {
          const titleId = parseInt(id);
          const title = titleTracker.getTitleById(titleId);

          if (!title) {
            console.log(chalk.yellow(`Title #${titleId} not found`));
            return;
          }

          console.log(chalk.bold.cyan(`Title #${title.id}`));
          console.log();
          console.log(`${chalk.bold('Name (M):')} ${title.nameMasculine}`);
          console.log(`${chalk.bold('Name (F):')} ${title.nameFeminine}`);
          console.log(`${chalk.bold('Position:')} ${title.isPrefix ? 'Prefix' : 'Suffix'}`);
          console.log();

          // Check if unlocked for active character
          const activeChar = profileService.getActiveCharacter();
          if (activeChar) {
            const isUnlocked = profileService.isTitleUnlocked(activeChar.id, titleId);
            if (isUnlocked) {
              console.log(chalk.green('✓ Unlocked'));
            } else {
              console.log(chalk.gray('Not unlocked'));
            }
          }
        } catch (error) {
          console.error(chalk.red('Error viewing title:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('unlock')
      .description('Mark a title as unlocked')
      .argument('<id>', 'Title ID')
      .option('-n, --notes <notes>', 'Add notes')
      .action(async (id, options) => {
        const titleTracker = getTitleTrackerService();
        const profileService = getPlayerProfileService();

        try {
          const titleId = parseInt(id);
          const title = titleTracker.getTitleById(titleId);

          if (!title) {
            console.log(chalk.yellow(`Title #${titleId} not found`));
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
          if (profileService.isTitleUnlocked(activeChar.id, titleId)) {
            console.log(chalk.yellow(`Title "${title.nameMasculine}" is already unlocked`));
            return;
          }

          profileService.markTitleUnlocked(
            activeChar.id,
            titleId,
            'manual',
            undefined,
            options.notes
          );

          console.log(chalk.green(`✓ Unlocked title: ${title.nameMasculine}`));
          if (options.notes) {
            console.log(chalk.gray(`  Notes: ${options.notes}`));
          }
        } catch (error) {
          console.error(chalk.red('Error unlocking title:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List unlocked titles for active character')
      .option('-l, --limit <number>', 'Limit results', '20')
      .action(async (options) => {
        const titleTracker = getTitleTrackerService();
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

          const unlockedTitles = profileService.getUnlockedTitles(
            activeChar.id,
            parseInt(options.limit)
          );

          if (unlockedTitles.length === 0) {
            console.log(chalk.yellow('No titles unlocked yet'));
            return;
          }

          console.log(
            chalk.bold(`${activeChar.name}'s Titles (${unlockedTitles.length} total):\n`)
          );

          for (const unlocked of unlockedTitles) {
            const title = titleTracker.getTitleById(unlocked.titleId);
            if (title) {
              console.log(`${chalk.cyan(`#${title.id}`)} ${chalk.bold(title.nameMasculine)}`);
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
          console.error(chalk.red('Error listing titles:'), error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('stats').description('Show title collection statistics').action(async () => {
      const titleTracker = getTitleTrackerService();
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

        const totalTitles = titleTracker.getTotalCount();
        const unlockedCount = profileService.getUnlockedTitleCount(activeChar.id);
        const percentage = totalTitles > 0 ? (unlockedCount / totalTitles) * 100 : 0;

        console.log(chalk.bold.cyan(`${activeChar.name}'s Title Collection\n`));
        console.log(`${chalk.bold('Unlocked:')} ${unlockedCount} / ${totalTitles}`);
        console.log(`${chalk.bold('Progress:')} ${percentage.toFixed(1)}%`);

        // Show breakdown by type
        const prefixTitles = titleTracker.getTitlesByType(true);
        const suffixTitles = titleTracker.getTitlesByType(false);

        const unlockedPrefixes = prefixTitles.filter((t) =>
          profileService.isTitleUnlocked(activeChar.id, t.id)
        ).length;
        const unlockedSuffixes = suffixTitles.filter((t) =>
          profileService.isTitleUnlocked(activeChar.id, t.id)
        ).length;

        console.log();
        console.log(`${chalk.bold('Prefix Titles:')} ${unlockedPrefixes} / ${prefixTitles.length}`);
        console.log(`${chalk.bold('Suffix Titles:')} ${unlockedSuffixes} / ${suffixTitles.length}`);
      } catch (error) {
        console.error(chalk.red('Error showing title stats:'), error);
        process.exit(1);
      }
    })
  );

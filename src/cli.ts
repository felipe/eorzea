#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { version, description } from '../package.json';

const program = new Command();

program
  .name('eorzea')
  .description(description)
  .version(version);

// Character commands
program
  .command('character')
  .alias('char')
  .description('Manage and view character information')
  .option('-n, --name <name>', 'Character name')
  .option('-s, --server <server>', 'Server name')
  .action((options) => {
    console.log(chalk.blue('Character command coming soon!'));
    console.log('Options:', options);
  });

// Quest commands
program
  .command('quest')
  .description('View and manage quests')
  .option('-l, --list', 'List available quests')
  .option('-s, --search <query>', 'Search for quests')
  .action((options) => {
    console.log(chalk.green('Quest command coming soon!'));
    console.log('Options:', options);
  });

// Location commands
program
  .command('location')
  .alias('loc')
  .description('View location information and nearby quests')
  .option('-c, --current', 'Show current location')
  .action((options) => {
    console.log(chalk.yellow('Location command coming soon!'));
    console.log('Options:', options);
  });

// Guide command for quest walkthroughs
program
  .command('guide <questId>')
  .description('Show step-by-step walkthrough for a quest')
  .action((questId) => {
    console.log(chalk.magenta(`Quest guide for ${questId} coming soon!`));
  });

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

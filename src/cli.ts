#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { characterCommand } from './commands/character.js';
import { questCommand } from './commands/quest.js';
import { fishCommand } from './commands/fish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const { version, description } = packageJson;

const program = new Command();

program.name('eorzea').description(description).version(version);

// Character commands
program
  .command('character')
  .alias('char')
  .description('Manage and view character information')
  .option('-n, --name <name>', 'Character name')
  .option('-s, --server <server>', 'Server name')
  .option('-i, --id <id>', 'Character ID (for direct lookup)')
  .action(async (options) => {
    await characterCommand(options);
  });

// Quest commands
program
  .command('quest')
  .description('View and manage quests')
  .option('-s, --search <query>', 'Search for quests by name')
  .option('-l, --level <level>', 'List quests for a specific level')
  .option('-i, --id <id>', 'Get details for a specific quest')
  .action(async (options) => {
    await questCommand(options);
  });

// Fish commands
program
  .command('fish')
  .description('View fishing information and track fish')
  .option('-i, --id <id>', 'Get details for a specific fish')
  .option('-b, --big', 'Show big fish only')
  .option('-p, --patch <patch>', 'Filter by patch (e.g., 2.0, 6.0)')
  .option('-l, --location <location>', 'Filter by location ID')
  .option('-a, --available', 'Show fish available at current Eorzean time')
  .option('--aquarium', 'Show aquarium fish only')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .action(async (options) => {
    await fishCommand(options);
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

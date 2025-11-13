#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { characterCommand } from './commands/character.js';
import { questCommand } from './commands/quest.js';
import { fishCommand } from './commands/fish.js';
import { progressCommand } from './commands/progress.js';
import { titleCommand } from './commands/title.js';
import { achievementCommand } from './commands/achievement.js';
import { syncCommand } from './commands/sync.js';
import { itemCommand } from './commands/item.js';
import { gatherCommand } from './commands/gather.js';
import { craftCommand } from './commands/craft.js';
import {
  mountCommand,
  minionCommand,
  orchestrionCommand,
  collectionCommand,
} from './commands/collectible.js';

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
  .option('--add', 'Add character to profile (requires internet)')
  .option('--list', 'List all characters in profile')
  .option('--active', 'Show active character')
  .option('--switch <name>', 'Switch active character')
  .option('--remove <name>', 'Remove character from profile')
  .option('--sync', 'Sync character data from Lodestone (requires internet)')
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
  .option('--complete', 'Mark quest as complete (use with --id)')
  .option('--incomplete', 'Mark quest as incomplete (use with --id)')
  .option('--note <note>', 'Add a note when marking complete')
  .option('--show-completed', 'Show only completed quests')
  .option('--show-incomplete', 'Show only incomplete quests')
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
  .option('--caught', 'Mark fish as caught (use with --id)')
  .option('--note <note>', 'Add a note when marking caught')
  .option('--show-caught', 'Show only caught fish')
  .option('--show-uncaught', 'Show only uncaught fish')
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

// Progress command
program
  .command('progress')
  .description('View player progress and statistics')
  .option('--quests', 'Show only quest progress')
  .option('--fish', 'Show only fishing progress')
  .option('--titles', 'Show only title progress')
  .option('--achievements', 'Show only achievement progress')
  .option('--jobs', 'Show only job progress')
  .option('--recent', 'Show only recent activity')
  .action(async (options) => {
    await progressCommand(options);
  });

// Title command
program.addCommand(titleCommand);

// Achievement command
program.addCommand(achievementCommand);

// Sync command
program
  .command('sync')
  .description('Intelligent sync: analyze achievements and infer quest completions')
  .option('--achievements <ids>', 'Comma-separated achievement IDs to sync')
  .option('--from-file <path>', 'Parse achievements from Lodestone text file')
  .option('--dry-run', 'Preview changes without saving')
  .action(async (options) => {
    await syncCommand(options);
  });

// Item commands
program
  .command('item [name]')
  .description('Search and view item information')
  .option('-i, --id <id>', 'Get details for a specific item')
  .option('-n, --name <name>', 'Search items by name')
  .option('-l, --level <level>', 'Filter by level (±5)')
  .option('-r, --rarity <rarity>', 'Filter by rarity')
  .option('-c, --category <category>', 'Filter by category ID')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .option('--guide', 'Show complete item guide with sources, recipes, and gathering locations')
  .action(async (name, options) => {
    await itemCommand(name, options);
  });

// Gathering commands
program
  .command('gather')
  .alias('gathering')
  .description('View and track gathering nodes')
  .option('-i, --id <id>', 'Get details for a specific gathering point')
  .option('--mining', 'Show mining nodes')
  .option('--botany', 'Show botany nodes')
  .option('-a, --available', 'Show available timed nodes')
  .option('--item <name>', 'Find nodes for an item')
  .option('-l, --level <level>', 'Filter by level (±2)')
  .option('--location <location>', 'Filter by location name')
  .option('--timed', 'Show timed/limited nodes only')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .option('--gathered', 'Mark node as gathered (use with --id)')
  .action(async (options) => {
    await gatherCommand(options);
  });

// Crafting commands
program
  .command('craft [name]')
  .alias('crafting')
  .description('Search and view crafting recipes')
  .option('-i, --id <id>', 'Get details for a specific recipe')
  .option('--guide', 'Show complete crafting guide with material tree (use with --id)')
  .option('--crafted', 'Mark recipe as crafted (use with --id)')
  .option('-t, --type <craft_type>', 'Filter by craft type (Carpenter, Blacksmith, etc.)')
  .option('--ingredient <name>', 'Find recipes using an ingredient')
  .option('-l, --level <level>', 'Filter by level (±5)')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .action(async (name, options) => {
    await craftCommand(name, options);
  });

// Mount commands
program
  .command('mount [name]')
  .description('Search and track mounts')
  .option('-i, --id <id>', 'Get details for a specific mount')
  .option('--obtained', 'Mark mount as obtained (use with --id)')
  .option('--flying', 'Show flying mounts only')
  .option('--aquatic', 'Show aquatic mounts only')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .option('--note <note>', 'Add a note when marking as obtained')
  .action(async (name, options) => {
    await mountCommand(name, options);
  });

// Minion commands
program
  .command('minion [name]')
  .description('Search and track minions')
  .option('-i, --id <id>', 'Get details for a specific minion')
  .option('--obtained', 'Mark minion as obtained (use with --id)')
  .option('--battle', 'Show battle minions only')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .option('--note <note>', 'Add a note when marking as obtained')
  .action(async (name, options) => {
    await minionCommand(name, options);
  });

// Orchestrion commands
program
  .command('orchestrion [name]')
  .description('Search and track orchestrion rolls')
  .option('-i, --id <id>', 'Get details for a specific orchestrion roll')
  .option('--obtained', 'Mark orchestrion roll as obtained (use with --id)')
  .option('--limit <limit>', 'Limit number of results (default: 20)')
  .option('--note <note>', 'Add a note when marking as obtained')
  .action(async (name, options) => {
    await orchestrionCommand(name, options);
  });

// Collection stats command
program
  .command('collection')
  .description('View collection statistics (mounts, minions, orchestrion)')
  .action(async () => {
    await collectionCommand();
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

/**
 * Progress Command
 *
 * View player progress statistics
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { getPlayerProfileService } from '../services/playerProfile.js';

export interface ProgressCommandOptions {
  quests?: boolean;
  fish?: boolean;
  jobs?: boolean;
  recent?: boolean;
}

export async function progressCommand(options: ProgressCommandOptions): Promise<void> {
  const profileService = getPlayerProfileService();
  const character = profileService.getActiveCharacter();

  if (!character) {
    console.log(chalk.red('No active character.'));
    console.log(chalk.yellow('Use "eorzea character --add" to add a character first.\n'));
    return;
  }

  const stats = profileService.getProgressStats(character.id, 20);

  console.log(chalk.bold.cyan(`\n=== Progress for ${character.name} ===\n`));

  // Show quests if no specific option or --quests
  if ((!options.fish && !options.jobs && !options.recent) || options.quests) {
    showQuestProgress(stats);
  }

  // Show fish if no specific option or --fish
  if ((!options.quests && !options.jobs && !options.recent) || options.fish) {
    showFishProgress(stats);
  }

  // Show jobs if no specific option or --jobs
  if ((!options.quests && !options.fish && !options.recent) || options.jobs) {
    showJobProgress(stats);
  }

  // Show recent activity if requested or no specific option
  if (options.recent || (!options.quests && !options.fish && !options.jobs)) {
    showRecentActivity(stats);
  }

  console.log('');
}

function showQuestProgress(stats: any): void {
  console.log(chalk.bold.yellow('📜 Quest Progress\n'));

  const percentage = stats.questCompletionPercentage;
  const barLength = 30;
  const filledLength = Math.round((percentage / 100) * barLength);
  const bar =
    chalk.green('█'.repeat(filledLength)) + chalk.gray('░'.repeat(barLength - filledLength));

  console.log(`  ${bar} ${percentage.toFixed(1)}%`);
  console.log(
    `  ${chalk.green(stats.completedQuests.toLocaleString())} / ${stats.totalQuests.toLocaleString()} quests completed\n`
  );
}

function showFishProgress(stats: any): void {
  console.log(chalk.bold.blue('🎣 Fishing Progress\n'));

  const percentage = stats.fishCompletionPercentage;
  const barLength = 30;
  const filledLength = Math.round((percentage / 100) * barLength);
  const bar =
    chalk.cyan('█'.repeat(filledLength)) + chalk.gray('░'.repeat(barLength - filledLength));

  console.log(`  ${bar} ${percentage.toFixed(1)}%`);
  console.log(
    `  ${chalk.cyan(stats.caughtFish.toLocaleString())} / ${stats.totalFish.toLocaleString()} fish caught`
  );
  console.log(
    `  ${chalk.yellow(stats.bigFishCaught.toLocaleString())} / ${stats.totalBigFish.toLocaleString()} big fish caught\n`
  );
}

function showJobProgress(stats: any): void {
  console.log(chalk.bold.magenta('⚔️  Top Jobs\n'));

  if (stats.topJobs.length === 0) {
    console.log(chalk.gray('  No job data available\n'));
    return;
  }

  const table = new Table({
    head: [chalk.cyan('Job'), chalk.cyan('Level')],
    style: {
      head: [],
      border: [],
    },
    colWidths: [20, 10],
  });

  stats.topJobs.forEach((job: any) => {
    table.push([job.jobName, chalk.green(job.level.toString())]);
  });

  console.log(table.toString());
  console.log('');
}

function showRecentActivity(stats: any): void {
  console.log(chalk.bold.green('📊 Recent Activity\n'));

  if (stats.recentActivity.length === 0) {
    console.log(chalk.gray('  No recent activity\n'));
    return;
  }

  stats.recentActivity.forEach((activity: any) => {
    const date = new Date(activity.timestamp);
    const timeAgo = formatTimeAgo(date);
    const icon = activity.type === 'quest' ? '📜' : '🐟';
    const name = activity.name || `${activity.type} #${activity.id}`;

    console.log(`  ${icon} ${chalk.bold(name)}`);
    console.log(`     ${chalk.gray(timeAgo)}`);

    if (activity.notes) {
      console.log(`     ${chalk.dim('"' + activity.notes + '"')}`);
    }

    console.log('');
  });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30)
    return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

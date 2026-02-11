/**
 * ax clean command - Clean project artifacts
 */

import { existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import prompts from 'prompts';
import { ConfigManager } from '../core/config';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';
import { t } from '../utils/i18n';

export const cleanCommand = new Command('clean')
  .description(t('Clean project artifacts and logs', '清理项目产物与日志'))
  .option('--logs', t('Clean logs only', '仅清理日志'))
  .option('--beads', t('Clean task graph (beads)', '清理任务图 (beads)'))
  .option('--skills', t('Clean local skills', '清理本地技能'))
  .option('--clutter', t('Clean redundant agent folders (.claude, .cursor, etc.)', '清理冗余 Agent 文件夹 (.claude, .cursor 等)'))
  .option('--all', t('Clean all artifacts', '清理所有产物'))
  .option('-y, --yes', t('Skip confirmation', '跳过确认阶段'))
  .action(async (options) => {
    const projectRoot = process.cwd();

    // Use default paths if not in an Axon project, otherwise use config
    let beadsPath = '.beads';
    let skillsPath = '.skills';
    const logsPath = '.axon/logs';

    // Clutter folders (agent specific folders that might explode)
    const clutterFolders = ['.claude', '.cursor', '.continue', '.windsurf', '.agents', '.agent'];

    if (ConfigManager.isAxonProject(projectRoot)) {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.get();
      beadsPath = config.tools.beads.path;
      skillsPath = config.tools.skills.local_path;
    }

    const targets: { name: string; path: string; type: 'dir-content' | 'dir' }[] = [];
    
    // Determine what to clean
    const cleanLogs = options.all || options.logs || (!options.beads && !options.skills && !options.clutter);
    const cleanBeads = options.all || options.beads;
    const cleanSkills = options.all || options.skills;
    const cleanClutter = options.all || options.clutter;

    if (cleanLogs) {
      targets.push({
        name: t('Logs', '日志'),
        path: join(projectRoot, logsPath),
        type: 'dir-content'
      });
    }

    if (cleanBeads) {
      targets.push({
        name: t('Task Graph (Beads)', '任务图 (Beads)'),
        path: join(projectRoot, beadsPath),
        type: 'dir-content'
      });
    }

    if (cleanSkills) {
      targets.push({
        name: t('Local Skills', '本地技能'),
        path: join(projectRoot, skillsPath),
        type: 'dir-content'
      });
    }

    if (cleanClutter) {
      for (const folder of clutterFolders) {
        const folderPath = join(projectRoot, folder);
        if (existsSync(folderPath)) {
          targets.push({
            name: t(`Agent Folder (${folder})`, `Agent 文件夹 (${folder})`),
            path: folderPath,
            type: 'dir'
          });
        }
      }
    }

    // Filter existing targets that actually have content or exist
    const existingTargets = targets.filter(target => {
      if (!existsSync(target.path)) return false;
      if (target.type === 'dir') return true; // Always include if directory exists
      try {
        const files = readdirSync(target.path);
        return files.length > 0;
      } catch {
        return false;
      }
    });

    if (existingTargets.length === 0) {
      logger.info(t('No artifacts found to clean.', '未发现需要清理的产物。'));
      return;
    }

    if (!options.yes) {
      logger.warn(t('The following artifacts will be cleaned:', '以下产物将被清理：'));
      for (const target of existingTargets) {
        console.log(`  ${chalk.dim('-')} ${target.name} (${chalk.cyan(target.path)})`);
      }
      console.log('');

      const response = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: t('Are you sure you want to proceed?', '确认继续清理吗？'),
        initial: false
      });

      if (!response.confirm) {
        logger.info(t('Cleanup cancelled.', '已取消清理。'));
        return;
      }
    }

    logger.title(t('Cleaning Project', '正在清理项目'));

    for (const target of existingTargets) {
      spinner.start(t(`Cleaning ${target.name}...`, `正在清理 ${target.name}...`));
      try {
        if (target.type === 'dir-content') {
          const files = readdirSync(target.path);
          for (const file of files) {
            rmSync(join(target.path, file), { recursive: true, force: true });
          }
        } else {
          rmSync(target.path, { recursive: true, force: true });
        }
        spinner.succeed();
      } catch (error) {
        spinner.fail(t(`Failed to clean ${target.name}: ${(error as Error).message}`, `清理 ${target.name} 失败: ${(error as Error).message}`));
      }
    }

    logger.success(t('Cleanup complete!', '清理完成！'));
  });

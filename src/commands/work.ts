/**
 * ax work command - Execute tasks
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { getNextExecutable, validateGraph } from '../core/beads';
import { ConfigManager } from '../core/config';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';
import { confirm } from '../utils/prompt';
import { progressBar, spinner } from '../utils/spinner';

export const workCommand = new Command('work')
  .description(t('Execute task beads', '执行任务珠子'))
  .option('-i, --interactive', t('Interactive mode (requires confirmation)', '交互模式 (需确认)'))
  .option('--live', t('Real-time streaming output', '实时流式输出'))
  .option('--all', t('Execute all pending tasks', '执行所有待处理任务'))
  .option('--bead <id>', t('Execute specific task', '执行指定任务'))
  .action(async (options) => {
    // Dynamic stats import
    const { BeadsExecutor } = await import('../core/beads');
    const { ensureGitSafety } = await import('../core/git/safe-commit');
    // Initial version check
    const { checkCompatibility } = await import('../core/compat/version-check');
    await checkCompatibility();

    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'WORK_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    // Check Git Safety before starting work
    if (!options.dryRun) {
      await ensureGitSafety({ cwd: projectRoot });
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();

    logger.title('Axon 任务执行');

    // Initialize executor
    const executor = new BeadsExecutor(config, projectRoot);
    const stats = executor.getStats();

    // Show current progress
    console.log(`${chalk.dim('进度:')} ${progressBar(stats.completed, stats.total)}`);
    console.log(
      `${chalk.dim('状态:')} ${stats.completed}/${stats.total} 完成, ${stats.pending} 待处理, ${stats.failed} 失败`,
    );
    logger.blank();

    if (stats.pending === 0 && stats.running === 0) {
      if (stats.completed === stats.total) {
        logger.success('所有任务已完成！');
      } else if (stats.failed > 0) {
        logger.warn(`有 ${stats.failed} 个任务执行失败`);
        logger.info(`使用 ${chalk.cyan('ax status --beads')} 查看详情`);
      }
      return;
    }

    // Execute specific bead
    if (options.bead) {
      const result = await executor.executeById(options.bead);
      if (result.success) {
        logger.success(`任务 ${options.bead} 执行完成`);
      } else {
        throw new AxonError(`任务 ${options.bead} 执行失败: ${result.error}`, 'WORK_ERROR');
      }
      return;
    }

    // Execute all
    if (options.all) {
      logger.info('执行所有待处理任务...');
      const results = await executor.executeAll();
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      logger.blank();
      logger.divider();
      logger.info(`执行完成: ${succeeded} 成功, ${failed} 失败`);
      return;
    }

    // Interactive mode or single execution
    const graph = executor.getGraph();
    const nextBead = getNextExecutable(graph.beads);

    if (!nextBead) {
      logger.warn('没有可执行的任务');
      const validation = validateGraph(graph);
      if (!validation.valid) {
        logger.blank();
        logger.warn('任务图存在问题:');
        for (const err of validation.errors) {
          logger.warn(`  - ${err}`);
        }
      }

      const failed = graph.beads.filter((b) => b.status === 'failed');
      const pending = graph.beads.filter((b) => b.status === 'pending');
      if (failed.length > 0) {
        logger.blank();
        logger.warn(`存在失败任务 (${failed.length} 个)，可能阻塞后续执行:`);
        for (const b of failed.slice(0, 5)) {
          logger.warn(`  - ${b.id}: ${b.title}${b.error ? ` (${b.error})` : ''}`);
        }
        if (failed.length > 5) {
          logger.warn(`  ... 还有 ${failed.length - 5} 个失败任务`);
        }
        logger.info('可尝试重跑失败任务:');
        for (const b of failed.slice(0, 3)) {
          logger.info(`  ${chalk.cyan('ax work --bead')} ${b.id}`);
        }
      }

      if (pending.length > 0) {
        const beadById = new Map(graph.beads.map((b) => [b.id, b]));
        const blocked = pending
          .map((b) => {
            const unmet = b.dependencies
              .map((depId) => {
                const dep = beadById.get(depId);
                if (!dep) return `${depId}(missing)`;
                if (dep.status === 'completed') return null;
                return `${depId}(${dep.status})`;
              })
              .filter((x): x is string => Boolean(x));
            return { bead: b, unmet };
          })
          .filter((x) => x.unmet.length > 0)
          .sort((a, b) => b.unmet.length - a.unmet.length);

        if (blocked.length > 0) {
          logger.blank();
          logger.warn('部分待处理任务被依赖阻塞（展示前 5 个）:');
          for (const item of blocked.slice(0, 5)) {
            logger.warn(`  - ${item.bead.id}: ${item.bead.title}`);
            logger.warn(`    依赖未完成: ${item.unmet.join(', ')}`);
          }
        }
      }

      logger.info('如果确认任务依赖关系不合理，建议重新生成任务图:');
      logger.info(`  ${chalk.cyan('ax plan')}  ${chalk.dim('# 根据当前 OpenSpec 重新拆解')}`);
      return;
    }

    console.log(chalk.bold('下一个任务:'));
    console.log(`  ${chalk.cyan('ID:')} ${nextBead.id}`);
    console.log(`  ${chalk.cyan('标题:')} ${nextBead.title}`);
    console.log(`  ${chalk.cyan('描述:')} ${nextBead.description}`);
    console.log(`  ${chalk.cyan('预计 tokens:')} ${nextBead.estimated_tokens.toLocaleString()}`);
    if (nextBead.skills_required.length > 0) {
      console.log(`  ${chalk.cyan('需要技能:')} ${nextBead.skills_required.join(', ')}`);
    }
    logger.blank();

    // Confirm in interactive mode
    if (options.interactive) {
      const proceed = await confirm({
        message: '执行此任务？',
        default: true,
      });
      if (!proceed) {
        logger.info('已取消');
        return;
      }
    }

    // Execute
    spinner.start(`执行任务 ${nextBead.id}...`);
    const result = await executor.executeNext();
    spinner.stop();

    if (result?.success) {
      logger.success(`任务 ${nextBead.id} 执行完成！`);
      console.log(`  ${chalk.dim('Token 消耗:')} ${result.tokensUsed.toLocaleString()}`);
      console.log(`  ${chalk.dim('成本:')} $${result.cost.toFixed(4)}`);
      if (result.artifacts.files.length > 0) {
        console.log(`  ${chalk.dim('生成文件:')}`);
        result.artifacts.files.forEach((f) => console.log(`    ${chalk.green('+')} ${f}`));
      }

      // Next steps
      const newStats = executor.getStats();
      logger.blank();
      console.log(`${chalk.dim('进度:')} ${progressBar(newStats.completed, newStats.total)}`);

      if (newStats.pending > 0) {
        logger.blank();
        console.log(`${chalk.bold('继续执行:')} ${chalk.cyan('ax work')}`);
      }
    } else if (result) {
      throw new AxonError(`任务执行失败: ${result.error}`, 'WORK_ERROR');
    }
  });

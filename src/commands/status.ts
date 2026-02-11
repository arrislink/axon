/**
 * ax status command - Show project status
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { getGraphStats, getNextExecutable, validateGraph } from '../core/beads';
import { ConfigManager } from '../core/config';
import type { BeadsGraph } from '../types';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';
import { progressBar } from '../utils/spinner';

export const statusCommand = new Command('status')
  .description(t('Show project status', '显示项目状态'))
  .option('--json', t('Output in JSON format', 'JSON 格式输出'))
  .option('--beads', t('Show task progress only', '仅显示任务进度'))
  .option('--cost', t('Show cost statistics only', '仅显示成本统计'))
  .action(async (options) => {
    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'STATUS_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();

    // Load graph if exists
    const graphPath = join(projectRoot, config.tools.beads.path, 'graph.json');
    let graph: BeadsGraph | null = null;
    if (existsSync(graphPath)) {
      try {
        graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
      } catch {
        // Invalid graph
      }
    }

    // Check spec
    const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');
    const hasSpec = existsSync(specPath);

    // Prepare status data
    const status = {
      project: config.project.name,
      spec: hasSpec,
      beads: graph ? getGraphStats(graph) : null,
      cost: graph
        ? {
            total_estimated_tokens: graph.metadata.total_estimated_tokens,
            total_cost_usd: graph.metadata.total_cost_usd,
          }
        : null,
      last_updated: graph?.metadata.updated_at || null,
    };

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    // Beads only
    if (options.beads && graph) {
      const stats = getGraphStats(graph);
      console.log(`进度: ${progressBar(stats.completed, stats.total)}`);
      console.log(`完成: ${stats.completed}/${stats.total}`);
      console.log(`失败: ${stats.failed}`);
      console.log(`待处理: ${stats.pending}`);
      return;
    }

    // Cost only
    if (options.cost && graph) {
      console.log(`预计 tokens: ${graph.metadata.total_estimated_tokens.toLocaleString()}`);
      console.log(`预计成本: $${graph.metadata.total_cost_usd.toFixed(2)}`);
      return;
    }

    // Full status
    console.log(`📊 ${chalk.bold('Axon 项目状态')} - ${chalk.cyan(config.project.name)}`);
    logger.divider();

    // Spec status
    if (hasSpec) {
      const specContent = readFileSync(specPath, 'utf-8');
      console.log(`\n📝 ${chalk.bold('规格文档')}: ${chalk.green('✓ 已创建')}`);
      console.log(`   └─ ${specContent.length} 字符`);
    } else {
      console.log(`\n📝 ${chalk.bold('规格文档')}: ${chalk.yellow('未创建')}`);
      console.log(`   └─ 运行 ${chalk.cyan('ax spec init')} 创建`);
    }

    // Beads status
    if (graph) {
      const stats = getGraphStats(graph);
      console.log(`\n🔗 ${chalk.bold('任务进度')}: ${progressBar(stats.completed, stats.total)}`);
      console.log(`   └─ ${stats.completed}/${stats.total} 珠子已完成`);

      if (stats.failed > 0) {
        console.log(`   └─ ${chalk.red(`${stats.failed} 个失败`)}`);
      }
      if (stats.running > 0) {
        console.log(`   └─ ${chalk.yellow(`${stats.running} 个进行中`)}`);
      }

      // Cost
      console.log(`\n💰 ${chalk.bold('成本估算')}:`);
      console.log(`   ├─ 预计 tokens: ${graph.metadata.total_estimated_tokens.toLocaleString()}`);
      console.log(`   └─ 预计成本: $${graph.metadata.total_cost_usd.toFixed(2)}`);

      // Last activity
      if (graph.metadata.updated_at) {
        const updated = new Date(graph.metadata.updated_at);
        console.log(`\n⏱️  ${chalk.bold('最后更新')}: ${updated.toLocaleString()}`);
      }

      // Current queue
      const pending = graph.beads.filter((b) => b.status === 'pending');
      const nextExecutable = getNextExecutable(graph.beads);

      if (pending.length > 0) {
        console.log(`\n${chalk.bold('任务队列')}:`);

        // Show completed
        const completed = graph.beads.filter((b) => b.status === 'completed');
        for (const bead of completed.slice(-3)) {
          console.log(`  ${chalk.green('[✅]')} ${bead.id}: ${bead.title}`);
        }

        // Show next
        if (nextExecutable) {
          console.log(
            `  ${chalk.yellow('[⏳]')} ${nextExecutable.id}: ${nextExecutable.title} ${chalk.dim('(下一个)')}`,
          );
        }

        // Show pending
        const remaining = pending.filter((b) => b.id !== nextExecutable?.id).slice(0, 3);
        for (const bead of remaining) {
          console.log(`  ${chalk.dim('[⏸️]')} ${bead.id}: ${bead.title}`);
        }

        if (pending.length > 4) {
          console.log(chalk.dim(`  ... 还有 ${pending.length - 4} 个任务`));
        }
      }

      const validation = validateGraph(graph);
      if (!validation.valid) {
        console.log(`\n${chalk.bold('任务图诊断')}: ${chalk.red('存在问题')}`);
        for (const err of validation.errors.slice(0, 5)) {
          console.log(`  ${chalk.red('•')} ${err}`);
        }
        if (validation.errors.length > 5) {
          console.log(chalk.dim(`  ... 还有 ${validation.errors.length - 5} 项问题`));
        }
      }
    } else {
      console.log(`\n🔗 ${chalk.bold('任务图')}: ${chalk.yellow('未生成')}`);
      console.log(`   └─ 运行 ${chalk.cyan('ax plan')} 生成任务图`);
    }

    logger.divider();
    logger.blank();
  });

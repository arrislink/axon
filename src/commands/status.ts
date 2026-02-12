/**
 * ax status command - Show project status (Axon 2.0)
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { Planner } from '../core/planning';
import { t } from '../utils/i18n';


export const statusCommand = new Command('status')
  .description(t('Show project status', '显示项目状态'))
  .option('--json', t('Output in JSON format', 'JSON 格式输出'))
  .action(async (options) => {
    const projectRoot = process.cwd();
    const planner = new Planner(projectRoot);

    // Load spec
    const spec = planner.loadSpec();
    const specPath = join(projectRoot, '.openspec', 'spec.md');
    const hasSpec = existsSync(specPath);

    // Load graph
    const graph = planner.loadGraph();

    const status = {
      hasSpec,
      specTitle: spec?.title || null,
      graph: graph
        ? {
            total: graph.beads.length,
            completed: graph.metadata.completed_beads,
            pending: graph.beads.filter((b) => b.status === 'pending').length,
            failed: graph.metadata.failed_beads,
          }
        : null,
    };

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(status, null, 2));
      return;
    }

    // Display status
    console.log(`📊 ${chalk.bold('Axon 2.0 状态')}`);

    if (spec) {
      console.log(`\n📝 ${chalk.bold('规格文档')}: ${chalk.green(spec.title)}`);
    } else {
      console.log(`\n📝 ${chalk.bold('规格文档')}: ${chalk.yellow('未创建')}`);
    }

    if (graph) {
      const stats = graph.metadata;
      const progress = Math.round((stats.completed_beads / stats.total_beads) * 100) || 0;

      console.log(`\n🔗 ${chalk.bold('任务进度')}: ${progress}%`);
      console.log(`   ${chalk.green('✓')} ${stats.completed_beads} 完成`);
      console.log(`   ${chalk.red('✗')} ${stats.failed_beads} 失败`);
      console.log(
        `   ${chalk.yellow('⏳')} ${stats.total_beads - stats.completed_beads - stats.failed_beads} 待处理`,
      );

      // Show next executable bead
      const next = planner.getNextExecutableBead(graph);
      if (next) {
        console.log(`\n${chalk.bold('下一个任务')}:`);
        console.log(`   ${chalk.cyan(next.id)}: ${next.description}`);
      }
    } else {
      console.log(`\n🔗 ${chalk.bold('任务图')}: ${chalk.yellow('未生成')}`);
      console.log(`   运行 ${chalk.cyan('ax drive "<task>"')} 创建任务`);
    }

    console.log('');
  });

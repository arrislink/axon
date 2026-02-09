/**
 * ax work command - Execute tasks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../core/config';
import { BeadsExecutor } from '../core/beads';
import { logger } from '../utils/logger';
import { spinner, progressBar } from '../utils/spinner';
import { confirm } from '../utils/prompt';
import { AxonError } from '../utils/errors';

export const workCommand = new Command('work')
    .description('执行任务珠子')
    .option('-i, --interactive', '交互模式 (需确认)')
    .option('--live', '实时流式输出')
    .option('--all', '执行所有待处理任务')
    .option('--bead <id>', '执行指定任务')
    .action(async (options) => {
        const projectRoot = process.cwd();

        if (!ConfigManager.isAxonProject(projectRoot)) {
            throw new AxonError('当前目录不是 Axon 项目', 'WORK_ERROR', [
                '请先运行 `ax init` 初始化项目',
            ]);
        }

        // Check API key
        const apiKey = process.env['ANTHROPIC_API_KEY'];
        if (!apiKey) {
            throw new AxonError('未设置 ANTHROPIC_API_KEY', 'WORK_ERROR', [
                '设置环境变量: export ANTHROPIC_API_KEY=sk-ant-...',
            ]);
        }

        const configManager = new ConfigManager(projectRoot);
        const config = configManager.get();

        logger.title('Axon 任务执行');

        // Initialize executor
        const executor = new BeadsExecutor(config, projectRoot, apiKey);
        const stats = executor.getStats();

        // Show current progress
        console.log(`${chalk.dim('进度:')} ${progressBar(stats.completed, stats.total)}`);
        console.log(
            `${chalk.dim('状态:')} ${stats.completed}/${stats.total} 完成, ${stats.pending} 待处理, ${stats.failed} 失败`
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
        const nextBead = graph.beads.find(
            (b) =>
                b.status === 'pending' &&
                b.dependencies.every((d) => {
                    const dep = graph.beads.find((x) => x.id === d);
                    return dep?.status === 'completed';
                })
        );

        if (!nextBead) {
            logger.warn('没有可执行的任务');
            logger.info('可能存在依赖循环或所有任务已完成');
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

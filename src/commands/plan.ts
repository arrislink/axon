/**
 * ax plan command - Generate task graph from spec
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { ConfigManager } from '../core/config';
import { AxonError } from '../utils/errors';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';

export const planCommand = new Command('plan')
    .description('从规格文档生成任务图')
    .option('--visualize', '在浏览器中可视化')
    .option('--output <path>', '自定义输出路径')
    .option('--model <name>', '指定使用的模型')
    .option('--dry-run', '只验证，不生成')
    .action(async (options) => {
        // Dynamic import for performance
        const { BeadsGenerator, validateGraph } = await import('../core/beads');
        // Initial version check
        const { checkCompatibility } = await import('../core/compat/version-check');
        await checkCompatibility();

        const projectRoot = process.cwd();

        if (!ConfigManager.isAxonProject(projectRoot)) {
            throw new AxonError('当前目录不是 Axon 项目', 'PLAN_ERROR', [
                '请先运行 `ax init` 初始化项目',
            ]);
        }

        const configManager = new ConfigManager(projectRoot);
        const config = configManager.get();

        // Check spec file
        const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');
        if (!existsSync(specPath)) {
            throw new AxonError('规格文档不存在', 'PLAN_ERROR', [
                '使用 `ax spec init` 创建规格文档',
            ]);
        }

        // No longer needed - LLM client auto-detects mode
        // API key checking is done internally by AxonLLMClient

        if (options.dryRun) {
            logger.info('执行空运行模式...');
        }

        logger.title('Axon 任务规划');

        // Read spec
        spinner.start('读取规格文档');
        const specContent = readFileSync(specPath, 'utf-8');
        spinner.succeed(`规格文档: ${specContent.length} 字符`);

        if (options.dryRun) {
            logger.success('空运行完成，规格文档有效');
            return;
        }

        // Generate tasks
        spinner.start('调用 AI 拆解任务...');
        const generator = new BeadsGenerator(config);
        const graph = await generator.generateFromSpec(specContent);
        spinner.succeed(`生成 ${graph.beads.length} 个任务`);

        // Validate
        spinner.start('验证任务图');
        const validation = validateGraph(graph);
        if (!validation.valid) {
            spinner.fail('任务图验证失败');
            validation.errors.forEach((err) => console.log(`  ${chalk.red('•')} ${err}`));
            throw new AxonError('任务图验证失败', 'PLAN_ERROR');
        }
        spinner.succeed('任务图验证通过');

        // Save graph
        const graphPath = options.output || join(projectRoot, config.tools.beads.path, 'graph.json');
        const graphDir = dirname(graphPath);
        if (!existsSync(graphDir)) {
            mkdirSync(graphDir, { recursive: true });
        }
        writeFileSync(graphPath, JSON.stringify(graph, null, 2), 'utf-8');

        // Summary
        logger.blank();
        logger.divider();
        logger.success('任务图生成完成！');
        logger.blank();

        console.log(chalk.dim('任务统计:'));
        console.log(`  总任务数:     ${chalk.bold(graph.beads.length)}`);
        console.log(
            `  预计 tokens:  ${chalk.bold(graph.metadata.total_estimated_tokens.toLocaleString())}`
        );
        console.log(`  预计成本:     ${chalk.bold('$' + graph.metadata.total_cost_usd.toFixed(2))}`);

        console.log(chalk.dim('任务列表:'));
        for (const bead of graph.beads.slice(0, 10)) {
            const deps = bead.dependencies.length > 0 ? chalk.dim(` (依赖: ${bead.dependencies.join(', ')})`) : '';
            console.log(`  ${chalk.cyan(bead.id)}: ${bead.title}${deps}`);
        }
        if (graph.beads.length > 10) {
            console.log(chalk.dim(`  ... 还有 ${graph.beads.length - 10} 个任务`));
        }

        logger.blank();
        console.log(chalk.bold('下一步:'));
        console.log(`  ${chalk.cyan('ax work')}           - 开始执行任务`);
        console.log(`  ${chalk.cyan('ax work --interactive')} - 交互模式执行`);
        console.log(`  ${chalk.cyan('ax status')}         - 查看项目状态`);
        logger.blank();

        // Visualize option
        if (options.visualize) {
            logger.info('可视化功能即将推出...');
        }
    });

/**
 * ax spec command - Manage project specifications
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';

export const specCommand = new Command('spec').description(
  t('Manage project specifications', '管理项目规格文档'),
);

// ax spec init
specCommand
  .command('init')
  .description(t('Create project specification interactively', '交互式创建项目规格'))
  .option('--from-file <path>', t('Import from existing document', '从现有文档导入'))
  .option('--no-ai', t('Do not use AI generation', '不使用 AI 生成'))
  .action(async (options) => {
    // Dynamic import
    const { SpecCollector, SpecGenerator } = await import('../core/spec');

    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'SPEC_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();
    const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');

    // Check if spec already exists
    if (existsSync(specPath)) {
      const content = readFileSync(specPath, 'utf-8');
      if (content.trim().length > 200) {
        logger.warn('规格文档已存在');
        logger.info(`路径: ${chalk.cyan(specPath)}`);
        logger.info(`使用 ${chalk.cyan('ax spec edit')} 编辑现有规格`);
        return;
      }
    }

    // Import from file
    if (options.fromFile) {
      spinner.start('导入现有文档');
      if (!existsSync(options.fromFile)) {
        spinner.fail();
        throw new AxonError(`文件不存在: ${options.fromFile}`, 'SPEC_ERROR');
      }
      const content = readFileSync(options.fromFile, 'utf-8');
      await Bun.write(specPath, content);
      spinner.succeed(`规格文档已从 ${options.fromFile} 导入`);
      return;
    }

    const enableAI = options.ai !== false;

    // Collect requirements
    const collector = new SpecCollector();
    const collected = await collector.collect();

    // Generate spec document
    spinner.start('生成规格文档');
    const generator = new SpecGenerator(enableAI);
    const specContent = await generator.generate(collected);
    await generator.save(specContent, specPath);
    spinner.succeed();

    logger.blank();
    logger.success('规格文档已生成！');
    logger.info(`路径: ${chalk.cyan(specPath)}`);
    logger.blank();
    console.log(chalk.bold('下一步:'));
    console.log(`  1. 审阅并编辑 ${chalk.cyan('.openspec/spec.md')}`);
    console.log(`  2. ${chalk.cyan('ax plan')} - 生成任务图`);
  });

// ax spec edit
specCommand
  .command('edit')
  .description(t('Edit the project specification', '编辑项目规格文档'))
  .action(async () => {
    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'SPEC_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();
    const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');

    if (!existsSync(specPath)) {
      throw new AxonError('规格文档不存在', 'SPEC_ERROR', ['使用 `ax spec init` 创建规格文档']);
    }

    const content = readFileSync(specPath, 'utf-8');
    spinner.start('打开编辑器');

    try {
      // Dynamic import to avoid circular dependency
      const { editor } = await import('../utils/prompt');
      const edited = await editor('编辑规格文档:', content);

      if (edited !== content) {
        await Bun.write(specPath, edited);
        spinner.succeed('规格文档已保存');
      } else {
        spinner.stop();
        logger.info('未做任何更改');
      }
    } catch (error) {
      spinner.fail();
      throw new AxonError('编辑规格文档失败', 'SPEC_ERROR', [
        error instanceof Error ? error.message : '未知错误',
      ]);
    }
  });

// ax spec show
specCommand
  .command('show')
  .description(t('Display the current specification', '显示当前规格文档'))
  .action(() => {
    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'SPEC_ERROR');
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();
    const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');

    if (!existsSync(specPath)) {
      logger.warn('规格文档不存在');
      logger.info(`使用 ${chalk.cyan('ax spec init')} 创建规格文档`);
      return;
    }

    const content = readFileSync(specPath, 'utf-8');
    console.log(content);
  });

// ax spec validate
specCommand
  .command('validate')
  .description(t('Validate specification completeness', '验证规格文档完整性'))
  .action(() => {
    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'SPEC_ERROR');
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();
    const specPath = join(projectRoot, config.tools.openspec.path, 'spec.md');

    if (!existsSync(specPath)) {
      throw new AxonError('规格文档不存在', 'SPEC_ERROR', ['使用 `ax spec init` 创建规格文档']);
    }

    const content = readFileSync(specPath, 'utf-8');
    const issues: string[] = [];

    // Basic validation
    if (content.length < 100) {
      issues.push('规格文档内容太少');
    }
    if (!content.includes('##')) {
      issues.push('缺少结构化章节 (## 标题)');
    }
    if (!content.toLowerCase().includes('需求') && !content.toLowerCase().includes('requirement')) {
      issues.push('未找到需求相关内容');
    }

    if (issues.length > 0) {
      logger.warn('规格文档存在以下问题:');
      issues.forEach((issue) => console.log(`  ${chalk.yellow('•')} ${issue}`));
    } else {
      logger.success('规格文档验证通过！');
    }
  });

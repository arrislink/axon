/**
 * ax init command - Initialize a new Axon project
 */

import { Command } from 'commander';
import { existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import chalk from 'chalk';
import { ConfigManager, DEFAULT_DIRECTORIES } from '../core/config';
import { GitOperations } from '../core/integrations/git';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';
import { AxonError } from '../utils/errors';

export const initCommand = new Command('init')
    .description('初始化新的 Axon 项目')
    .argument('[project-name]', '项目名称', '.')
    .option('-t, --template <name>', '使用模板 (web, api, cli)', 'default')
    .option('--skip-install', '跳过依赖安装')
    .option('--skip-git', '跳过 Git 初始化')
    .action(async (projectName: string, options) => {
        const projectPath = projectName === '.' ? process.cwd() : join(process.cwd(), projectName);
        const name = projectName === '.' ? basename(process.cwd()) : projectName;

        logger.title('Axon 项目初始化');

        // Check if already initialized
        if (ConfigManager.isAxonProject(projectPath)) {
            throw new AxonError('项目已初始化', 'INIT_ERROR', [
                `目录 ${projectPath} 已存在 .axon 配置`,
                '使用 `ax doctor` 检查项目状态',
            ]);
        }

        // Create project directory if needed
        if (!existsSync(projectPath)) {
            spinner.start(`创建项目目录 ${chalk.cyan(name)}`);
            mkdirSync(projectPath, { recursive: true });
            spinner.succeed();
        }

        // Create directory structure
        spinner.start('创建目录结构');
        for (const dir of DEFAULT_DIRECTORIES) {
            const fullPath = join(projectPath, dir);
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }
        }
        spinner.succeed();

        // Initialize configuration
        spinner.start('生成配置文件');
        ConfigManager.initialize(projectPath, name);
        spinner.succeed();

        // Create README
        spinner.start('生成 README.md');
        const readme = generateReadme(name);
        await Bun.write(join(projectPath, 'README.md'), readme);
        spinner.succeed();

        // Create initial spec template
        spinner.start('创建规格模板');
        const specContent = `# ${name} 规格文档

## 项目概述

(待填写)

## 功能需求

(待填写)

## 技术架构

(待填写)

---

> 使用 \`ax spec init\` 交互式生成规格文档
`;
        await Bun.write(join(projectPath, '.openspec', 'spec.md'), specContent);
        spinner.succeed();

        // Initialize Git
        if (!options.skipGit) {
            spinner.start('初始化 Git 仓库');
            const git = new GitOperations(projectPath);
            if (!git.isGitRepo()) {
                await git.init();
                await git.createGitignore();
                await git.initialCommit();
            }
            spinner.succeed();
        }

        // Summary
        logger.blank();
        logger.divider();
        logger.success(`项目 ${chalk.bold(name)} 初始化完成！`);
        logger.blank();

        console.log(chalk.dim('已创建以下结构:'));
        console.log(`  ${chalk.cyan('.axon/')}        - 配置和元数据`);
        console.log(`  ${chalk.cyan('.openspec/')}     - 规格文档`);
        console.log(`  ${chalk.cyan('.beads/')}        - 任务图`);
        console.log(`  ${chalk.cyan('.skills/')}       - 本地技能库`);
        console.log(`  ${chalk.cyan('README.md')}      - 项目说明`);

        logger.blank();
        console.log(chalk.bold('下一步:'));
        console.log(`  1. ${chalk.cyan('cd ' + (projectName === '.' ? '' : projectName))}`);
        console.log(`  2. ${chalk.cyan('ax spec init')}  - 定义项目规格`);
        console.log(`  3. ${chalk.cyan('ax plan')}       - 生成任务图`);
        console.log(`  4. ${chalk.cyan('ax work')}       - 开始执行任务`);
        logger.blank();
    });

function generateReadme(name: string): string {
    return `# ${name}

> 由 [Axon](https://github.com/axon) 创建的 AI 辅助开发项目

## 开始

\`\`\`bash
# 定义项目规格
ax spec init

# 生成任务图
ax plan

# 开始执行任务
ax work
\`\`\`

## 项目结构

- \`.axon/\` - Axon 配置
- \`.openspec/\` - 项目规格文档
- \`.beads/\` - 任务依赖图
- \`.skills/\` - 本地技能模板

## 常用命令

| 命令 | 说明 |
|------|------|
| \`ax status\` | 查看项目状态 |
| \`ax work\` | 执行下一个任务 |
| \`ax skills search <query>\` | 搜索技能模板 |
| \`ax doctor\` | 诊断环境问题 |

---

由 🧠 Axon 提供支持
`;
}

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
import prompts from 'prompts';

import { t } from '../utils/i18n';

export const initCommand = new Command('init')
    .description(t('Initialize a new Axon project', '初始化新的 Axon 项目'))
    .argument('[project-name]', t('Project name', '项目名称'), '.')
    .option('-t, --template <name>', t('Use template (web, api, cli)', '使用模板 (web, api, cli)'), 'default')
    .option('--skip-install', t('Skip dependency installation', '跳过依赖安装'))
    .option('--skip-git', t('Skip Git initialization', '跳过 Git 初始化'))
    .action(async (projectName: string, options) => {
        const projectPath = projectName === '.' ? process.cwd() : join(process.cwd(), projectName);
        const name = projectName === '.' ? basename(process.cwd()) : projectName;

        logger.title(t('Axon Project Initialization', 'Axon 项目初始化'));

        // Check if already initialized
        if (ConfigManager.isAxonProject(projectPath)) {
            throw new AxonError('项目已初始化', 'INIT_ERROR', [
                `目录 ${projectPath} 已存在 .axon 配置`,
                '使用 `ax doctor` 检查项目状态',
            ]);
        }

        // 1. Detect existing configs
        const existingConfigs = detectExistingConfig(projectPath);
        if (existingConfigs.hasOpenCode || existingConfigs.hasBeads) {
            logger.warn(t('⚠️  Existing configuration detected', '⚠️  检测到现有配置'));
            if (existingConfigs.hasOpenCode) console.log(chalk.dim('  - .opencode/ (OpenCode)'));
            if (existingConfigs.hasBeads) console.log(chalk.dim('  - .beads/ (Beads)'));
            console.log('');

            const response = await prompts({
                type: 'select',
                name: 'action',
                message: t('How to handle existing configuration?', '如何处理现有配置？'),
                choices: [
                    { title: t('Keep it (Merge)', '保留现有配置 (Merge)'), value: 'merge', description: t('Keep existing files, only add Axon config', '保留现有文件，仅添加 Axon 配置') },
                    { title: t('Backup and recreate (Backup)', '备份并创建新配置 (Backup)'), value: 'backup', description: t('Backup existing directories to .backup then recreate', '备份现有目录为 .backup 后重建') },
                    { title: t('Cancel', '取消初始化 (Cancel)'), value: 'cancel' }
                ],
                initial: 0
            });

            if (!response.action || response.action === 'cancel') {
                logger.info(t('Initialization cancelled', '已取消初始化'));
                return;
            }

            if (response.action === 'backup') {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                if (existingConfigs.hasOpenCode) {
                    await Bun.$`mv ${join(projectPath, '.opencode')} ${join(projectPath, `.opencode.backup.${timestamp}`)}`;
                }
                if (existingConfigs.hasBeads) {
                    await Bun.$`mv ${join(projectPath, '.beads')} ${join(projectPath, `.beads.backup.${timestamp}`)}`;
                }
                logger.success(t('✅ Existing configuration backed up', '✅ 已备份现有配置'));
            }
        }

        // Create project directory if needed
        if (!existsSync(projectPath)) {
            spinner.start(t(`Creating project directory ${chalk.cyan(name)}`, `创建项目目录 ${chalk.cyan(name)}`));
            mkdirSync(projectPath, { recursive: true });
            spinner.succeed();
        }

        // 2. Create directory structure
        spinner.start(t('Creating Axon directory structure', '创建 Axon 目录结构'));
        for (const dir of DEFAULT_DIRECTORIES) {
            const fullPath = join(projectPath, dir);
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }
        }
        spinner.succeed();

        // 3. Initialize configuration
        spinner.start(t('Generating configuration file', '生成配置文件'));
        ConfigManager.initialize(projectPath, name);
        spinner.succeed();

        // 4. Create README
        if (!options.skipReadme && !existsSync(join(projectPath, 'README.md'))) {
            spinner.start(t('Generating README.md', '生成 README.md'));
            const readme = generateReadme(name);
            await Bun.write(join(projectPath, 'README.md'), readme);
            spinner.succeed();
        }

        // 5. Generate GETTING_STARTED.md (Optimization)
        spinner.start(t('Generating Quick Start guide', '生成入门指南'));
        const gettingStarted = generateGettingStarted(name);
        await Bun.write(join(projectPath, 'GETTING_STARTED.md'), gettingStarted);
        spinner.succeed();

        // 6. Create initial spec template
        if (!existsSync(join(projectPath, '.openspec', 'spec.md'))) {
            spinner.start(t('Creating specification template', '创建规格模板'));
            const specContent = t(`# ${name} Specification\n\n(To be filled)\n`, `# ${name} 规格文档\n\n(待填写)\n`);
            await Bun.write(join(projectPath, '.openspec', 'spec.md'), specContent);
            spinner.succeed();
        }

        // 7. Initialize Git
        if (!options.skipGit) {
            spinner.start(t('Initializing Git repository', '初始化 Git 仓库'));
            const git = new GitOperations(projectPath);
            if (!git.isGitRepo()) {
                await git.init();
                await git.createGitignore();
                await git.initialCommit();
            }
            spinner.succeed();
        }

        // 8. Skill Onboarding
        try {
            const { SkillRecommender } = await import('../core/skills/recommender');
            const recommender = new SkillRecommender(projectPath, '.skills');
            const stack = await recommender.detectTechStack();

            if (stack.length > 0) {
                const recommendations = await recommender.recommendForStack(stack);
                if (recommendations.length > 0) {
                    logger.blank();
                    logger.info(chalk.bold(t('🚀 Tech Stack Detected:', '🚀 检测到技术栈:')) + ` ${stack.join(', ')}`);

                    const response = await prompts({
                        type: 'multiselect',
                        name: 'skills',
                        message: t('Would you like to install recommended expert skills?', '是否安装推荐的专家技能？'),
                        choices: recommendations.map(name => ({
                            title: name,
                            value: name,
                            selected: true
                        })),
                        hint: t('- Space to select, Enter to confirm', '- 空格选择，回车确认')
                    });

                    if (response.skills && response.skills.length > 0) {
                        if (response.skills && response.skills.length > 0) {
                            const { spawnSync } = await import('child_process');
                            // Install from the official Axon skills repository
                            // TODO: Make this configurable or discoverable
                            const packageSource = 'arrislink/axon-skills';

                            spinner.start(t('Installing recommended skills...', '正在安装推荐技能...'));

                            const args = ['skills', 'add', packageSource, '--yes'];
                            for (const name of response.skills) {
                                args.push('--skill', name);
                            }

                            try {
                                const result = spawnSync('npx', args, { stdio: 'inherit', cwd: projectPath });
                                if (result.status === 0) {
                                    spinner.succeed(t('Skills installed successfully', '技能安装成功'));
                                } else {
                                    spinner.warn(t('Failed to install some skills. Please try manually with `ax skills install`.', '部分技能安装失败，请尝试手动运行 `ax skills install`。'));
                                }
                            } catch (e) {
                                spinner.fail(t('Failed to run npx skills add', '无法运行 npx skills add'));
                            }
                        }
                    }
                }
            }
        } catch (error) {
            logger.debug(`Skill onboarding failed: ${(error as Error).message}`);
        }

        // Summary
        logger.blank();
        logger.divider();
        logger.success(t(`Project ${chalk.bold(name)} initialization complete!`, `项目 ${chalk.bold(name)} 初始化完成！`));
        logger.blank();

        console.log(chalk.dim(t('Created structure:', '已创建以下结构:')));
        console.log(`  ${chalk.cyan('.axon/')}        - ${t('Config and metadata', '配置和元数据')}`);
        console.log(`  ${chalk.cyan('.openspec/')}     - ${t('Specification document', '规格文档')}`);
        console.log(`  ${chalk.cyan('.beads/')}        - ${t('Task graph', '任务图')}`);
        console.log(`  ${chalk.cyan('.skills/')}       - ${t('Local skill library', '本地技能库')}`);
        console.log(`  ${chalk.cyan('GETTING_STARTED.md')} - ${t('Quick Start guide', '入门指南')}`);
        console.log(`  ${chalk.cyan('README.md')}      - ${t('Project description', '项目说明')}`);

        logger.blank();
        console.log(chalk.bold(t('Next steps:', '下一步:')));
        console.log(`  1. ${chalk.cyan('cd ' + (projectName === '.' ? '' : projectName))}`);
        console.log(`  2. ${chalk.cyan('cat GETTING_STARTED.md')}  - ${t('Read Quick Start guide', '阅读入门指南')}`);
        console.log(`  3. ${chalk.cyan('ax spec init')}        - ${t('Define project specification', '定义项目规格')}`);
        console.log(`  4. ${chalk.cyan('ax plan')}             - ${t('Generate task graph', '生成任务图')}`);
        logger.blank();
    });

function generateGettingStarted(name: string): string {
    return t(`# ${name} - Axon Quick Start

## 1. Configure Provider
Axon uses OhMyOpenCode (OMO) to manage LLM Providers.

\`\`\`bash
# Install OMO (if not already installed)
bunx oh-my-opencode install

# Configure Provider (Antigravity recommended)
bunx oh-my-opencode config set-provider antigravity

# Test connection
ax config test
\`\`\`

## 2. Define Requirements
\`\`\`bash
ax spec init
\`\`\`

## 3. Generate Plan
\`\`\`bash
ax plan
\`\`\`

## 4. Start Working
\`\`\`bash
ax work
\`\`\`

For more documentation, see [README.md](./README.md).
`, `# ${name} - Axon 快速入门

## 1. 配置 Provider
Axon 使用 OhMyOpenCode (OMO) 管理 LLM Provider。

\`\`\`bash
# 安装 OMO (如果尚未安装)
bunx oh-my-opencode install

# 配置 Provider (推荐 Antigravity)
bunx oh-my-opencode config set-provider antigravity

# 测试连接
ax config test
\`\`\`

## 2. 定义需求
\`\`\`bash
ax spec init
\`\`\`

## 3. 生成计划
\`\`\`bash
ax plan
\`\`\`

## 4. 开始工作
\`\`\`bash
ax work
\`\`\`

更多文档请查看 [README.md](./README.md)。
`);
}

function generateReadme(name: string): string {
    return t(`# ${name}

> AI-assisted development project created by [Axon](https://github.com/arrislink/axon)

## Getting Started

\`\`\`bash
# Define project specification
ax spec init

# Generate task graph
ax plan

# Start executing tasks
ax work
\`\`\`

## Project Structure

- \`.axon/\` - Axon configuration
- \`.openspec/\` - Project specification document
- \`.beads/\` - Task dependency graph
- \`.skills/\` - Local skill templates

## Common Commands

| Command | Description |
|------|------|
| \`ax status\` | View project status |
| \`ax work\` | Execute next task |
| \`ax skills search <query>\` | Search skill templates |
| \`ax doctor\` | Diagnose environment issues |

---

Powered by 🧠 Axon
`, `# ${name}

> 由 [Axon](https://github.com/arrislink/axon) 创建的 AI 辅助开发项目

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
`);
}

function detectExistingConfig(projectPath: string) {
    return {
        hasOpenCode: existsSync(join(projectPath, '.opencode')),
        hasBeads: existsSync(join(projectPath, '.beads')),
    };
}

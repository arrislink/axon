import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { FlowRunner } from '../core/flow';
import type { FlowStage, SkillsEnsureMode } from '../core/flow';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const flowCommand = new Command('flow').description(t('Run end-to-end workflow', '运行端到端工作流'));

flowCommand
  .command('run')
  .description(t('Run workflow stages in order', '按阶段顺序运行工作流'))
  .option(
    '--stages <list>',
    t('Comma-separated stages', '逗号分隔的阶段列表'),
  )
  .option(
    '--skills <mode>',
    t('Skills mode: off|suggest|auto', 'Skills 模式: off|suggest|auto'),
    'suggest',
  )
  .option('--work <mode>', t('Work mode: next|all', '执行模式: next|all'), 'all')
  .option('--description <text>', t('Project description', '项目描述'))
  .option('--project-type <type>', t('Project type', '项目类型'))
  .option('--tech-stack <stack>', t('Tech stack', '技术栈'))
  .option('--features <list>', t('Comma-separated features', '逗号分隔的功能列表'))
  .option('--requirements <text>', t('Additional requirements', '补充需求'))
  .action(async (options) => {
    const projectRoot = process.cwd();
    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'FLOW_ERROR', ['请先运行 `ax init` 初始化项目']);
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();

    const stages = options.stages
      ? (options.stages as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const skillsMode = options.skills as SkillsEnsureMode;
    if (!['off', 'suggest', 'auto'].includes(skillsMode)) {
      throw new AxonError(`无效的 skills 模式: ${skillsMode}`, 'FLOW_ERROR');
    }

    const runner = new FlowRunner(projectRoot, config);
    const result = await runner.run({
      stages: stages as FlowStage[] | undefined,
      skillsMode,
      input: {
        description: options.description,
        projectType: options.projectType,
        techStack: options.techStack,
        features: options.features
          ? (options.features as string)
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        additionalRequirements: options.requirements,
      },
      work: { mode: options.work === 'next' ? 'next' : 'all' },
    });

    logger.title(t('Flow finished', '流程完成'));
    console.log(`${chalk.dim('阶段:')} ${result.stagesExecuted.join(', ')}`);

    const entries = Object.entries(result.artifacts).filter(([, v]) => v);
    if (entries.length > 0) {
      logger.blank();
      console.log(chalk.bold(t('Artifacts', '产物')));
      for (const [k, v] of entries) {
        console.log(`  ${chalk.cyan(k)}: ${chalk.green(typeof v === 'string' ? v : '[object]')}`);
      }
    }
  });


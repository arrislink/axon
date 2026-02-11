import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import type { AxonConfig, BeadsGraph } from '../../types';
import type { CollectedSpec } from '../../types/spec';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { BeadsExecutor } from '../beads/executor';
import { BeadsGenerator } from '../beads/generator';
import { ConfigManager } from '../config/manager';
import { AxonLLMClient } from '../llm';
import { SkillsLibrary } from '../skills/library';
import { SpecAnalyzer } from '../spec/analyzer';
import { SpecGenerator } from '../spec/generator';
import type { CheckResult } from '../verify/check-runner';
import { CheckRunner } from '../verify/check-runner';
import { buildVerifyMarkdown } from '../verify/requirements-verifier';
import { type FlowStage, type SkillsEnsureMode, SkillsPolicy } from './skills-policy';
import type { FlowContext, FlowRunOptions, FlowRunResult } from './types';

const DEFAULT_STAGES: FlowStage[] = [
  'spec_generate',
  'prd_generate',
  'tech_select',
  'design_generate',
  'plan_generate',
  'work_execute',
  'run_checks',
  'verify_requirements',
];

export class FlowRunner {
  private projectRoot: string;
  private config: AxonConfig;
  private configManager: ConfigManager;
  private llm: AxonLLMClient;
  private skillsLibrary: SkillsLibrary;
  private skillsPolicy: SkillsPolicy;

  constructor(projectRoot: string, config: AxonConfig) {
    this.projectRoot = projectRoot;
    this.config = config;
    this.configManager = new ConfigManager(this.projectRoot);
    this.llm = new AxonLLMClient();

    this.skillsLibrary = new SkillsLibrary(this.configManager.getAllSkillsPaths());
    this.skillsPolicy = new SkillsPolicy(this.skillsLibrary);
  }

  async run(options: Omit<FlowRunOptions, 'projectRoot' | 'config'>): Promise<FlowRunResult> {
    const stages = options.stages?.length ? options.stages : DEFAULT_STAGES;
    const skillsMode: SkillsEnsureMode = options.skillsMode || 'suggest';

    const context: FlowContext = {
      projectRoot: this.projectRoot,
      config: this.config,
      options: { ...options, projectRoot: this.projectRoot, config: this.config },
      artifacts: {},
      lastChecks: [],
    };

    const stagesExecuted: FlowStage[] = [];

    for (const stage of stages) {
      try {
        const stageName = this.getStageDisplayName(stage);
        logger.info(
          `${chalk.yellow('➜')} ${t('Executing stage:', '正在执行阶段:')} ${chalk.bold(stageName)}...`,
        );

        await this.executeStage(stage, context, skillsMode);
        stagesExecuted.push(stage);
        logger.success(`${t('Stage finished:', '阶段已完成:')} ${chalk.bold(stageName)}`);
        logger.blank();
      } catch (error) {
        console.error(`Error in stage ${stage}:`, error);
        throw error;
      }
    }

    return { stagesExecuted, artifacts: context.artifacts };
  }

  private getStageDisplayName(stage: FlowStage): string {
    const names: Record<FlowStage, string> = {
      spec_generate: t('Specification Generation', '生成规格文档'),
      prd_generate: t('PRD Generation', '生成 PRD'),
      tech_select: t('Technology Selection', '技术选型'),
      design_generate: t('Architecture Design', '架构设计'),
      plan_generate: t('Task Planning', '任务规划'),
      work_execute: t('Task Execution', '任务执行'),
      run_checks: t('Running Checks', '运行检查'),
      verify_requirements: t('Verifying Requirements', '验证需求'),
    };
    return names[stage] || stage;
  }

  private async executeStage(
    stage: FlowStage,
    context: FlowContext,
    skillsMode: SkillsEnsureMode,
  ): Promise<void> {
    switch (stage) {
      case 'spec_generate':
        context.artifacts.specPath = await this.stageSpecGenerate(context, skillsMode);
        break;
      case 'prd_generate':
        context.artifacts.prdPath = await this.stagePrdGenerate(context, skillsMode);
        break;
      case 'tech_select':
        context.artifacts.techPath = await this.stageTechSelect(context, skillsMode);
        break;
      case 'design_generate':
        context.artifacts.architecturePath = await this.stageDesignGenerate(context, skillsMode);
        break;
      case 'plan_generate':
        context.artifacts.graphPath = await this.stagePlanGenerate(context, skillsMode);
        break;
      case 'work_execute': {
        const mode = context.options.work?.mode || 'all';
        context.artifacts.workResults =
          mode === 'next' ? await this.stageWorkNext(context) : await this.stageWorkAll(context);
        break;
      }
      case 'run_checks':
        context.lastChecks = this.stageRunChecks(context);
        break;
      case 'verify_requirements':
        context.artifacts.verifyPath = this.stageVerify(context);
        break;
    }
  }

  private ensureDir(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private specPath(): string {
    return this.configManager.getSpecPath();
  }

  private graphPath(): string {
    return this.configManager.getGraphPath();
  }

  private async stageSpecGenerate(
    context: FlowContext,
    _skillsMode: SkillsEnsureMode,
  ): Promise<string> {
    const targetPath = this.specPath();
    const input = context.options.input || {};

    const collected: CollectedSpec = {
      description: input.description || context.config.project.name || 'Project',
      projectType: input.projectType || 'other',
      techStack: input.techStack || 'auto',
      features: input.features || [],
      additionalRequirements: input.additionalRequirements || '',
    };

    const generator = new SpecGenerator(true);
    const content = await generator.generate(collected);
    this.ensureDir(targetPath);
    await generator.save(content, targetPath);
    return targetPath;
  }

  private async stagePrdGenerate(
    context: FlowContext,
    skillsMode: SkillsEnsureMode,
  ): Promise<string> {
    const specPath = this.specPath();
    const prdPath = join(context.projectRoot, 'PRD.md');

    if (!existsSync(specPath)) {
      throw new Error(`Stage PRD: Spec file not found at ${specPath}`);
    }

    const specContent = readFileSync(specPath, 'utf-8');
    const ensured = await this.skillsPolicy.ensure('prd_generate', skillsMode);
    const skillContext = ensured.resolved
      .map((s) => `[Skill: ${s.metadata.name}]\n${s.content}`)
      .join('\n\n');

    const analyzer = new SpecAnalyzer(context.config);
    const prdContent = await analyzer.analyze(specContent, skillContext);
    this.ensureDir(prdPath);
    writeFileSync(prdPath, prdContent, 'utf-8');
    return prdPath;
  }

  private async stageTechSelect(
    context: FlowContext,
    skillsMode: SkillsEnsureMode,
  ): Promise<string> {
    const prdPath = join(context.projectRoot, 'PRD.md');
    const techPath = join(context.projectRoot, 'TECH.md');

    if (!existsSync(prdPath)) {
      throw new Error(`Stage TECH: PRD file not found at ${prdPath}`);
    }

    const prd = readFileSync(prdPath, 'utf-8');
    const ensured = await this.skillsPolicy.ensure('tech_select', skillsMode);
    const skillContext = ensured.resolved
      .map((s) => `[Skill: ${s.metadata.name}]\n${s.content}`)
      .join('\n\n');

    const prompt = `你是资深技术负责人。请基于以下 PRD，为该项目输出一份精炼的技术选型文档（TECH.md）。\n\n${
      skillContext ? `参考技能:\n${skillContext}\n\n` : ''
    }PRD:\n${prd}\n\n要求:\n- 只输出 Markdown\n- 包含：目标/约束、核心技术栈、关键依赖、替代方案与取舍、风险与缓解\n- 内容简洁可执行`;

    logger.info(t('🔍 Selecting optimal technology stack...', '🔍 正在进行技术选型...'));
    const resp = await this.llm.chat([{ role: 'user', content: prompt }], {
      agent: 'oracle',
      temperature: 0.3,
      maxTokens: 4000,
    });

    this.ensureDir(techPath);
    writeFileSync(techPath, resp.content, 'utf-8');
    return techPath;
  }

  private async stageDesignGenerate(
    context: FlowContext,
    skillsMode: SkillsEnsureMode,
  ): Promise<string> {
    const prdPath = join(context.projectRoot, 'PRD.md');
    const techPath = join(context.projectRoot, 'TECH.md');
    const archPath = join(context.projectRoot, 'ARCHITECTURE.md');

    if (!existsSync(prdPath) || !existsSync(techPath)) {
      throw new Error('Stage DESIGN: PRD or TECH file missing.');
    }

    const prd = readFileSync(prdPath, 'utf-8');
    const tech = readFileSync(techPath, 'utf-8');

    const ensured = await this.skillsPolicy.ensure('design_generate', skillsMode);
    const skillContext = ensured.resolved
      .map((s) => `[Skill: ${s.metadata.name}]\n${s.content}`)
      .join('\n\n');

    const prompt = `你是资深系统架构师。请基于 PRD 与 TECH，为该项目输出一份精炼的技术方案/架构文档（ARCHITECTURE.md）。\n\n${
      skillContext ? `参考技能:\n${skillContext}\n\n` : ''
    }PRD:\n${prd}\n\nTECH:\n${tech}\n\n要求:\n- 只输出 Markdown\n- 包含：模块边界、关键数据流、关键接口/API 草案、数据模型、验收点落地方式\n- 内容简洁可执行`;

    logger.info(t('🔍 Designing system architecture...', '🔍 正在进行架构设计...'));
    const resp = await this.llm.chat([{ role: 'user', content: prompt }], {
      agent: 'oracle',
      temperature: 0.3,
      maxTokens: 5000,
    });

    this.ensureDir(archPath);
    writeFileSync(archPath, resp.content, 'utf-8');
    return archPath;
  }

  private async stagePlanGenerate(
    context: FlowContext,
    skillsMode: SkillsEnsureMode,
  ): Promise<string> {
    const specPath = this.specPath();
    if (!existsSync(specPath)) {
      throw new Error(`Stage PLAN: Spec file not found at ${specPath}`);
    }

    const specContent = readFileSync(specPath, 'utf-8');
    const ensured = await this.skillsPolicy.ensure('plan_generate', skillsMode);
    const skillContext = ensured.resolved
      .map((s) => `[Skill: ${s.metadata.name}]\n${s.content}`)
      .join('\n\n');

    const generator = new BeadsGenerator(context.config);
    const graph = await generator.generateFromSpec(specContent, skillContext);

    const targetPath = this.graphPath();
    this.ensureDir(targetPath);
    writeFileSync(targetPath, JSON.stringify(graph, null, 2), 'utf-8');
    return targetPath;
  }

  private async stageWorkNext(context: FlowContext) {
    const executor = new BeadsExecutor(context.config, context.projectRoot);
    const result = await executor.executeNext();
    return result ? [result] : [];
  }

  private async stageWorkAll(context: FlowContext) {
    const executor = new BeadsExecutor(context.config, context.projectRoot);
    return await executor.executeAll();
  }

  private stageRunChecks(context: FlowContext): CheckResult[] {
    const commands = context.config.verify?.commands || [];
    const runner = new CheckRunner(context.projectRoot, commands);
    return runner.runAll();
  }

  private stageVerify(context: FlowContext): string {
    const specPath = this.specPath();
    const prdPath = join(context.projectRoot, 'PRD.md');
    const verifyPath = join(context.projectRoot, 'VERIFY.md');
    const graphPath = this.graphPath();

    const spec = existsSync(specPath) ? readFileSync(specPath, 'utf-8') : undefined;
    const prd = existsSync(prdPath) ? readFileSync(prdPath, 'utf-8') : undefined;

    let graph: BeadsGraph | undefined;
    if (existsSync(graphPath)) {
      try {
        graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
      } catch (e) {
        console.warn(`Warning: Failed to parse graph.json: ${(e as Error).message}`);
      }
    }

    const md = buildVerifyMarkdown({ spec, prd, graph, checks: context.lastChecks });
    this.ensureDir(verifyPath);
    writeFileSync(verifyPath, md, 'utf-8');
    return verifyPath;
  }
}

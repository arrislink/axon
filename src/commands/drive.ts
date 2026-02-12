import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import { OMOBridge } from '../bridge/omo';
import { UnifiedAnalyzer } from '../core/analysis';
import { ContextBuilder } from '../core/perception/context-builder';
import { Planner } from '../core/planning';
import { EnhancedPlanner } from '../core/planning/enhanced-planner';
import { Verifier } from '../core/verification';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const driveCommand = new Command('drive')
  .description(t('Execute task with AI', 'AI 执行开发任务'))
  .argument('<instruction>', t('Task instruction', '任务指令'))
  .option('--no-verify', t('Skip verification', '跳过验证'))
  .option('--dry-run', t('Preview without executing', '预览不执行'))
  .option('--req <path>', t('Requirement file or directory path', '需求文件或目录路径'))
  .option(
    '--analyze-only',
    t('Only analyze and generate PRD, skip execution', '仅分析生成 PRD，跳过执行'),
  )
  .action(
    async (
      instruction: string,
      options: {
        verify?: boolean;
        dryRun?: boolean;
        req?: string;
        analyzeOnly?: boolean;
      },
    ) => {
      await executeDrive(instruction, options);
    },
  );

async function executeDrive(
  instruction: string,
  options: {
    verify?: boolean;
    dryRun?: boolean;
    req?: string;
    analyzeOnly?: boolean;
  } = {},
): Promise<void> {
  const projectRoot = process.cwd();
  const { dryRun = false, req: reqPath, analyzeOnly = false } = options;

  logger.info(`🚀 Starting Axon Drive: ${instruction}`);

  // Initialize components
  const omoBridge = new OMOBridge(projectRoot);
  const planner = new Planner(projectRoot);
  const verifier = new Verifier(projectRoot);
  const enhancedPlanner = new EnhancedPlanner(projectRoot);

  // Check for existing bead graph
  const existingGraph = planner.loadGraph();
  if (existingGraph) {
    logger.info('Found existing bead graph, resuming...');
    await resumeExecution(projectRoot, omoBridge, verifier, options);
    return;
  }

  // Unified Requirement Analysis
  logger.info('📋 Starting requirement analysis...');
  const analyzer = new UnifiedAnalyzer(projectRoot);
  const analysisResult = await analyzer.analyze({
    userInstruction: instruction,
    reqPath,
  });

  if (!analysisResult.success || !analysisResult.spec) {
    logger.error(`Analysis failed: ${analysisResult.error}`);
    return;
  }

  const { spec, clarificationNeeded, clarificationQuestions } = analysisResult;

  // Display analysis results
  logger.info('\n📊 Analysis Results:');
  logger.info(`  Title: ${spec.metadata.title}`);
  logger.info(`  Entities: ${spec.entities.length}`);
  logger.info(`  Stories: ${spec.stories.length}`);
  logger.info(`  Workflows: ${spec.workflows.length}`);
  logger.info(`  Estimated Effort: ${spec.analysis.estimated_effort}`);

  if (clarificationNeeded && clarificationQuestions && clarificationQuestions.length > 0) {
    logger.warn('\n⚠️  Clarification Recommended:');
    for (const q of clarificationQuestions) {
      logger.info(`   ❓ ${q}`);
    }
    logger.info('\nYou can proceed with current understanding or refine your requirements.');
  }

  // Save the PRD
  const prdPath = join(projectRoot, '.openspec', 'spec.enhanced.json');
  writeFileSync(prdPath, JSON.stringify(spec, null, 2), 'utf-8');
  logger.success(`\n✓ PRD saved to: ${prdPath}`);

  // If analyze-only mode, stop here
  if (analyzeOnly) {
    logger.info('\n🔍 Analysis complete. PRD generated. Skipping execution (--analyze-only).');
    return;
  }

  // Generate beads from spec
  logger.info('\n🎯 Genering implementation beads...');
  const graph = await enhancedPlanner.generateBeads(spec);

  logger.info('\n📈 Bead Graph Summary:');
  logger.info(`  Total Beads: ${graph.analysis.total_beads}`);
  logger.info(`  Critical Path: ${graph.analysis.critical_path_length} beads`);
  logger.info(`  Parallel Groups: ${graph.analysis.parallel_groups}`);
  logger.info(`  Risk Level: ${graph.analysis.risk_level}`);

  if (dryRun) {
    logger.info('\n🔍 Dry run - would execute:');
    for (const phase of graph.execution_plan.phases) {
      logger.info(
        `\n  Phase: ${phase.name} (${phase.can_parallelize ? 'parallel' : 'sequential'})`,
      );
      for (const beadId of phase.beads) {
        const bead = graph.beads.find((b) => b.id === beadId);
        if (bead) {
          logger.info(`    - ${bead.id}: ${bead.title}`);
        }
      }
    }
    return;
  }

  // Execute beads using legacy planner for compatibility
  logger.info('\n⚙️  Starting execution...');
  await executeBeads(projectRoot, omoBridge, verifier, planner, options);
}

async function resumeExecution(
  projectRoot: string,
  omoBridge: OMOBridge,
  verifier: Verifier,
  options: { verify?: boolean; dryRun?: boolean },
): Promise<void> {
  const planner = new Planner(projectRoot);
  await executeBeads(projectRoot, omoBridge, verifier, planner, options);
}

async function executeBeads(
  projectRoot: string,
  omoBridge: OMOBridge,
  verifier: Verifier,
  planner: Planner,
  options: { verify?: boolean; dryRun?: boolean },
): Promise<void> {
  const { verify = true } = options;
  let graph = planner.loadGraph();

  if (!graph) {
    logger.error('No bead graph found');
    return;
  }

  let progressMade = true;
  let maxIterations = graph.beads.length * 2;

  while (progressMade && maxIterations > 0) {
    maxIterations--;
    progressMade = false;

    const nextBead = planner.getNextExecutableBead(graph);
    if (!nextBead) {
      const pending = graph.beads.filter((b) => b.status === 'pending');
      if (pending.length === 0) {
        logger.success('All beads completed!');
        break;
      }
      logger.warn('No executable beads found');
      break;
    }

    logger.info(`Executing: ${nextBead.id} - ${nextBead.description}`);
    planner.updateBeadStatus(nextBead.id, 'running');

    const contextBuilder = new ContextBuilder(projectRoot);
    const beadContext = await contextBuilder.buildContext(
      nextBead.instruction,
      nextBead.skills_required,
    );

    const result = await omoBridge.execute({
      beadId: nextBead.id,
      instruction: nextBead.instruction,
      systemPrompt: beadContext.systemPrompt,
      contextFiles: [],
    });

    if (result.success) {
      logger.success(`Bead ${nextBead.id} completed`);

      if (verify) {
        // Trust but Verify: Axon independently verifies OMO's completion claim
        const verification = await verifier.verifyBead(nextBead.id, nextBead.acceptance_criteria);
        if (!verification.passed) {
          logger.error(`Verification failed: ${nextBead.id}`);
          planner.updateBeadStatus(nextBead.id, 'failed');
        } else {
          planner.updateBeadStatus(nextBead.id, 'completed');
        }
      } else {
        planner.updateBeadStatus(nextBead.id, 'completed');
      }
    } else {
      planner.updateBeadStatus(nextBead.id, 'failed');
      logger.error(`Bead ${nextBead.id} failed: ${result.error}`);
    }

    progressMade = true;
    graph = planner.loadGraph() || graph;
  }

  displayStatus(planner.loadGraph());
}

function displayStatus(graph: ReturnType<typeof Planner.prototype.loadGraph>): void {
  if (!graph) return;

  const stats = graph.metadata;
  const progress = Math.round((stats.completed_beads / stats.total_beads) * 100) || 0;

  logger.info('='.repeat(50));
  logger.info('Execution Complete');
  logger.info('='.repeat(50));
  logger.info(`Total: ${stats.total_beads}`);
  logger.info(`Completed: ${stats.completed_beads}`);
  logger.info(`Failed: ${stats.failed_beads}`);
  logger.info(`Progress: ${progress}%`);
  logger.info('='.repeat(50));
}

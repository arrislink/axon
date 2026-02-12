/**
 * Axon Drive Command - Main Entry Point for Axon 2.0
 *
 * Orchestrates: Perception -> Planning -> Execution -> Verification
 */

import { join } from 'node:path';
import { Command } from 'commander';
import { OMOBridge } from '../bridge/omo';
import { ContextBuilder } from '../core/perception/context-builder';
import { Planner } from '../core/planning';
import { Verifier } from '../core/verification';
import { logger } from '../utils/logger';
import { t } from '../utils/i18n';

export const driveCommand = new Command('drive')
  .description(t('Execute task with AI', 'AI 执行开发任务'))
  .argument('<instruction>', t('Task instruction', '任务指令'))
  .option('--no-verify', t('Skip verification', '跳过验证'))
  .option('--dry-run', t('Preview without executing', '预览不执行'))
  .action(async (instruction: string, options: { verify?: boolean; dryRun?: boolean }) => {
    await executeDrive(instruction, options);
  });

async function executeDrive(
  instruction: string,
  options: { verify?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  const projectRoot = process.cwd();
  const { dryRun = false } = options;

  logger.info(`🚀 Starting Axon Drive: ${instruction}`);

  // Initialize components
  const contextBuilder = new ContextBuilder(projectRoot);
  const omoBridge = new OMOBridge(projectRoot);
  const planner = new Planner(projectRoot);
  const verifier = new Verifier(projectRoot);

  // Check for existing bead graph
  const existingGraph = planner.loadGraph();
  if (existingGraph) {
    logger.info('Found existing bead graph, resuming...');
    await resumeExecution(projectRoot, omoBridge, verifier, options);
    return;
  }

  // Build context
  logger.info('Building context...');
  await contextBuilder.buildContext(instruction, []);

  // Create/Update spec
  let spec = planner.loadSpec();
  if (!spec) {
    logger.warn('No spec found. Creating initial spec...');
    spec = {
      title: 'AI-Driven Task',
      version: '1.0',
      description: instruction,
      requirements: [instruction],
      tech_stack: [],
      constraints: [],
    };

    const specPath = join(projectRoot, '.openspec', 'spec.md');
    const specContent = `# ${spec.title}

## Description
${spec.description}

## Requirements
${spec.requirements.map((r) => `- ${r}`).join('\n')}

## Tech Stack
${spec.tech_stack.map((t) => `- ${t}`).join('\n') || '- TBD'}

## Constraints
${spec.constraints.map((c) => `- ${c}`).join('\n') || '- None specified'}
`;
    require('node:fs').writeFileSync(specPath, specContent, 'utf-8');
    logger.success('Initial spec created');
  }

  // Generate beads
  logger.info('Generating bead graph...');
  const graph = await planner.generateBeadsFromSpec(spec);

  if (dryRun) {
    logger.info('Dry run - would execute:');
    for (const bead of graph.beads) {
      logger.info(`  - ${bead.id}: ${bead.description}`);
    }
    return;
  }

  // Execute beads
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
      planner.updateBeadStatus(nextBead.id, 'completed');
      logger.success(`Bead ${nextBead.id} completed`);

      if (verify) {
        const verification = await verifier.verifyBead(nextBead.id);
        if (!verification.passed) {
          logger.error(`Verification failed: ${nextBead.id}`);
          planner.updateBeadStatus(nextBead.id, 'failed');
        }
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

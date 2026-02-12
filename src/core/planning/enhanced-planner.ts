import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EnhancedBead, EnhancedBeadGraph, EnhancedSpec } from '../../types/enhanced-spec';
import { logger } from '../../utils/logger';
import { RequirementAnalyzer } from '../analysis/requirement-analyzer';
import { LLMClient } from '../llm/client';
import { SkillsManager } from '../perception/skills';

export interface BeadGenerationOptions {
  maxParallelGroups?: number;
  complexityThreshold?: number;
  includeTests?: boolean;
}

export class EnhancedPlanner {
  private projectRoot: string;
  private llmClient: LLMClient;
  private skillsManager: SkillsManager;
  private requirementAnalyzer: RequirementAnalyzer;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.llmClient = new LLMClient();
    this.skillsManager = new SkillsManager(projectRoot);
    this.requirementAnalyzer = new RequirementAnalyzer();
  }

  async generateSpec(userInput: string): Promise<EnhancedSpec> {
    logger.info('Analyzing requirements...');

    const analysisResult = await this.requirementAnalyzer.analyze(userInput);

    if (!analysisResult.success || !analysisResult.analysis) {
      throw new Error(`Requirement analysis failed: ${analysisResult.error}`);
    }

    const analysis = analysisResult.analysis;
    logger.info(
      `Analyzed: ${analysis.key_entities.length} entities, ${analysis.workflows.length} workflows`,
    );

    if (analysis.ambiguity_score > 50) {
      logger.warn(
        `High ambiguity detected (${analysis.ambiguity_score}/100). Clarification recommended.`,
      );
    }

    const skills = await this.skillsManager.loadInstalled();
    const skillsContext = await this.skillsManager.getSkillsContent(skills.slice(0, 3));

    const systemPrompt = this.buildSpecGenerationPrompt(skillsContext);

    const userPrompt = `Create a detailed specification based on this analysis:

Intent: ${analysis.intent}
Scope: ${analysis.scope.in_scope.join(', ')}
Key Entities: ${analysis.key_entities.join(', ')}
Workflows: ${analysis.workflows.join(', ')}
Estimated Effort: ${analysis.estimated_effort}

Original Request: ${userInput}`;

    const response = await this.llmClient.completeJSON<EnhancedSpec>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    if (!response.success || !response.data) {
      throw new Error(`Spec generation failed: ${response.error}`);
    }

    const spec = response.data;
    spec.metadata.created_at = new Date().toISOString();
    spec.metadata.updated_at = new Date().toISOString();
    spec.analysis = analysis;

    await this.saveSpec(spec);
    logger.success(`Generated enhanced spec: ${spec.metadata.title}`);

    return spec;
  }

  async generateBeads(
    spec: EnhancedSpec,
    options: BeadGenerationOptions = {},
  ): Promise<EnhancedBeadGraph> {
    logger.info('Generating beads from enhanced spec...');

    const { maxParallelGroups: _maxParallelGroups = 3 } = options;

    const skills = await this.skillsManager.loadInstalled();
    const skillsContext = await this.skillsManager.getSkillsContent(skills.slice(0, 5));

    const systemPrompt = this.buildBeadGenerationPrompt(skillsContext, spec);

    const storiesContext = spec.stories
      .map((s) => `${s.id}: ${s.action} (priority: ${s.priority})`)
      .join('\n');

    const entitiesContext = spec.entities
      .map((e) => `${e.name}: ${e.attributes.map((a) => a.name).join(', ')}`)
      .join('\n');

    const userPrompt = `Generate implementation beads for this specification:

Title: ${spec.metadata.title}
Description: ${spec.metadata.description}

User Stories:
${storiesContext}

Entities:
${entitiesContext}

Workflows: ${spec.workflows.map((w) => w.name).join(', ')}
Tech Stack: ${spec.implementation.tech_stack.join(', ')}

Create beads that:
1. Implement each user story completely
2. Follow dependencies between entities
3. Respect workflow order
4. Group parallelizable work
5. Include proper complexity estimates`;

    const response = await this.llmClient.completeJSON<{ beads: EnhancedBead[] }>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    if (!response.success || !response.data) {
      throw new Error(`Bead generation failed: ${response.error}`);
    }

    const beads = response.data.beads.map((bead) => ({
      ...bead,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const graph = this.buildBeadGraph(beads, spec);
    await this.saveBeadGraph(graph);

    logger.success(
      `Generated ${beads.length} beads in ${graph.analysis.parallel_groups} parallel groups`,
    );
    return graph;
  }

  private buildSpecGenerationPrompt(skillsContext: string): string {
    return `You are an expert product manager and software architect. Create a comprehensive specification document.

${skillsContext ? `\nReference Skills:\n${skillsContext}\n` : ''}

Generate a specification with these sections:

1. metadata: title, description, status ("draft")
2. personas: 1-3 user personas with goals and pain points
3. stories: User stories mapped to personas with acceptance criteria
4. entities: Core data models with attributes and relationships
5. workflows: Business processes with steps and actors
6. business_rules: Domain constraints and policies
7. technical_constraints: Performance, security, scalability requirements
8. implementation: Tech stack and architecture decisions
9. success_criteria: Measurable outcomes

Output valid JSON matching the EnhancedSpec interface structure.`;
  }

  private buildBeadGenerationPrompt(skillsContext: string, _spec: EnhancedSpec): string {
    return `You are an expert technical lead decomposing a specification into implementation beads (tasks).

${skillsContext ? `\nReference Skills:\n${skillsContext}\n` : ''}

For each bead, provide:
- id: bead_001 format
- title: Short, actionable title
- description: What this bead accomplishes
- instruction: Detailed implementation guidance
- context: related_stories, related_entities, related_workflows, business_rules
- dependencies: Array of {bead_id, type: "hard|soft", reason}
- complexity: {level, story_points, estimated_hours, risk_factors}
- skills_required: Technical skills needed
- files_to_modify: Existing files to change
- files_to_create: New files to create
- acceptance_criteria: Verifiable completion criteria
- priority: critical|high|medium|low
- can_parallelize: boolean
- parallel_group: Group ID if parallelizable

Guidelines:
1. Create 5-15 beads covering all stories
2. Define clear hard/soft dependencies
3. Identify parallelization opportunities
4. Estimate complexity realistically
5. Include specific file paths

Output valid JSON: { "beads": [...] }`;
  }

  private buildBeadGraph(beads: EnhancedBead[], spec: EnhancedSpec): EnhancedBeadGraph {
    const parallelGroups = new Set(
      beads.filter((b) => b.parallel_group).map((b) => b.parallel_group),
    );

    const criticalPath = this.calculateCriticalPath(beads);

    const totalHours = beads.reduce((sum, b) => sum + b.complexity.estimated_hours, 0);

    const riskLevel = this.assessRiskLevel(beads);

    const phases = this.organizeIntoPhases(beads);

    return {
      version: '2.0-enhanced',
      spec_version: spec.version || '1.0',
      generated_at: new Date().toISOString(),
      analysis: {
        total_beads: beads.length,
        critical_path_length: criticalPath.length,
        parallel_groups: parallelGroups.size,
        estimated_total_hours: totalHours,
        risk_level: riskLevel,
      },
      beads,
      execution_plan: { phases },
      metadata: {
        total_beads: beads.length,
        completed_beads: 0,
        failed_beads: 0,
        in_progress_beads: 0,
        blocked_beads: 0,
      },
    };
  }

  private calculateCriticalPath(beads: EnhancedBead[]): string[] {
    const path: string[] = [];
    const visited = new Set<string>();

    const visit = (beadId: string) => {
      if (visited.has(beadId)) return;
      visited.add(beadId);

      const bead = beads.find((b) => b.id === beadId);
      if (!bead) return;

      for (const dep of bead.dependencies) {
        if (dep.type === 'hard') {
          visit(dep.bead_id);
        }
      }

      path.push(beadId);
    };

    for (const bead of beads) {
      visit(bead.id);
    }

    return path;
  }

  private assessRiskLevel(beads: EnhancedBead[]): 'low' | 'medium' | 'high' {
    const highComplexityCount = beads.filter((b) => b.complexity.level === 'very_complex').length;
    const highRiskFactors = beads.filter((b) => b.complexity.risk_factors.length > 2).length;

    if (highComplexityCount > 3 || highRiskFactors > 5) return 'high';
    if (highComplexityCount > 1 || highRiskFactors > 2) return 'medium';
    return 'low';
  }

  private organizeIntoPhases(
    beads: EnhancedBead[],
  ): Array<{ name: string; beads: string[]; can_parallelize: boolean }> {
    const phases: Array<{ name: string; beads: string[]; can_parallelize: boolean }> = [];

    const setupBeads = beads.filter(
      (b) => b.title.toLowerCase().includes('setup') || b.title.toLowerCase().includes('init'),
    );
    if (setupBeads.length > 0) {
      phases.push({
        name: 'Setup & Foundation',
        beads: setupBeads.map((b) => b.id),
        can_parallelize: false,
      });
    }

    const coreBeads = beads.filter(
      (b) =>
        !setupBeads.includes(b) &&
        !b.title.toLowerCase().includes('test') &&
        !b.title.toLowerCase().includes('deploy'),
    );
    if (coreBeads.length > 0) {
      const parallelGroups = new Map<string, string[]>();
      const sequentialBeads: string[] = [];

      for (const bead of coreBeads) {
        if (bead.parallel_group && bead.can_parallelize) {
          const group = parallelGroups.get(bead.parallel_group) || [];
          group.push(bead.id);
          parallelGroups.set(bead.parallel_group, group);
        } else {
          sequentialBeads.push(bead.id);
        }
      }

      if (sequentialBeads.length > 0) {
        phases.push({
          name: 'Core Implementation',
          beads: sequentialBeads,
          can_parallelize: false,
        });
      }

      for (const [groupName, groupBeads] of parallelGroups) {
        phases.push({
          name: `Parallel: ${groupName}`,
          beads: groupBeads,
          can_parallelize: true,
        });
      }
    }

    const testBeads = beads.filter((b) => b.title.toLowerCase().includes('test'));
    if (testBeads.length > 0) {
      phases.push({
        name: 'Testing & Verification',
        beads: testBeads.map((b) => b.id),
        can_parallelize: true,
      });
    }

    return phases;
  }

  async loadSpec(): Promise<EnhancedSpec | null> {
    const specPath = join(this.projectRoot, '.openspec', 'spec.enhanced.json');

    if (!existsSync(specPath)) {
      return null;
    }

    try {
      const content = readFileSync(specPath, 'utf-8');
      return JSON.parse(content) as EnhancedSpec;
    } catch {
      return null;
    }
  }

  private async saveSpec(spec: EnhancedSpec): Promise<void> {
    const specDir = join(this.projectRoot, '.openspec');
    if (!existsSync(specDir)) {
      mkdirSync(specDir, { recursive: true });
    }

    const specPath = join(specDir, 'spec.enhanced.json');
    writeFileSync(specPath, JSON.stringify(spec, null, 2), 'utf-8');
  }

  async loadBeadGraph(): Promise<EnhancedBeadGraph | null> {
    const graphPath = join(this.projectRoot, '.beads', 'graph.enhanced.json');

    if (!existsSync(graphPath)) {
      return null;
    }

    try {
      const content = readFileSync(graphPath, 'utf-8');
      const graph: EnhancedBeadGraph = JSON.parse(content);

      for (const bead of graph.beads) {
        if (bead.status === 'running') {
          bead.status = 'pending';
          bead.updated_at = new Date().toISOString();
          logger.warn(`Resetting interrupted bead: ${bead.id}`);
        }
      }

      return graph;
    } catch {
      return null;
    }
  }

  private async saveBeadGraph(graph: EnhancedBeadGraph): Promise<void> {
    const beadsDir = join(this.projectRoot, '.beads');
    if (!existsSync(beadsDir)) {
      mkdirSync(beadsDir, { recursive: true });
    }

    const graphPath = join(beadsDir, 'graph.enhanced.json');
    writeFileSync(graphPath, JSON.stringify(graph, null, 2), 'utf-8');
  }

  getNextExecutableBeads(graph: EnhancedBeadGraph, limit = 3): EnhancedBead[] {
    const executable: EnhancedBead[] = [];

    for (const bead of graph.beads) {
      if (bead.status !== 'pending') continue;

      const hardDepsMet = bead.dependencies
        .filter((d) => d.type === 'hard')
        .every((d) => {
          const dep = graph.beads.find((b) => b.id === d.bead_id);
          return dep?.status === 'completed';
        });

      if (hardDepsMet) {
        executable.push(bead);
        if (executable.length >= limit) break;
      }
    }

    return executable;
  }

  updateBeadStatus(graph: EnhancedBeadGraph, beadId: string, status: EnhancedBead['status']): void {
    const bead = graph.beads.find((b) => b.id === beadId);
    if (!bead) return;

    bead.status = status;
    bead.updated_at = new Date().toISOString();

    if (status === 'completed') {
      bead.completed_at = new Date().toISOString();
      graph.metadata.completed_beads++;
    } else if (status === 'failed') {
      graph.metadata.failed_beads++;
    }

    this.saveBeadGraph(graph);
  }
}

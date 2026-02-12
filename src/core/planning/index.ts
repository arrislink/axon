/**
 * Planning Layer - Spec and Beads Generation
 *
 * Handles specification parsing and bead graph generation.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../utils/logger';

export interface Bead {
  id: string;
  description: string;
  instruction: string;
  dependsOn: string[];
  skills_required: string[];
  acceptance_criteria: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface BeadGraph {
  version: string;
  generated_at: string;
  spec_version: string;
  beads: Bead[];
  metadata: {
    total_beads: number;
    completed_beads: number;
    failed_beads: number;
  };
}

export interface Spec {
  title: string;
  version: string;
  description: string;
  requirements: string[];
  tech_stack: string[];
  constraints: string[];
}

export class Planner {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Load specification from .openspec/spec.md
   */
  loadSpec(): Spec | null {
    const specPath = join(this.projectRoot, '.openspec', 'spec.md');

    if (!existsSync(specPath)) {
      logger.warn('No spec found at .openspec/spec.md');
      return null;
    }

    try {
      const content = readFileSync(specPath, 'utf-8');
      return this.parseSpec(content);
    } catch (error) {
      logger.error(`Failed to load spec: ${error}`);
      return null;
    }
  }

  /**
   * Parse spec markdown into structured format
   */
  private parseSpec(content: string): Spec {
    const lines = content.split('\n');
    const spec: Spec = {
      title: '',
      version: '1.0',
      description: '',
      requirements: [],
      tech_stack: [],
      constraints: [],
    };

    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('# ')) {
        spec.title = line.replace('# ', '').trim();
      } else if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').toLowerCase();
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '').trim();
        if (currentSection.includes('requirement')) {
          spec.requirements.push(item);
        } else if (currentSection.includes('tech') || currentSection.includes('stack')) {
          spec.tech_stack.push(item);
        } else if (currentSection.includes('constraint')) {
          spec.constraints.push(item);
        } else if (line.length > 10) {
          spec.description += line + '\n';
        }
      }
    }

    spec.description = spec.description.trim();
    return spec;
  }

  /**
   * Load bead graph from .beads/graph.json
   */
  loadGraph(): BeadGraph | null {
    const graphPath = join(this.projectRoot, '.beads', 'graph.json');

    if (!existsSync(graphPath)) {
      return null;
    }

    try {
      const content = readFileSync(graphPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Save bead graph
   */
  saveGraph(graph: BeadGraph): void {
    const graphDir = join(this.projectRoot, '.beads');
    const graphPath = join(graphDir, 'graph.json');

    if (!existsSync(graphDir)) {
      require('node:fs').mkdirSync(graphDir, { recursive: true });
    }

    writeFileSync(graphPath, JSON.stringify(graph, null, 2), 'utf-8');
    logger.success(`Bead graph saved with ${graph.beads.length} beads`);
  }

  /**
   * Create initial bead graph from spec
   */
  async generateBeadsFromSpec(spec: Spec): Promise<BeadGraph> {
    logger.info(`Generating beads from spec: ${spec.title}`);

    const beads: Bead[] = [];

    // Generate beads based on requirements
    for (let i = 0; i < spec.requirements.length; i++) {
      const requirement = spec.requirements[i];
      const beadId = `bead_${String(i + 1).padStart(3, '0')}`;

      const bead: Bead = {
        id: beadId,
        description: requirement,
        instruction: this.generateInstruction(spec, requirement),
        dependsOn: i === 0 ? [] : [`bead_${String(i).padStart(3, '0')}`],
        skills_required: this.inferSkills(spec.tech_stack, requirement),
        acceptance_criteria: this.generateAcceptanceCriteria(requirement),
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      beads.push(bead);
    }

    const graph: BeadGraph = {
      version: '2.0',
      generated_at: new Date().toISOString(),
      spec_version: spec.version,
      beads,
      metadata: {
        total_beads: beads.length,
        completed_beads: 0,
        failed_beads: 0,
      },
    };

    this.saveGraph(graph);
    return graph;
  }

  /**
   * Generate instruction for a bead
   */
  private generateInstruction(spec: Spec, requirement: string): string {
    return `Implement the following feature based on the project specification:

Requirement: ${requirement}

Project: ${spec.title}
Tech Stack: ${spec.tech_stack.join(', ')}

Ensure your implementation:
1. Follows the existing code patterns
2. Includes appropriate tests
3. Meets the acceptance criteria

Return [[AXON_STATUS:COMPLETED]] when done.`;
  }

  /**
   * Infer required skills based on tech stack and requirement
   */
  private inferSkills(techStack: string[], requirement: string): string[] {
    const skills: string[] = [];
    const lowerReq = requirement.toLowerCase();

    // Map tech keywords to skills
    const skillKeywords: Record<string, string[]> = {
      typescript: ['typescript', 'type-safety'],
      react: ['react', 'frontend'],
      api: ['rest', 'api-design'],
      auth: ['authentication', 'jwt'],
      database: ['sql', 'database'],
      test: ['testing', 'vitest'],
    };

    for (const [tech, skillList] of Object.entries(skillKeywords)) {
      if (techStack.some((t) => t.toLowerCase().includes(tech))) {
        skills.push(...skillList);
      }
      if (lowerReq.includes(tech)) {
        skills.push(...skillList);
      }
    }

    return [...new Set(skills)];
  }

  /**
   * Generate acceptance criteria for a requirement
   */
  private generateAcceptanceCriteria(requirement: string): string[] {
    return [
      `Implementation complete for: ${requirement}`,
      'Code follows project conventions',
      'Tests pass',
      'No lint errors',
    ];
  }

  /**
   * Get next executable bead (status=pending with all dependencies met)
   */
  getNextExecutableBead(graph: BeadGraph): Bead | null {
    for (const bead of graph.beads) {
      if (bead.status !== 'pending') continue;

      // Check if all dependencies are completed
      const depsCompleted = bead.dependsOn.every((depId) => {
        const dep = graph.beads.find((b) => b.id === depId);
        return dep?.status === 'completed';
      });

      if (depsCompleted) {
        return bead;
      }
    }

    return null;
  }

  /**
   * Update bead status in graph
   */
  updateBeadStatus(beadId: string, status: Bead['status']): void {
    const graph = this.loadGraph();
    if (!graph) return;

    const bead = graph.beads.find((b) => b.id === beadId);
    if (bead) {
      bead.status = status;
      bead.updated_at = new Date().toISOString();

      // Update metadata
      if (status === 'completed') {
        graph.metadata.completed_beads++;
      } else if (status === 'failed') {
        graph.metadata.failed_beads++;
      }

      this.saveGraph(graph);
    }
  }
}

import type { Skill } from '../../types';
import { SkillsLibrary } from '../skills/library';

export type FlowStage =
  | 'spec_generate'
  | 'prd_generate'
  | 'tech_select'
  | 'design_generate'
  | 'plan_generate'
  | 'work_execute'
  | 'run_checks'
  | 'verify_requirements';

export type SkillsEnsureMode = 'off' | 'suggest' | 'auto';

export interface EnsureSkillsResult {
  required: string[];
  resolved: Skill[];
  missing: string[];
  suggestedCommands: string[];
}

export interface SkillsPolicyOptions {
  stageDefaults?: Partial<Record<FlowStage, string[]>>;
}

export class SkillsPolicy {
  private library: SkillsLibrary;
  private stageDefaults: Record<FlowStage, string[]>;

  constructor(library: SkillsLibrary, options?: SkillsPolicyOptions) {
    this.library = library;
    this.stageDefaults = {
      spec_generate: ['brainsstorm'],
      prd_generate: ['brainsstorm'],
      tech_select: ['architecture-patterns', 'api-design-principles'],
      design_generate: ['architecture-patterns'],
      plan_generate: ['writing-plans'],
      work_execute: [],
      run_checks: ['verification-before-completion'],
      verify_requirements: ['test-driven-development', 'verification-before-completion'],
      ...(options?.stageDefaults || {}),
    };
  }

  getDefaultSkills(stage: FlowStage): string[] {
    return [...(this.stageDefaults[stage] || [])];
  }

  async ensure(stage: FlowStage, mode: SkillsEnsureMode): Promise<EnsureSkillsResult> {
    const required = this.getDefaultSkills(stage);
    if (mode === 'off' || required.length === 0) {
      return { required, resolved: [], missing: [], suggestedCommands: [] };
    }

    const resolved: Skill[] = [];
    const missing: string[] = [];

    for (const name of required) {
      const found = await this.library.search(name, 1);
      if (found.length > 0 && found[0].skill.metadata.name.toLowerCase().includes(name.toLowerCase())) {
        resolved.push(found[0].skill);
      } else {
        missing.push(name);
      }
    }

    const suggestedCommands =
      missing.length === 0
        ? []
        : [
            ...missing.map((s) => `ax skills find ${s}`),
            ...missing.map((s) => `ax skills search ${s}`),
            'ax skills install <org/repo>  # 使用 npx skills add 安装官方技能包',
          ];

    if (mode === 'auto') {
      return { required, resolved, missing, suggestedCommands };
    }

    return { required, resolved, missing, suggestedCommands };
  }
}


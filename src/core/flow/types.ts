import type { AxonConfig, BeadExecutionResult } from '../../types';
import type { FlowStage, SkillsEnsureMode } from './skills-policy';
import type { CheckResult } from '../verify/check-runner';

export interface FlowInput {
  description?: string;
  projectType?: string;
  techStack?: string;
  features?: string[];
  additionalRequirements?: string;
}

export interface FlowRunOptions {
  projectRoot: string;
  config: AxonConfig;
  stages?: FlowStage[];
  skillsMode?: SkillsEnsureMode;
  input?: FlowInput;
  work?: {
    mode?: 'next' | 'all';
  };
}

export interface FlowRunArtifacts {
  specPath?: string;
  prdPath?: string;
  techPath?: string;
  architecturePath?: string;
  graphPath?: string;
  workResults?: BeadExecutionResult[];
  verifyPath?: string;
}

export interface FlowContext {
  projectRoot: string;
  config: AxonConfig;
  options: FlowRunOptions;
  artifacts: FlowRunArtifacts;
  lastChecks: CheckResult[];
}

export interface FlowRunResult {
  stagesExecuted: FlowStage[];
  artifacts: FlowRunArtifacts;
}


/**
 * Core Module Exports - Axon 2.0
 */

export { DocumentManager } from './docs/manager';
export {
  ContextBuilder,
  type BuiltContext,
  type ContextBuilderOptions,
} from './perception/context-builder';
export { Repomod, type RepomodOptions, type RepomodResult } from './perception/repomod';
export { SkillsManager, type Skill, type SkillsMatchResult } from './perception/skills';
export { Planner, type Bead, type BeadGraph, type Spec } from './planning';
export { Verifier, type VerificationResult, type VerificationConfig } from './verification';

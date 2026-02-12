/**
 * Perception Layer - Axon 2.0
 *
 * Responsible for gathering context from:
 * - Repomod: Codebase context (XML format)
 * - Docs: Business context
 * - skills.sh: Best practices and patterns
 */

export { Repomod } from './repomod';
export { SkillsManager } from './skills';
export { ContextBuilder } from './context-builder';

export interface PerceptionResult {
  codeContext: string; // Repomod XML output
  docsContext: string; // Business documentation
  skillsContext: string; // Matched skills
  preferences: string; // User preferences from prefs.md
}

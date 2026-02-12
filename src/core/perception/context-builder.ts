/**
 * Context Builder - Aggregates all perception inputs
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../../utils/logger';
import { DocumentManager } from '../docs/manager';
import { Repomod, type RepomodOptions } from './repomod';
import { SkillsManager } from './skills';

export interface ContextBuilderOptions {
  includeCode?: boolean;
  includeDocs?: boolean;
  includeSkills?: boolean;
  includePrefs?: boolean;
  repomodOptions?: RepomodOptions;
}

export interface BuiltContext {
  systemPrompt: string;
  codeContext: string;
  docsContext: string;
  skillsContext: string;
  preferences: string;
}

export class ContextBuilder {
  private projectRoot: string;
  private repomod: Repomod;
  private skillsManager: SkillsManager;
  private docsManager: DocumentManager;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.repomod = new Repomod(projectRoot);
    this.skillsManager = new SkillsManager(projectRoot);
    this.docsManager = new DocumentManager(projectRoot);
  }

  async buildContext(
    beadDescription: string,
    requiredSkills: string[] = [],
    options: ContextBuilderOptions = {},
  ): Promise<BuiltContext> {
    const {
      includeCode = true,
      includeDocs = true,
      includeSkills = true,
      includePrefs = true,
      repomodOptions = {},
    } = options;

    logger.info('Building context for bead...');

    const [codeContext, docsContext, skillsContext, preferences] = await Promise.all([
      includeCode ? this.buildCodeContext(repomodOptions) : '',
      includeDocs ? this.buildDocsContext() : '',
      includeSkills ? this.buildSkillsContext(beadDescription, requiredSkills) : '',
      includePrefs ? this.loadPreferences() : '',
    ]);

    return {
      systemPrompt: this.assembleSystemPrompt(preferences, skillsContext),
      codeContext,
      skillsContext,
      docsContext,
      preferences,
    };
  }

  private async buildCodeContext(options: RepomodOptions): Promise<string> {
    const result = await this.repomod.generateContext(options);
    if (result.success) {
      return result.context;
    }
    logger.warn('Failed to generate code context, continuing without it');
    return '';
  }

  private async buildDocsContext(): Promise<string> {
    const docs = this.docsManager.list();
    if (docs.length === 0) return '';

    const lines = ['## Project Documentation'];
    for (const doc of docs) {
      lines.push(`\n### ${doc.title}`);
      lines.push(doc.content?.slice(0, 10000) || '');
    }
    return lines.join('\n');
  }

  private async buildSkillsContext(description: string, requiredSkills: string[]): Promise<string> {
    const allSkills = await this.skillsManager.loadInstalled();
    const matchedSkills = await this.skillsManager.matchForBead(
      description,
      requiredSkills,
      allSkills,
    );
    return this.skillsManager.getSkillsContent(matchedSkills);
  }

  private async loadPreferences(): Promise<string> {
    const prefsPath = join(this.projectRoot, '.axon', 'prefs.md');
    if (!existsSync(prefsPath)) return '';

    const content = readFileSync(prefsPath, 'utf-8');
    const lines = ['## User Preferences (Must Follow)'];
    lines.push(content);
    return lines.join('\n');
  }

  private assembleSystemPrompt(preferences: string, skillsContext: string): string {
    const parts: string[] = [];
    if (preferences) parts.push(preferences);
    if (skillsContext) parts.push(skillsContext);

    parts.push(
      `
## Completion Signal (Required)
When you have completed the task and verified it passes tests, output exactly: [[AXON_STATUS:COMPLETED]]
If you cannot fix errors after retries, output: [[AXON_STATUS:FAILED:Reason]]
    `.trim(),
    );

    return parts.join('\n\n');
  }
}

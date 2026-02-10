/**
 * Skill Recommender - Proactively suggests skills based on context
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export class SkillRecommender {
  private projectRoot: string;
  private localSkillsPath: string;

  constructor(projectRoot: string, localSkillsPath: string) {
    this.projectRoot = projectRoot;
    this.localSkillsPath = localSkillsPath;
  }

  /**
   * Recommend skills based on file types or directory content
   */
  async recommendForFiles(filePaths: string[]): Promise<string[]> {
    const recommendations: Set<string> = new Set();

    const hasPDF = filePaths.some((p) => p.toLowerCase().endsWith('.pdf'));
    const hasDocx = filePaths.some((p) => p.toLowerCase().endsWith('.docx'));
    const hasMarkdown = filePaths.some((p) => p.toLowerCase().endsWith('.md'));

    if (hasPDF) recommendations.add('pdf');
    if (hasDocx || hasMarkdown) recommendations.add('docs');

    // Add more complex logic here (e.g., scanning content keywords)

    return Array.from(recommendations);
  }

  /**
   * Detect technology stack based on project files
   */
  public async detectTechStack(): Promise<string[]> {
    const stack: string[] = [];

    // package.json (Node/Frontend)
    const pkgPath = join(this.projectRoot, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps.react || deps.vue || deps.next) stack.push('frontend');
        if (deps.typescript) stack.push('typescript');
        stack.push('nodejs');
      } catch {}
    }

    // go.mod (Go)
    if (existsSync(join(this.projectRoot, 'go.mod'))) stack.push('go', 'backend');

    // composer.json (PHP)
    if (existsSync(join(this.projectRoot, 'composer.json'))) stack.push('php', 'backend');

    return stack;
  }

  /**
   * Recommend skills based on detected tech stack
   */
  public async recommendForStack(stack: string[]): Promise<string[]> {
    const recommendations: Set<string> = new Set();

    if (stack.includes('frontend')) {
      recommendations.add('ui/ux-pro-max');
      recommendations.add('frontend-best-practices');
    }

    if (stack.includes('backend')) {
      recommendations.add('backend-architecture');
      recommendations.add('api-design-standards');
    }

    if (stack.includes('typescript') || stack.includes('nodejs')) {
      recommendations.add('node-best-practices');
    }

    return Array.from(recommendations);
  }

  /**
   * Recommend skills for a specific command
   */
  async recommendForCommand(command: string): Promise<string[]> {
    if (command === 'plan') {
      return ['write-plan', 'brainsstorm'];
    }
    if (command === 'docs') {
      return ['docs', 'search-index'];
    }
    return [];
  }

  /**
   * Check if recommended skills are already installed
   */
  async getMissingSkills(names: string[]): Promise<string[]> {
    const missing: string[] = [];
    for (const name of names) {
      const localPath = join(this.projectRoot, this.localSkillsPath, `${name}.md`);
      if (!existsSync(localPath)) {
        missing.push(name);
      }
    }
    return missing;
  }

  /**
   * Show suggestions to the user
   */
  async suggest(skills: string[]): Promise<void> {
    const missing = await this.getMissingSkills(skills);
    if (missing.length === 0) return;

    logger.blank();
    logger.info(chalk.bold(t('💡 Suggested Skills:', '💡 建议安装的技能:')));
    for (const name of missing) {
      console.log(
        `  ${chalk.cyan('•')} ${chalk.bold(name)} - ${t(`Use \`ax skills install ${name}\` to adopt this expertise.`, `使用 \`ax skills install ${name}\` 引入该领域专家知识。`)}`,
      );
    }
    logger.blank();
  }
}

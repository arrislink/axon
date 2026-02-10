/**
 * Skill Recommender - Proactively suggests skills based on context
 */

import { logger } from '../../utils/logger';
import { t } from '../../utils/i18n';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';

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

        const hasPDF = filePaths.some(p => p.toLowerCase().endsWith('.pdf'));
        const hasDocx = filePaths.some(p => p.toLowerCase().endsWith('.docx'));
        const hasMarkdown = filePaths.some(p => p.toLowerCase().endsWith('.md'));

        if (hasPDF) recommendations.add('pdf');
        if (hasDocx || hasMarkdown) recommendations.add('docs');

        // Add more complex logic here (e.g., scanning content keywords)

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
            console.log(`  ${chalk.cyan('•')} ${chalk.bold(name)} - ${t('Use `ax skills install ' + name + '` to adopt this expertise.', '使用 `ax skills install ' + name + '` 引入该领域专家知识。')}`);
        }
        logger.blank();
    }
}

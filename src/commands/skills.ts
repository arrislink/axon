/**
 * ax skills command - Manage skills (Axon 2.0)
 *
 * Wraps skills.sh for discovery and uses local SkillsManager for matching.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { SkillsManager } from '../core/perception/skills';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const skillsCommand = new Command('skills').description(
  t('Manage skills library', '管理技能库'),
);

// ax skills find
skillsCommand
  .command('find [query]')
  .description(t('Find skills from skills.sh', '从 skills.sh 查找技能'))
  .action(async (query: string) => {
    const args = ['npx', 'skills', 'find'];
    if (query) args.push(query);
    execSync(args.join(' '), { stdio: 'inherit' });
  });

// ax skills add
skillsCommand
  .command('add <source>')
  .description(t('Install a skill from skills.sh', '从 skills.sh 安装技能'))
  .action(async (source: string) => {
    logger.info(`Installing skill: ${source}`);
    try {
      execSync(`npx skills add ${source} -a opencode -y`, { stdio: 'inherit' });
      logger.success(`Installed: ${source}`);
    } catch {
      logger.error(`Failed to install: ${source}`);
    }
  });

// ax skills list
skillsCommand
  .command('list')
  .description(t('List installed skills', '列出已安装的技能'))
  .action(async () => {
    const projectRoot = process.cwd();
    const manager = new SkillsManager(projectRoot);
    const skills = await manager.list();

    console.log(`\n${chalk.bold('Installed Skills')}\n`);

    if (skills.length === 0) {
      console.log(chalk.dim('No skills installed.\n'));
      console.log(`Use ${chalk.cyan('ax skills add <name>')} to install.\n`);
      return;
    }

    for (const skill of skills.slice(0, 20)) {
      console.log(`${chalk.cyan('•')} ${chalk.bold(skill.name)}`);
      console.log(`  ${chalk.dim(skill.description || 'No description')}`);
      if (skill.tags?.length) {
        console.log(`  ${chalk.dim('Tags:')} ${skill.tags.join(', ')}`);
      }
      console.log('');
    }

    if (skills.length > 20) {
      console.log(chalk.dim(`... and ${skills.length - 20} more\n`));
    }
  });

// ax skills show
skillsCommand
  .command('show <name>')
  .description(t('Show skill details', '显示技能详情'))
  .action(async (name: string) => {
    const projectRoot = process.cwd();
    const manager = new SkillsManager(projectRoot);
    const skills = await manager.loadInstalled();

    const skill = skills.find((s) => s.name.toLowerCase() === name.toLowerCase());

    if (!skill) {
      logger.error(`Skill not found: ${name}`);
      return;
    }

    console.log(`\n${chalk.bold(skill.name)}\n`);
    console.log(`${chalk.dim('Description:')} ${skill.description || 'N/A'}`);
    console.log(`${chalk.dim('Tags:')} ${skill.tags?.join(', ') || 'None'}`);
    console.log(`${chalk.dim('Source:')} ${skill.source}\n`);
    console.log(chalk.dim('--- Content ---'));
    console.log(skill.content.slice(0, 1000));
    console.log('\n');
  });

// ax skills init
skillsCommand
  .command('init <name>')
  .description(t('Create a new skill', '创建新技能'))
  .action(async (name: string) => {
    const projectRoot = process.cwd();
    const skillPath = join(projectRoot, '.skills', name);

    if (existsSync(skillPath)) {
      logger.error(`Skill already exists: ${name}`);
      return;
    }

    mkdirSync(skillPath, { recursive: true });

    const skillContent = `---
name: ${name}
description: 
tags: [custom]
---

## Implementation

Describe the best practice or pattern here.

## Examples

\`\`\`typescript
// Your code example here
\`\`\`
`;

    writeFileSync(join(skillPath, 'SKILL.md'), skillContent, 'utf-8');
    logger.success(`Created skill: ${skillPath}`);
  });

/**
 * ax init command - Initialize Axon 2.0 project
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { t } from '../utils/i18n';


export const initCommand = new Command('init')
  .description(t('Initialize Axon 2.0 project', '初始化 Axon 2.0 项目'))
  .argument('[name]', 'Project name', '.')
  .action(async (name: string) => {
    const projectPath = name === '.' ? process.cwd() : join(process.cwd(), name);
    const projectName = name === '.' ? basename(process.cwd()) : name;

    console.log(`\n${chalk.bold('🚀 初始化 Axon 2.0 项目')}\n`);

    // Check if already initialized
    if (existsSync(join(projectPath, '.axon'))) {
      console.log(`${chalk.yellow('⚠️')} 项目已初始化\n`);
      return;
    }

    // Create directory structure
    const dirs = ['.axon', '.beads', '.openspec', '.skills'];
    for (const dir of dirs) {
      const fullPath = join(projectPath, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    }

    // Create default config
    const configContent = `# Axon 2.0 Configuration
project:
  name: ${projectName}
  version: 1.0.0

tools:
  repomix:
    style: xml
  verification:
    test_command: bun test
    type_check: bun run type-check
`;
    writeFileSync(join(projectPath, '.axon', 'config.yaml'), configContent, 'utf-8');

    // Create default spec
    const specContent = `# ${projectName}

## Description
Auto-generated specification for ${projectName}.

## Requirements
- TBD

## Tech Stack
- TBD
`;
    writeFileSync(join(projectPath, '.openspec', 'spec.md'), specContent, 'utf-8');

    // Create empty bead graph
    const graphContent = JSON.stringify(
      {
        version: '2.0',
        generated_at: new Date().toISOString(),
        beads: [],
        metadata: { total_beads: 0, completed_beads: 0, failed_beads: 0 },
      },
      null,
      2,
    );
    writeFileSync(join(projectPath, '.beads', 'graph.json'), graphContent, 'utf-8');

    // Create .gitignore
    const gitignore = `# Axon
.axon/logs/
.beads/graph.json

# Dependencies
node_modules/

# Build
dist/
*.log
`;
    if (!existsSync(join(projectPath, '.gitignore'))) {
      writeFileSync(join(projectPath, '.gitignore'), gitignore, 'utf-8');
    }

    console.log(`${chalk.green('✓')} 项目已初始化: ${projectName}`);
    console.log(`\n${chalk.bold('下一步:')}`);
    console.log(`  ${chalk.cyan('ax drive "实现用户认证功能"')}`);
    console.log(`  ${chalk.cyan('ax status')}\n`);
  });

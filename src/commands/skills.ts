/**
 * ax skills command - Manage skill templates
 */

import { existsSync } from 'fs';
import { basename, join } from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { SkillsLibrary } from '../core/skills';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';

export const skillsCommand = new Command('skills').description(
  t('Manage skill library', '管理技能库'),
);

// ax skills search
skillsCommand
  .command('search <query>')
  .description(t('Search skill templates', '搜索技能模板'))
  .option('-l, --limit <n>', t('Number of results to return', '返回结果数量'), '5')
  .action(async (query: string, options) => {
    const projectRoot = process.cwd();
    const limit = Number.parseInt(options.limit, 10);

    let localPath = join(projectRoot, '.skills');
    let globalPath = join(process.env['HOME'] || '~', '.axon', 'skills');

    // Use config if in Axon project
    if (ConfigManager.isAxonProject(projectRoot)) {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.get();
      localPath = join(projectRoot, config.tools.skills.local_path);
      globalPath = config.tools.skills.global_path;
    }

    spinner.start('搜索技能库...');
    const library = new SkillsLibrary(localPath, globalPath);
    const results = await library.search(query, limit);
    spinner.stop();

    if (results.length === 0) {
      logger.warn(`未找到匹配 "${query}" 的技能`);
      logger.info('尝试使用不同的关键词搜索');
      return;
    }

    logger.title(`搜索结果: "${query}"`);

    for (const { skill, score, matchedOn } of results) {
      console.log(`\n${chalk.bold(skill.metadata.name)} ${chalk.dim(`(${score}% 匹配)`)}`);
      console.log(`  ${chalk.dim('描述:')} ${skill.metadata.description || '无'}`);
      console.log(`  ${chalk.dim('标签:')} ${skill.metadata.tags.join(', ') || '无'}`);
      console.log(`  ${chalk.dim('难度:')} ${skill.metadata.difficulty}`);
      console.log(`  ${chalk.dim('平均 tokens:')} ${skill.metadata.tokens_avg}`);
      console.log(`  ${chalk.dim('路径:')} ${skill.path}`);
      console.log(`  ${chalk.dim('匹配字段:')} ${matchedOn.join(', ')}`);
    }

    logger.blank();
  });

// ax skills list
skillsCommand
  .command('list')
  .description(t('List all skills', '列出所有技能'))
  .option('-t, --tags <tags>', t('Filter by tags (comma-separated)', '按标签过滤 (逗号分隔)'))
  .option(
    '-d, --difficulty <level>',
    t('Filter by difficulty (easy/medium/hard)', '按难度过滤 (easy/medium/hard)'),
  )
  .action(async (options) => {
    const projectRoot = process.cwd();

    let localPath = join(projectRoot, '.skills');
    let globalPath = join(process.env['HOME'] || '~', '.axon', 'skills');

    if (ConfigManager.isAxonProject(projectRoot)) {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.get();
      localPath = join(projectRoot, config.tools.skills.local_path);
      globalPath = config.tools.skills.global_path;
    }

    spinner.start('索引技能库...');
    const library = new SkillsLibrary(localPath, globalPath);

    const filter: { tags?: string[]; difficulty?: string } = {};
    if (options.tags) {
      filter.tags = options.tags.split(',').map((t: string) => t.trim());
    }
    if (options.difficulty) {
      filter.difficulty = options.difficulty;
    }

    const skills = await library.list(filter);
    spinner.stop();

    if (skills.length === 0) {
      logger.warn('技能库为空');
      logger.info('使用 `ax skills save` 添加技能');
      return;
    }

    logger.title(`技能库 (${skills.length} 个技能)`);

    // Group by tag
    const byTag = new Map<string, typeof skills>();
    for (const skill of skills) {
      const tag = skill.metadata.tags[0] || '其他';
      if (!byTag.has(tag)) {
        byTag.set(tag, []);
      }
      byTag.get(tag)!.push(skill);
    }

    for (const [tag, tagSkills] of byTag) {
      console.log(`\n${chalk.bold.blue(tag)} (${tagSkills.length})`);
      for (const skill of tagSkills) {
        console.log(
          `  ${chalk.cyan('•')} ${skill.metadata.name} ${chalk.dim(`[${skill.metadata.difficulty}]`)}`,
        );
      }
    }

    logger.blank();
  });

// ax skills save
skillsCommand
  .command('save <path>')
  .description(t('Save file as skill template', '将文件保存为技能模板'))
  .option('-n, --name <name>', t('Skill name', '技能名称'))
  .option('-t, --tags <tags>', t('Tags (comma-separated)', '标签 (逗号分隔)'))
  .option('-d, --description <desc>', t('Description', '描述'))
  .action(async (filePath: string, options) => {
    const projectRoot = process.cwd();

    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'SKILLS_ERROR', [
        '请先运行 `ax init` 初始化项目',
      ]);
    }

    if (!existsSync(filePath)) {
      throw new AxonError(`文件不存在: ${filePath}`, 'SKILLS_ERROR');
    }

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.get();
    const library = new SkillsLibrary(
      join(projectRoot, config.tools.skills.local_path),
      config.tools.skills.global_path,
    );

    const content = await Bun.file(filePath).text();
    const name = options.name || basename(filePath).replace(/\.[^.]+$/, '');
    const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : ['custom'];

    const skill = {
      metadata: {
        name,
        description: options.description || '',
        tags,
        models: ['claude-sonnet-4'],
        tokens_avg: Math.ceil(content.length / 4),
        difficulty: 'medium' as const,
        last_updated: new Date().toISOString().split('T')[0],
      },
      content,
      path: '',
    };

    const targetPath = join(projectRoot, config.tools.skills.local_path, `${name}.md`);
    await library.save(skill, targetPath);

    logger.success(`技能已保存: ${targetPath}`);
  });

// ax skills stats
skillsCommand
  .command('stats')
  .description(t('Show skill library statistics', '显示技能库统计'))
  .action(async () => {
    const projectRoot = process.cwd();

    let localPath = join(projectRoot, '.skills');
    let globalPath = join(process.env['HOME'] || '~', '.axon', 'skills');

    if (ConfigManager.isAxonProject(projectRoot)) {
      const configManager = new ConfigManager(projectRoot);
      const config = configManager.get();
      localPath = join(projectRoot, config.tools.skills.local_path);
      globalPath = config.tools.skills.global_path;
    }

    spinner.start('分析技能库...');
    const library = new SkillsLibrary(localPath, globalPath);
    const stats = await library.getStats();
    spinner.stop();

    logger.title('技能库统计');

    console.log(`${chalk.dim('总技能数:')} ${stats.total}`);

    if (Object.keys(stats.byTag).length > 0) {
      console.log(`\n${chalk.bold('按标签:')}`);
      for (const [tag, count] of Object.entries(stats.byTag).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${tag}: ${count}`);
      }
    }

    if (Object.keys(stats.byDifficulty).length > 0) {
      console.log(`\n${chalk.bold('按难度:')}`);
      for (const [diff, count] of Object.entries(stats.byDifficulty)) {
        console.log(`  ${diff}: ${count}`);
      }
    }

    logger.blank();
  });

import { existsSync } from 'node:fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import { DocumentManager } from '../core/docs/manager';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';

export const docsCommand = new Command('docs').description(
  t('Manage project reference documents', '管理项目参考文档'),
);

// ax docs add
docsCommand
  .command('add <path>')
  .description(t('Add a document to the project', '添加文档到项目'))
  .option('-t, --title <title>', t('Document title', '文档标题'))
  .option('--tags <tags>', t('Tags (comma separated)', '标签（逗号分隔）'), (val) => val.split(','))
  .action(async (filePath, options) => {
    const manager = new DocumentManager();
    try {
      await manager.add(filePath, {
        title: options.title,
        tags: options.tags,
      });
    } catch (error) {
      logger.error(
        t(
          `Failed to add document: ${(error as Error).message}`,
          `添加文档失败: ${(error as Error).message}`,
        ),
      );
    }
  });

// ax docs add-dir
docsCommand
  .command('add-dir [directory]')
  .description(t('Add all documents in a directory', '批量添加目录下的文档'))
  .action(async (dirPath) => {
    const targetDir = dirPath || './docs';
    if (!existsSync(targetDir)) {
      logger.error(t(`Directory does not exist: ${targetDir}`, `目录不存在: ${targetDir}`));
      return;
    }

    const manager = new DocumentManager();
    const files = manager.scanDirectory(targetDir);

    if (files.length === 0) {
      logger.warn(t('No supported documents found in directory.', '目录中未找到支持的文档。'));
      return;
    }

    logger.info(
      t(
        `Found ${files.length} documents in ${targetDir}:`,
        `在 ${targetDir} 中找到 ${files.length} 个文档:`,
      ),
    );
    files.forEach((f) => console.log(chalk.dim(`  • ${f}`)));

    // Skill recommendation
    const { ConfigManager } = await import('../core/config');
    const { SkillRecommender } = await import('../core/skills/recommender');
    const projectRoot = process.cwd();
    if (ConfigManager.isAxonProject(projectRoot)) {
      const config = new ConfigManager(projectRoot).get();
      const recommender = new SkillRecommender(projectRoot, config.tools.skills.local_path);
      const recommended = await recommender.recommendForFiles(files);
      await recommender.suggest([...recommended, 'brainsstorm']);
    }

    console.log('');
    logger.info(
      t('Starting AI metadata enrichment for all files...', '开始为所有文件提取 AI 元数据...'),
    );

    try {
      const docs = await manager.addDirectory(targetDir);
      logger.success(
        t(`Successfully added ${docs.length} documents.`, `成功添加了 ${docs.length} 个文档。`),
      );
    } catch (error) {
      logger.error(
        t(
          `Failed to add directory: ${(error as Error).message}`,
          `批量添加失败: ${(error as Error).message}`,
        ),
      );
    }
  });

// ax docs list
docsCommand
  .command('list')
  .alias('ls')
  .description(t('List all documents', '列出所有文档'))
  .option('--type <type>', t('Filter by type', '根据类型过滤'))
  .option('--json', t('Output in JSON format', '以 JSON 格式输出'))
  .action((options) => {
    const manager = new DocumentManager();
    const docs = manager.list({
      type: options.type,
    });

    if (options.json) {
      console.log(JSON.stringify(docs, null, 2));
      return;
    }

    if (docs.length === 0) {
      logger.warn(t('No documents found.', '未找到文档'));
      return;
    }

    const table = new Table({
      head: [t('ID', 'ID'), t('Title', '标题'), t('Type', '类型'), t('Added', '添加时间')],
      style: { head: ['cyan'] },
    });

    for (const doc of docs) {
      table.push([doc.id, doc.title, doc.type, new Date(doc.added_at).toLocaleDateString()]);
    }

    console.log(`\n${table.toString()}\n`);
  });

// ax docs search
docsCommand
  .command('search <query>')
  .description(t('Search document content', '搜索文档内容'))
  .action((query) => {
    const manager = new DocumentManager();
    const results = manager.search(query);

    if (results.length === 0) {
      logger.warn(t(`No results for "${query}"`, `未找到与 "${query}" 相关的结果`));
      return;
    }

    logger.info(t(`Search results (${results.length}):`, `搜索结果 (${results.length}):`));
    for (const doc of results) {
      console.log(chalk.green(`✓ ${doc.title} (${doc.id})`));
    }
  });

// ax docs summarize
docsCommand
  .command('summarize <doc-id>')
  .description(t('Generate a summary for a document', '为文档生成摘要'))
  .action(async (docId) => {
    const manager = new DocumentManager();
    try {
      const summary = await manager.summarize(docId);
      console.log(chalk.bold(`\n${t('Document Summary', '文档摘要')}:\n`));
      console.log(summary);
      console.log('');
    } catch (error) {
      logger.error(
        t(
          `Failed to summarize: ${(error as Error).message}`,
          `生成摘要失败: ${(error as Error).message}`,
        ),
      );
    }
  });

// ax docs show
docsCommand
  .command('show <doc-id>')
  .description(t('Show document details', '查看文档详情'))
  .option('--content', t('Show full content', '显示完整内容'))
  .action((docId, options) => {
    const manager = new DocumentManager();
    const doc = manager.get(docId);

    if (!doc) {
      logger.error(t(`Document not found: ${docId}`, `文档不存在: ${docId}`));
      return;
    }

    console.log(chalk.bold(`\n📄 ${doc.title}\n`));
    console.log(`${t('ID', 'ID')}:       ${doc.id}`);
    console.log(`${t('Type', '类型')}:     ${doc.type}`);
    console.log(`${t('Path', '路径')}:     ${doc.path}`);
    console.log(`${t('Added', '添加时间')}: ${new Date(doc.added_at).toLocaleString()}`);

    if (doc.metadata?.['summary']) {
      console.log(`\n${t('Summary', '摘要')}:`);
      console.log(doc.metadata['summary']);
    }

    if (options.content && doc.content) {
      console.log(`\n${t('Content', '内容')}:`);
      console.log(chalk.dim('─'.repeat(40)));
      console.log(doc.content.slice(0, 5000));
      if (doc.content.length > 5000) {
        console.log(chalk.dim('\n... (Content truncated)'));
      }
    }
    console.log('');
  });

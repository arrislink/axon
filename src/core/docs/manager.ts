/**
 * Document Manager - Axon 2.0
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';
import type { DocumentType } from '../../types/docs';
import type { Document, DocumentLibrary } from '../../types/docs';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';

export class DocumentManager {
  private library: DocumentLibrary;
  private libraryPath: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.libraryPath = join(projectRoot, '.axon', 'docs', 'library.json');
    this.library = this.load();
  }

  private load(): DocumentLibrary {
    if (!existsSync(this.libraryPath)) {
      return { version: '1.0', documents: [], indexed_at: new Date().toISOString() };
    }
    try {
      return JSON.parse(readFileSync(this.libraryPath, 'utf-8'));
    } catch {
      return { version: '1.0', documents: [], indexed_at: new Date().toISOString() };
    }
  }

  private save(): void {
    const dir = join(this.projectRoot, '.axon', 'docs');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.library.indexed_at = new Date().toISOString();
    writeFileSync(this.libraryPath, JSON.stringify(this.library, null, 2), 'utf-8');
  }

  async add(filePath: string, options?: { title?: string; tags?: string[] }): Promise<Document> {
    logger.info(t(`Adding document: ${filePath}`, `正在添加文档: ${filePath}`));

    const type = this.detectType(filePath) as DocumentType;
    let content = '';

    try {
      if (['pdf', 'docx'].includes(type)) {
        logger.warn(t('Binary documents require processing tools', '二进制文档需要处理工具'));
        content = `[Content from ${filePath}]`;
      } else {
        content = readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      throw new Error(`Failed to read file: ${error}`);
    }

    const id = `doc_${Date.now()}`;
    const doc: Document = {
      id,
      type,
      path: filePath,
      title: options?.title || basename(filePath),
      content,
      metadata: {},
      added_at: new Date().toISOString(),
      tags: options?.tags || [],
    };

    this.library.documents.push(doc);
    this.save();
    logger.success(t(`Added: ${doc.title}`, `已添加: ${doc.title}`));

    return doc;
  }

  async addDirectory(dirPath: string): Promise<Document[]> {
    logger.info(t(`Scanning directory: ${dirPath}`, `扫描目录: ${dirPath}`));

    const files = this.scanDirectory(dirPath);
    const docs: Document[] = [];

    for (const file of files) {
      try {
        const doc = await this.add(file);
        docs.push(doc);
      } catch (error) {
        logger.warn(t(`Skipping ${file}: ${error}`, `跳过 ${file}: ${error}`));
      }
    }

    logger.success(t(`Added ${docs.length} documents`, `已添加 ${docs.length} 个文档`));
    return docs;
  }

  list(): Document[] {
    return this.library.documents;
  }

  get(id: string): Document | null {
    return this.library.documents.find((d) => d.id === id) || null;
  }

  compileContext(): string {
    const docs = this.library.documents.sort(
      (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime(),
    );

    let context = t('# Project Reference Materials\n\n', '# 项目参考资料\n\n');

    for (const doc of docs.slice(0, 10)) {
      context += `## ${doc.title}\n\n`;
      context += `**Type**: ${doc.type}\n`;
      if (doc.tags?.length) context += `**Tags**: ${doc.tags.join(', ')}\n\n`;
      context += `${doc.content?.slice(0, 5000) || ''}\n\n---\n\n`;
    }

    return context;
  }

  private detectType(filePath: string): string {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return 'url';

    const ext = extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.txt': 'text',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.png': 'image',
      '.jpg': 'image',
    };
    return map[ext] || 'text';
  }

  private scanDirectory(dirPath: string): string[] {
    const files: string[] = [];

    if (!existsSync(dirPath)) return files;

    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = lstatSync(fullPath);

      if (stat.isDirectory()) {
        if (!['.axon', '.git', 'node_modules'].includes(entry)) {
          files.push(...this.scanDirectory(fullPath));
        }
      } else {
        const ext = extname(entry).toLowerCase();
        if (['.md', '.txt', '.yaml', '.yml', '.pdf', '.docx'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }
}

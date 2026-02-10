import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Document, DocumentLibrary, DocumentType } from '../../types/docs';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { AxonLLMClient } from '../llm';

export class DocumentManager {
  private library: DocumentLibrary;
  private libraryPath: string;
  private projectRoot: string;
  private llm: AxonLLMClient;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.libraryPath = join(projectRoot, '.axon', 'docs', 'library.json');
    this.llm = new AxonLLMClient();
    this.library = this.load();
  }

  private load(): DocumentLibrary {
    if (!existsSync(this.libraryPath)) {
      return {
        version: '1.0',
        documents: [],
        indexed_at: new Date().toISOString(),
      };
    }
    try {
      const content = readFileSync(this.libraryPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`加载文档库失败: ${(error as Error).message}`);
      return {
        version: '1.0',
        documents: [],
        indexed_at: new Date().toISOString(),
      };
    }
  }

  private save(): void {
    const dir = join(this.projectRoot, '.axon', 'docs');
    if (!existsSync(dir)) {
      const { mkdirSync } = require('node:fs');
      mkdirSync(dir, { recursive: true });
    }
    this.library.indexed_at = new Date().toISOString();
    writeFileSync(this.libraryPath, JSON.stringify(this.library, null, 2), 'utf-8');
  }

  /**
   * Add a document to the library
   */
  async add(
    filePath: string,
    options?: {
      title?: string;
      tags?: string[];
    },
  ): Promise<Document> {
    logger.info(t(`📄 Adding document: ${filePath}`, `📄 正在添加文档: ${filePath}`));

    const type = this.detectDocType(filePath);
    let content = '';
    let metadata: any = {};

    try {
      switch (type) {
        case 'pdf':
          content = await this.extractPDF(filePath);
          break;
        case 'docx':
          content = await this.extractDocx(filePath);
          break;
        case 'markdown':
        case 'text':
          content = readFileSync(filePath, 'utf-8');
          break;
        case 'yaml':
          content = readFileSync(filePath, 'utf-8');
          try {
            metadata = parseYaml(content);
          } catch {}
          break;
        case 'url':
          content = await this.fetchURL(filePath);
          break;
        case 'image':
          content = await this.extractImageText(filePath);
          break;
        default:
          content = readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      throw new Error(
        t(
          `Failed to extract content: ${(error as Error).message}`,
          `内容提取失败: ${(error as Error).message}`,
        ),
      );
    }

    const id = `doc_${Date.now()}`;

    // Use AI to extract metadata
    logger.info(t('🤖 Enriching metadata using AI...', '🤖 正在使用 AI 提取元数据...'));
    const enrichedMetadata = await this.enrichMetadata(content, type);

    const doc: Document = {
      id,
      type,
      path: filePath,
      title: options?.title || enrichedMetadata.title || basename(filePath),
      content,
      metadata: { ...metadata, ...enrichedMetadata },
      added_at: new Date().toISOString(),
      tags: options?.tags || enrichedMetadata.tags || [],
    };

    this.library.documents.push(doc);
    this.save();

    logger.success(t(`Added document: ${doc.title}`, `已添加文档: ${doc.title}`));
    return doc;
  }

  /**
   * Add all supported documents in a directory
   */
  async addDirectory(dirPath: string): Promise<Document[]> {
    logger.info(t(`📁 Scanning directory: ${dirPath}`, `📁 扫描目录: ${dirPath}`));

    const files = this.scanDirectory(dirPath);
    const docs: Document[] = [];

    for (const file of files) {
      try {
        const doc = await this.add(file);
        docs.push(doc);
      } catch (error) {
        logger.warn(
          t(
            `Skipping file ${file}: ${(error as Error).message}`,
            `跳过文件 ${file}: ${(error as Error).message}`,
          ),
        );
      }
    }

    logger.success(t(`Added ${docs.length} documents`, `已添加 ${docs.length} 个文档`));
    return docs;
  }

  /**
   * List documents
   */
  list(filters?: {
    type?: DocumentType;
    tags?: string[];
  }): Document[] {
    let docs = this.library.documents;

    if (filters?.type) {
      docs = docs.filter((d) => d.type === filters.type);
    }

    if (filters?.tags) {
      docs = docs.filter((d) => filters.tags?.some((tag) => d.tags?.includes(tag)));
    }

    return docs;
  }

  /**
   * Get a document by ID
   */
  get(id: string): Document | null {
    return this.library.documents.find((d) => d.id === id) || null;
  }

  /**
   * Search documents
   */
  search(query: string): Document[] {
    const q = query.toLowerCase();
    return this.library.documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.content?.toLowerCase().includes(q) ||
        doc.tags?.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  /**
   * Generate summary using AI
   */
  async summarize(docId: string): Promise<string> {
    const doc = this.get(docId);
    if (!doc) throw new Error(t(`Document not found: ${docId}`, `文档不存在: ${docId}`));

    logger.info(t(`📝 Generating summary for: ${doc.title}`, `📝 生成文档摘要: ${doc.title}`));

    const prompt = `请总结以下文档的核心内容：

文档标题: ${doc.title}
文档类型: ${doc.type}

内容:
${doc.content?.slice(0, 50000)}

请提供：
1. 一句话总结
2. 关键要点（3-5 条）
3. 技术栈/工具（如果有）
4. 约束条件（如果有）`;

    const summary = await this.llm.complete(prompt);

    // Save summary to metadata
    doc.metadata = doc.metadata || {};
    doc.metadata['summary'] = summary;
    this.save();

    return summary;
  }

  /**
   * Compile context for LLM
   */
  compileContext(options?: {
    includeTypes?: DocumentType[];
    maxTokens?: number;
  }): string {
    let docs = this.library.documents;

    if (options?.includeTypes) {
      docs = docs.filter((d) => options.includeTypes?.includes(d.type));
    }

    // Sort by recency
    docs.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());

    let context = t('# Project Reference Materials\n\n', '# 项目参考资料\n\n');
    let currentTokens = 0;
    const maxTokens = options?.maxTokens || 100000;

    for (const doc of docs) {
      const docSection = `
## ${doc.title}

**Type**: ${doc.type}
**Source**: ${doc.path}
${doc.tags?.length ? `**Tags**: ${doc.tags.join(', ')}` : ''}

${doc.metadata?.['summary'] ? `**Summary**:\n${doc.metadata['summary']}\n` : ''}

**Content**:
${doc.content?.slice(0, 10000)}

---
`;
      const estimatedTokens = docSection.length / 4;
      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }
      context += docSection;
      currentTokens += estimatedTokens;
    }

    return context;
  }

  // Private methods

  private detectDocType(filePath: string): DocumentType {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return 'url';
    }

    const ext = extname(filePath).toLowerCase();
    const typeMap: Record<string, DocumentType> = {
      '.pdf': 'pdf',
      '.docx': 'docx',
      '.md': 'markdown',
      '.markdown': 'markdown',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.txt': 'text',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
    };

    return typeMap[ext] || 'text';
  }

  private async extractDocx(filePath: string): Promise<string> {
    try {
      // @ts-ignore
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${(error as Error).message}`);
    }
  }

  private async extractPDF(filePath: string): Promise<string> {
    // Fallback if pdf-parse is not available
    try {
      // @ts-ignore
      const pdfParse = await import('pdf-parse');
      const dataBuffer = readFileSync(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text;
    } catch (e) {
      // Try pdftotext CLI as fallback
      try {
        const { spawnSync } = require('node:child_process');
        const proc = spawnSync('pdftotext', [filePath, '-']);
        if (proc.status === 0) return proc.stdout.toString();
      } catch {}
      throw new Error('PDF parsing requires "pdf-parse" package or "pdftotext" CLI tool.');
    }
  }

  private async fetchURL(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    // Basic HTML cleanup
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async extractImageText(filePath: string): Promise<string> {
    // Vision task via LLM
    // Note: Currently AxonLLMClient might not support direct image upload in all modes
    // We'll use a placeholder or prompt the user for now if direct support is missing
    logger.warn(
      t(
        'Image text extraction is currently limited. Using OCR if available.',
        '图片内容提取目前受限，正在尝试使用 OCR...',
      ),
    );

    // Implementation would depend on LLM capability to handle images
    // For now, return a description request to AI if possible, or just skip
    return t(
      `[Image content from ${filePath} - AI OCR placeholder]`,
      `[来自 ${filePath} 的图片内容 - AI OCR 占位符]`,
    );
  }

  /**
   * Scan a directory for supported files
   */
  public scanDirectory(dirPath: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = lstatSync(fullPath);

      if (stat.isDirectory()) {
        if (entry === '.axon' || entry === '.git' || entry === 'node_modules') continue;
        files.push(...this.scanDirectory(fullPath));
      } else {
        const ext = extname(entry).toLowerCase();
        if (
          ['.pdf', '.docx', '.md', '.yaml', '.yml', '.txt', '.png', '.jpg', '.jpeg'].includes(ext)
        ) {
          files.push(fullPath);
        }
      }
    }
    return files;
  }

  private async enrichMetadata(content: string, _type: DocumentType): Promise<any> {
    const prompt = `分析以下文档，提取关键信息：

${content.slice(0, 10000)}

请以 JSON 格式返回：
{
  "title": "文档标题",
  "tags": ["标签1", "标签2"],
  "type": "文档类型（需求文档/技术文档/API规范/其他）",
  "tech_stack": ["技术1", "技术2"],
  "key_points": ["要点1", "要点2"]
}`;

    try {
      const response = await this.llm.complete(prompt);
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (error) {
      logger.debug(`Metadata enrichment failed: ${(error as Error).message}`);
    }
    return {};
  }
}

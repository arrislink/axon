import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { logger } from '../../utils/logger';

export interface RequirementFile {
  path: string;
  filename: string;
  content: string;
  type: 'markdown' | 'text' | 'json' | 'yaml' | 'unknown';
  size: number;
}

export interface ParsedRequirements {
  rawText: string;
  files: RequirementFile[];
  summary: {
    totalFiles: number;
    totalSize: number;
    byType: Record<string, number>;
  };
}

export class RequirementParser {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async parseFromPath(reqPath: string): Promise<ParsedRequirements> {
    const fullPath = join(this.projectRoot, reqPath);

    if (!existsSync(fullPath)) {
      throw new Error(`Requirement path not found: ${reqPath}`);
    }

    const stats = statSync(fullPath);

    if (stats.isFile()) {
      return this.parseSingleFile(fullPath);
    }

    if (stats.isDirectory()) {
      return this.parseDirectory(fullPath);
    }

    throw new Error(`Invalid requirement path: ${reqPath}`);
  }

  private parseSingleFile(filePath: string): ParsedRequirements {
    const content = readFileSync(filePath, 'utf-8');
    const file = this.createRequirementFile(filePath, content);

    logger.info(`Parsed requirement file: ${file.filename} (${file.size} bytes)`);

    return {
      rawText: content,
      files: [file],
      summary: {
        totalFiles: 1,
        totalSize: file.size,
        byType: { [file.type]: 1 },
      },
    };
  }

  private parseDirectory(dirPath: string): ParsedRequirements {
    const files: RequirementFile[] = [];
    const byType: Record<string, number> = {};

    const entries = require('node:fs').readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && this.isRequirementFile(entry.name)) {
        const filePath = join(dirPath, entry.name);
        const content = readFileSync(filePath, 'utf-8');
        const file = this.createRequirementFile(filePath, content);

        files.push(file);
        byType[file.type] = (byType[file.type] || 0) + 1;

        logger.info(`Parsed requirement file: ${file.filename} (${file.size} bytes)`);
      }
    }

    // Sort files by name for consistent ordering
    files.sort((a, b) => a.filename.localeCompare(b.filename));

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const rawText = files.map((f) => `## ${f.filename}\n\n${f.content}`).join('\n\n---\n\n');

    logger.info(`Parsed ${files.length} requirement files from directory`);

    return {
      rawText,
      files,
      summary: {
        totalFiles: files.length,
        totalSize,
        byType,
      },
    };
  }

  private isRequirementFile(filename: string): boolean {
    const validExtensions = ['.md', '.txt', '.markdown', '.json', '.yaml', '.yml'];
    const ext = extname(filename).toLowerCase();
    return validExtensions.includes(ext);
  }

  private createRequirementFile(filePath: string, content: string): RequirementFile {
    const filename = filePath.split('/').pop() || filePath;
    const ext = extname(filename).toLowerCase();

    let type: RequirementFile['type'] = 'unknown';
    switch (ext) {
      case '.md':
      case '.markdown':
        type = 'markdown';
        break;
      case '.txt':
        type = 'text';
        break;
      case '.json':
        type = 'json';
        break;
      case '.yaml':
      case '.yml':
        type = 'yaml';
        break;
    }

    return {
      path: filePath,
      filename,
      content,
      type,
      size: Buffer.byteLength(content, 'utf8'),
    };
  }

  extractKeySections(content: string): {
    overview?: string;
    requirements: string[];
    constraints: string[];
    acceptanceCriteria: string[];
  } {
    const lines = content.split('\n');
    const requirements: string[] = [];
    const constraints: string[] = [];
    const acceptanceCriteria: string[] = [];

    let currentSection = '';
    let overview = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim().toLowerCase();

      // Detect sections
      if (line.startsWith('# ') && i < 5) {
        overview = line.replace('# ', '').trim();
      } else if (trimmed.includes('requirement') || trimmed.includes('功能需求')) {
        currentSection = 'requirements';
      } else if (trimmed.includes('constraint') || trimmed.includes('约束')) {
        currentSection = 'constraints';
      } else if (trimmed.includes('acceptance') || trimmed.includes('验收')) {
        currentSection = 'acceptance';
      } else if (line.startsWith('## ')) {
        currentSection = '';
      }

      // Extract items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const item = line.replace(/^[-*]\s*/, '').trim();
        if (item && currentSection) {
          switch (currentSection) {
            case 'requirements':
              requirements.push(item);
              break;
            case 'constraints':
              constraints.push(item);
              break;
            case 'acceptance':
              acceptanceCriteria.push(item);
              break;
          }
        }
      }

      // Extract checkbox items
      if (line.includes('- [ ]') || line.includes('- [x]')) {
        const item = line.replace(/- \[[ x]\]\s*/, '').trim();
        if (item && currentSection === 'acceptance') {
          acceptanceCriteria.push(item);
        }
      }
    }

    return {
      overview,
      requirements,
      constraints,
      acceptanceCriteria,
    };
  }

  mergeWithInstruction(parsed: ParsedRequirements, userInstruction: string): string {
    const parts: string[] = [];

    if (userInstruction) {
      parts.push(`# User Request\n\n${userInstruction}`);
    }

    if (parsed.files.length > 0) {
      parts.push(`# Requirement Documents\n\n${parsed.rawText}`);
    }

    return parts.join('\n\n---\n\n');
  }
}

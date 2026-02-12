/**
 * Skills Manager - Integration with skills.sh
 *
 * Manages skill installation, discovery, and matching
 * for best practice injection into prompts.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export interface Skill {
  name: string;
  description: string;
  tags: string[];
  content: string;
  source: string;
}

export interface SkillsMatchResult {
  skills: Skill[];
  score: number;
}

/**
 * Skills Manager following the thin-wrapper pattern:
 * - skills.sh handles: installation, discovery, community skills
 * - Axon handles: file reading, intelligent matching, prompt injection
 */
export class SkillsManager {
  private projectRoot: string;
  private searchPaths: string[];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.searchPaths = [
      `${projectRoot}/.opencode/skills`, // skills.sh install path
      `${projectRoot}/.skills`, // Axon custom path
      `${os.homedir()}/.opencode/skills`, // Global skills
      `${os.homedir()}/.lucky/skills`, // Legacy Axon path (backward compat)
    ];
  }

  /**
   * Search community skills (delegates to skills.sh)
   */
  async search(query: string): Promise<void> {
    logger.info(`🔍 Searching skills for: "${query}"`);
    await execAsync(`npx skills find "${query}"`);
  }

  /**
   * Install a skill (wraps skills.sh, forces opencode agent)
   */
  async install(source: string, options?: { global?: boolean }): Promise<void> {
    const args = ['npx', 'skills', 'add', source];

    if (options?.global) {
      args.push('-g');
    }

    // Always target opencode agent
    args.push('-a', 'opencode');
    args.push('-y'); // Non-interactive mode

    logger.info(`📦 Installing skill: ${source}`);
    await execAsync(args.join(' '));
    logger.success(`✅ Skill installed: ${source}`);
  }

  /**
   * Initialize a new skill
   */
  async init(name: string): Promise<void> {
    await execAsync(`npx skills init ${name}`);
    // Also create in .skills/ for Axon
    const skillPath = path.join(this.projectRoot, '.skills', name);
    if (!fs.existsSync(skillPath)) {
      fs.mkdirSync(skillPath, { recursive: true });
    }
  }

  /**
   * Load all installed skills (Axon reads files, doesn't rely on skills.sh runtime)
   */
  async loadInstalled(): Promise<Skill[]> {
    const skills: Skill[] = [];

    for (const searchPath of this.searchPaths) {
      if (!fs.existsSync(searchPath)) continue;

      const found = await this.scanSkillsDir(searchPath);
      skills.push(...found);
    }

    // Deduplicate by name
    return this.deduplicate(skills);
  }

  /**
   * Match skills for a specific bead/task
   */
  async matchForBead(
    beadDescription: string,
    requiredSkills: string[],
    allSkills: Skill[],
  ): Promise<Skill[]> {
    const keywords = [...requiredSkills, ...this.extractKeywords(beadDescription)];

    return allSkills
      .map((skill) => ({
        skill,
        score: this.scoreMatch(skill, keywords),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Max 3 skills per bead
      .map(({ skill }) => skill);
  }

  /**
   * Get formatted skills content for prompt injection
   */
  async getSkillsContent(skills: Skill[]): Promise<string> {
    if (skills.length === 0) return '';

    const lines = ['## Best Practices Reference'];

    for (const skill of skills) {
      lines.push(`\n### ${skill.name}`);
      lines.push(skill.content);
    }

    return lines.join('\n');
  }

  /**
   * List all installed skills
   */
  async list(): Promise<Skill[]> {
    return this.loadInstalled();
  }

  // Private helpers

  private async scanSkillsDir(dirPath: string): Promise<Skill[]> {
    const skills: Skill[] = [];

    if (!fs.existsSync(dirPath)) return skills;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Check for SKILL.md in subdirectory
        const skillMd = path.join(fullPath, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          const skill = await this.parseSkillFile(skillMd, entry.name);
          if (skill) skills.push(skill);
        }
        // Also recurse into subdirectories
        const subSkills = await this.scanSkillsDir(fullPath);
        skills.push(...subSkills);
      } else if (entry.name === 'SKILL.md' || entry.name.endsWith('.md')) {
        const skill = await this.parseSkillFile(fullPath, entry.name);
        if (skill) skills.push(skill);
      }
    }

    return skills;
  }

  private async parseSkillFile(filePath: string, fallbackName: string): Promise<Skill | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse frontmatter
      const nameMatch = content.match(/^---\s*\nname:\s*(.+)/m);
      const descMatch = content.match(/description:\s*(.+)/m);
      const tagsMatch = content.match(/tags:\s*\[([^\]]+)\]/m);

      return {
        name: nameMatch ? nameMatch[1].trim() : fallbackName,
        description: descMatch ? descMatch[1].trim() : '',
        tags: tagsMatch ? tagsMatch[1].split(',').map((t) => t.trim()) : [],
        content,
        source: filePath,
      };
    } catch {
      return null;
    }
  }

  private scoreMatch(skill: Skill, keywords: string[]): number {
    let score = 0;
    const searchText = (
      skill.name +
      ' ' +
      skill.description +
      ' ' +
      skill.tags.join(' ')
    ).toLowerCase();

    for (const kw of keywords) {
      const lowerKw = kw.toLowerCase();
      if (skill.tags.includes(lowerKw)) score += 50;
      else if (skill.name.toLowerCase().includes(lowerKw)) score += 30;
      else if (searchText.includes(lowerKw)) score += 10;
    }

    return score;
  }

  private deduplicate(skills: Skill[]): Skill[] {
    const seen = new Map<string, Skill>();

    for (const skill of skills) {
      const key = skill.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, skill);
      }
    }

    return Array.from(seen.values());
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);
  }
}

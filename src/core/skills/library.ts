/**
 * Skills Library - Manages skill templates
 */

import { existsSync, mkdirSync } from 'fs';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import type { Skill, SkillSearchResult, SkillLibraryStats } from '../../types';

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): { metadata: Record<string, unknown>; body: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
        return { metadata: {}, body: content };
    }

    const [, frontmatter, body] = match;
    const metadata: Record<string, unknown> = {};

    for (const line of frontmatter.split('\n')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            let value: unknown = line.slice(colonIndex + 1).trim();

            // Parse arrays - handle both JSON arrays and YAML shorthand
            if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
                try {
                    // Try JSON parse first
                    value = JSON.parse(value);
                } catch {
                    // Handle YAML shorthand arrays like [auth, testing]
                    const strValue = value as string;
                    const inner = strValue.slice(1, -1).trim();
                    if (inner) {
                        value = inner.split(',').map((s: string) => s.trim());
                    } else {
                        value = [];
                    }
                }
            }

            metadata[key] = value;
        }
    }

    return { metadata, body: body.trim() };
}

export class SkillsLibrary {
    private skills: Skill[] = [];
    private indexed = false;
    private paths: string[];

    constructor(localPath: string, globalPath: string) {
        this.paths = [localPath, globalPath].filter((p) => existsSync(p));
    }

    /**
     * Index all skills from configured paths
     */
    async index(): Promise<void> {
        this.skills = [];

        for (const basePath of this.paths) {
            await this.indexDirectory(basePath);
        }

        this.indexed = true;
    }

    private async indexDirectory(dir: string): Promise<void> {
        if (!existsSync(dir)) return;

        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);

            if (entry.isDirectory()) {
                await this.indexDirectory(fullPath);
            } else if (entry.name.endsWith('.md')) {
                try {
                    const content = await readFile(fullPath, 'utf-8');
                    const { metadata, body } = parseFrontmatter(content);

                    this.skills.push({
                        metadata: {
                            name: (metadata['name'] as string) || basename(fullPath, '.md'),
                            description: (metadata['description'] as string) || '',
                            tags: (metadata['tags'] as string[]) || [],
                            models: (metadata['models'] as string[]) || [],
                            tokens_avg: Number(metadata['tokens_avg']) || 2000,
                            difficulty: (metadata['difficulty'] as 'easy' | 'medium' | 'hard') || 'medium',
                            last_updated: (metadata['last_updated'] as string) || new Date().toISOString(),
                        },
                        content: body,
                        path: fullPath,
                    });
                } catch {
                    // Skip invalid files
                }
            }
        }
    }

    /**
     * Search for skills by query
     */
    async search(query: string, limit = 5): Promise<SkillSearchResult[]> {
        if (!this.indexed) {
            await this.index();
        }

        const queryLower = query.toLowerCase();
        const results: SkillSearchResult[] = [];

        for (const skill of this.skills) {
            let score = 0;
            const matchedOn: SkillSearchResult['matchedOn'] = [];

            // Name match (highest weight)
            if (skill.metadata.name.toLowerCase().includes(queryLower)) {
                score += 100;
                matchedOn.push('name');
            }

            // Tag match
            for (const tag of skill.metadata.tags) {
                if (tag.toLowerCase().includes(queryLower)) {
                    score += 50;
                    if (!matchedOn.includes('tags')) matchedOn.push('tags');
                }
            }

            // Description match
            if (skill.metadata.description.toLowerCase().includes(queryLower)) {
                score += 30;
                matchedOn.push('description');
            }

            // Content match
            const contentMatches = (skill.content.toLowerCase().match(new RegExp(queryLower, 'g')) || [])
                .length;
            if (contentMatches > 0) {
                score += contentMatches * 10;
                matchedOn.push('content');
            }

            if (score > 0) {
                results.push({ skill, score, matchedOn });
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    /**
     * Get skill by path
     */
    async getByPath(path: string): Promise<Skill | null> {
        if (!this.indexed) {
            await this.index();
        }
        return this.skills.find((s) => s.path === path) || null;
    }

    /**
     * Save a new skill
     */
    async save(skill: Skill, targetPath: string): Promise<void> {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const frontmatter = [
            '---',
            `name: ${skill.metadata.name}`,
            `description: ${skill.metadata.description}`,
            `tags: ${JSON.stringify(skill.metadata.tags)}`,
            `models: ${JSON.stringify(skill.metadata.models)}`,
            `tokens_avg: ${skill.metadata.tokens_avg}`,
            `difficulty: ${skill.metadata.difficulty}`,
            `last_updated: ${new Date().toISOString().split('T')[0]}`,
            '---',
            '',
        ].join('\n');

        const content = frontmatter + skill.content;
        await writeFile(targetPath, content, 'utf-8');

        // Re-index
        this.indexed = false;
    }

    /**
     * List all skills
     */
    async list(filter?: { tags?: string[]; difficulty?: string }): Promise<Skill[]> {
        if (!this.indexed) {
            await this.index();
        }

        let result = [...this.skills];

        if (filter?.tags?.length) {
            result = result.filter((s) => s.metadata.tags.some((t) => filter.tags?.includes(t)));
        }

        if (filter?.difficulty) {
            result = result.filter((s) => s.metadata.difficulty === filter.difficulty);
        }

        return result;
    }

    /**
     * Get library statistics
     */
    async getStats(): Promise<SkillLibraryStats> {
        if (!this.indexed) {
            await this.index();
        }

        const byTag: Record<string, number> = {};
        const byDifficulty: Record<string, number> = {};

        for (const skill of this.skills) {
            for (const tag of skill.metadata.tags) {
                byTag[tag] = (byTag[tag] || 0) + 1;
            }
            byDifficulty[skill.metadata.difficulty] = (byDifficulty[skill.metadata.difficulty] || 0) + 1;
        }

        return {
            total: this.skills.length,
            byTag,
            byDifficulty,
        };
    }
}

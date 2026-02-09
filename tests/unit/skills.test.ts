/**
 * Unit tests for Skills module
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { SkillsLibrary } from '../../src/core/skills/library';

const TEST_DIR = '/tmp/axos-test-skills-' + Date.now();

describe('SkillsLibrary', () => {
    beforeEach(async () => {
        mkdirSync(join(TEST_DIR, 'local'), { recursive: true });
        mkdirSync(join(TEST_DIR, 'global'), { recursive: true });

        // Create test skills
        const skill1 = `---
name: Test Skill 1
description: A test skill for authentication
tags: [auth, testing]
models: [claude-sonnet-4]
tokens_avg: 1000
difficulty: easy
last_updated: 2026-01-01
---

## Content

This is the skill content.
`;

        const skill2 = `---
name: Database Design
description: PostgreSQL database design patterns
tags: [database, postgresql]
models: [claude-sonnet-4, gpt-4]
tokens_avg: 2000
difficulty: medium
last_updated: 2026-01-01
---

## Content

Database content here.
`;

        await Bun.write(join(TEST_DIR, 'local', 'test-skill.md'), skill1);
        await Bun.write(join(TEST_DIR, 'global', 'database.md'), skill2);
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
    });

    test('indexes skills from directories', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        await library.index();
        const skills = await library.list();

        expect(skills.length).toBe(2);
    });

    test('searches by name', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const results = await library.search('Database');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].skill.metadata.name).toBe('Database Design');
    });

    test('searches by tag', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const results = await library.search('auth');

        expect(results.length).toBeGreaterThan(0);
        expect(results[0].skill.metadata.tags).toContain('auth');
    });

    test('filters by tags', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const filtered = await library.list({ tags: ['database'] });

        expect(filtered.length).toBe(1);
        expect(filtered[0].metadata.name).toBe('Database Design');
    });

    test('filters by difficulty', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const easy = await library.list({ difficulty: 'easy' });

        expect(easy.length).toBe(1);
        expect(easy[0].metadata.difficulty).toBe('easy');
    });

    test('gets stats correctly', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const stats = await library.getStats();

        expect(stats.total).toBe(2);
        expect(stats.byTag['auth']).toBe(1);
        expect(stats.byTag['database']).toBe(1);
        expect(stats.byDifficulty['easy']).toBe(1);
        expect(stats.byDifficulty['medium']).toBe(1);
    });

    test('saves new skill', async () => {
        const library = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );

        const newSkill = {
            metadata: {
                name: 'New Skill',
                description: 'A newly created skill',
                tags: ['new', 'test'],
                models: ['claude-sonnet-4'],
                tokens_avg: 500,
                difficulty: 'easy' as const,
                last_updated: '2026-02-09',
            },
            content: '## New Content\n\nThis is new.',
            path: '',
        };

        const targetPath = join(TEST_DIR, 'local', 'new-skill.md');
        await library.save(newSkill, targetPath);

        expect(existsSync(targetPath)).toBe(true);

        // Re-index and check
        const updated = new SkillsLibrary(
            join(TEST_DIR, 'local'),
            join(TEST_DIR, 'global')
        );
        const skills = await updated.list();
        expect(skills.length).toBe(3);
    });
});

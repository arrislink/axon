/**
 * Unit tests for ConfigManager
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../../src/core/config/manager';
import { DEFAULT_CONFIG } from '../../src/core/config/defaults';

const TEST_DIR = '/tmp/axon-test-config-' + Date.now();

describe('ConfigManager', () => {
    beforeEach(() => {
        mkdirSync(join(TEST_DIR, '.axon'), { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true });
        }
    });

    test('returns default config when no config file exists', () => {
        rmSync(join(TEST_DIR, '.axon'), { recursive: true });
        mkdirSync(TEST_DIR, { recursive: true });

        const manager = new ConfigManager(TEST_DIR);
        const config = manager.get();

        expect(config.version).toBe(DEFAULT_CONFIG.version);
        expect(config.project.name).toBe(DEFAULT_CONFIG.project.name);
    });

    test('initializes new project with config', () => {
        const manager = ConfigManager.initialize(TEST_DIR, 'test-project');
        const config = manager.get();

        expect(config.project.name).toBe('test-project');
        expect(existsSync(join(TEST_DIR, '.axon', 'config.yaml'))).toBe(true);
    });

    test('saves and reloads config', () => {
        ConfigManager.initialize(TEST_DIR, 'test-project');
        const manager = new ConfigManager(TEST_DIR);

        manager.update({
            project: { name: 'updated-name' },
        });

        const reloaded = new ConfigManager(TEST_DIR);
        expect(reloaded.get().project.name).toBe('updated-name');
    });

    test('detects Axon project', () => {
        expect(ConfigManager.isAxonProject(TEST_DIR)).toBe(false);

        ConfigManager.initialize(TEST_DIR, 'test');

        expect(ConfigManager.isAxonProject(TEST_DIR)).toBe(true);
    });

    test('returns correct agent config', () => {
        ConfigManager.initialize(TEST_DIR, 'test');
        const manager = new ConfigManager(TEST_DIR);

        const sisyphus = manager.getAgentConfig('sisyphus');
        expect(sisyphus).toBeDefined();
        expect(sisyphus?.provider).toBe('anthropic');
    });

    test('returns safety limits', () => {
        ConfigManager.initialize(TEST_DIR, 'test');
        const manager = new ConfigManager(TEST_DIR);

        const limits = manager.getSafetyLimits();
        expect(limits.daily_token_limit).toBeGreaterThan(0);
        expect(limits.max_retries).toBeGreaterThan(0);
    });
});

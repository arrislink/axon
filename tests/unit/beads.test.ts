/**
 * Unit tests for Beads module
 */

import { describe, test, expect } from 'bun:test';
import {
    createEmptyGraph,
    topologicalSort,
    hasCycle,
    validateGraph,
    getNextExecutable,
    getGraphStats,
} from '../../src/core/beads/graph';
import type { Bead, BeadsGraph } from '../../src/types';

const createBead = (id: string, deps: string[] = [], status: Bead['status'] = 'pending'): Bead => ({
    id,
    title: `Task ${id}`,
    description: `Description for ${id}`,
    dependencies: deps,
    estimated_tokens: 1000,
    priority: 'medium',
    skills_required: [],
    status,
    agent: 'sisyphus',
    created_at: new Date().toISOString(),
});

describe('Beads Graph', () => {
    test('createEmptyGraph creates valid graph', () => {
        const graph = createEmptyGraph('test-project');

        expect(graph.version).toBe('1.0');
        expect(graph.beads).toEqual([]);
        expect(graph.metadata.total_estimated_tokens).toBe(0);
    });

    test('topologicalSort orders by dependencies', () => {
        const beads: Bead[] = [
            createBead('c', ['b']),
            createBead('a', []),
            createBead('b', ['a']),
        ];

        const sorted = topologicalSort(beads);
        const ids = sorted.map((b) => b.id);

        expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
        expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
    });

    test('hasCycle detects circular dependencies', () => {
        const cyclic: Bead[] = [
            createBead('a', ['b']),
            createBead('b', ['a']),
        ];

        expect(hasCycle(cyclic)).toBe(true);
    });

    test('hasCycle returns false for valid graph', () => {
        const valid: Bead[] = [
            createBead('a', []),
            createBead('b', ['a']),
            createBead('c', ['a', 'b']),
        ];

        expect(hasCycle(valid)).toBe(false);
    });

    test('validateGraph catches missing dependencies', () => {
        const graph: BeadsGraph = {
            version: '1.0',
            beads: [createBead('a', ['nonexistent'])],
            metadata: {
                total_estimated_tokens: 0,
                total_cost_usd: 0,
                created_at: '',
                updated_at: '',
            },
        };

        const result = validateGraph(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true);
    });

    test('validateGraph catches duplicate IDs', () => {
        const graph: BeadsGraph = {
            version: '1.0',
            beads: [createBead('a'), createBead('a')],
            metadata: {
                total_estimated_tokens: 0,
                total_cost_usd: 0,
                created_at: '',
                updated_at: '',
            },
        };

        const result = validateGraph(graph);
        expect(result.valid).toBe(false);
        expect(result.errors.some((e) => e.includes('重复'))).toBe(true);
    });

    test('getNextExecutable returns bead with all deps completed', () => {
        const beads: Bead[] = [
            createBead('a', [], 'completed'),
            createBead('b', ['a'], 'pending'),
            createBead('c', ['b'], 'pending'),
        ];

        const next = getNextExecutable(beads);
        expect(next?.id).toBe('b');
    });

    test('getNextExecutable returns null when blocked', () => {
        const beads: Bead[] = [
            createBead('a', [], 'pending'),
            createBead('b', ['a'], 'pending'),
        ];

        const next = getNextExecutable(beads);
        expect(next?.id).toBe('a'); // a has no deps
    });

    test('getGraphStats calculates correctly', () => {
        const graph: BeadsGraph = {
            version: '1.0',
            beads: [
                createBead('a', [], 'completed'),
                createBead('b', [], 'completed'),
                createBead('c', [], 'pending'),
                createBead('d', [], 'failed'),
            ],
            metadata: {
                total_estimated_tokens: 4000,
                total_cost_usd: 0.012,
                created_at: '',
                updated_at: '',
            },
        };

        const stats = getGraphStats(graph);
        expect(stats.total).toBe(4);
        expect(stats.completed).toBe(2);
        expect(stats.pending).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.progress).toBe(50);
    });
});

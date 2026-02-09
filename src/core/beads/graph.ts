/**
 * Beads Graph data structure and operations
 */

import type { Bead, BeadsGraph } from '../../types';

/**
 * Create an empty beads graph
 */
export function createEmptyGraph(_projectName: string): BeadsGraph {
    return {
        version: '1.0',
        beads: [],
        metadata: {
            total_estimated_tokens: 0,
            total_cost_usd: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    };
}

/**
 * Topological sort for beads (respecting dependencies)
 */
export function topologicalSort(beads: Bead[]): Bead[] {
    const beadMap = new Map(beads.map((b) => [b.id, b]));
    const visited = new Set<string>();
    const result: Bead[] = [];

    function visit(beadId: string): void {
        if (visited.has(beadId)) return;
        visited.add(beadId);

        const bead = beadMap.get(beadId);
        if (!bead) return;

        // Visit dependencies first
        for (const depId of bead.dependencies) {
            visit(depId);
        }

        result.push(bead);
    }

    for (const bead of beads) {
        visit(bead.id);
    }

    return result;
}

/**
 * Check if graph has cycle (invalid dependency)
 */
export function hasCycle(beads: Bead[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const beadMap = new Map(beads.map((b) => [b.id, b]));

    function dfs(beadId: string): boolean {
        visited.add(beadId);
        recursionStack.add(beadId);

        const bead = beadMap.get(beadId);
        if (!bead) return false;

        for (const depId of bead.dependencies) {
            if (!visited.has(depId)) {
                if (dfs(depId)) return true;
            } else if (recursionStack.has(depId)) {
                return true; // Cycle detected
            }
        }

        recursionStack.delete(beadId);
        return false;
    }

    for (const bead of beads) {
        if (!visited.has(bead.id)) {
            if (dfs(bead.id)) return true;
        }
    }

    return false;
}

/**
 * Validate beads graph
 */
export function validateGraph(graph: BeadsGraph): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const beadIds = new Set(graph.beads.map((b) => b.id));

    // Check for duplicate IDs
    const idCounts = new Map<string, number>();
    for (const bead of graph.beads) {
        idCounts.set(bead.id, (idCounts.get(bead.id) || 0) + 1);
    }
    for (const [id, count] of idCounts) {
        if (count > 1) {
            errors.push(`重复的任务 ID: ${id}`);
        }
    }

    // Check dependencies exist
    for (const bead of graph.beads) {
        for (const dep of bead.dependencies) {
            if (!beadIds.has(dep)) {
                errors.push(`任务 ${bead.id} 依赖不存在的任务 ${dep}`);
            }
        }
    }

    // Check for cycles
    if (hasCycle(graph.beads)) {
        errors.push('检测到循环依赖');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get next executable bead (all dependencies completed)
 */
export function getNextExecutable(beads: Bead[]): Bead | null {
    const pending = beads.filter((b) => b.status === 'pending');

    for (const bead of pending) {
        const depsCompleted = bead.dependencies.every((depId) => {
            const dep = beads.find((b) => b.id === depId);
            return dep?.status === 'completed';
        });

        if (depsCompleted) {
            return bead;
        }
    }

    return null;
}

/**
 * Get graph statistics
 */
export function getGraphStats(graph: BeadsGraph) {
    const total = graph.beads.length;
    const completed = graph.beads.filter((b) => b.status === 'completed').length;
    const running = graph.beads.filter((b) => b.status === 'running').length;
    const failed = graph.beads.filter((b) => b.status === 'failed').length;
    const pending = graph.beads.filter((b) => b.status === 'pending').length;
    const paused = graph.beads.filter((b) => b.status === 'paused').length;

    return {
        total,
        completed,
        running,
        failed,
        pending,
        paused,
        progress: total > 0 ? (completed / total) * 100 : 0,
    };
}

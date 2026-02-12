import { describe, expect, it } from 'bun:test';
import type { Bead, BeadsGraph } from '../src/types/beads';

describe('Types', () => {
  it('should validate Bead structure', () => {
    const bead: Bead = {
      id: 'bead_001',
      title: 'Test Bead',
      description: 'Test description',
      dependencies: [],
      skills_required: ['typescript'],
      status: 'pending',
      agent: 'sisyphus',
      priority: 'high',
      estimated_tokens: 1000,
      created_at: new Date().toISOString(),
    };

    expect(bead.id).toBe('bead_001');
    expect(bead.status).toBe('pending');
  });

  it('should validate BeadsGraph structure', () => {
    const graph: BeadsGraph = {
      version: '2.0',
      beads: [],
      metadata: {
        total_estimated_tokens: 0,
        total_cost_usd: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    expect(graph.version).toBe('2.0');
    expect(graph.beads).toHaveLength(0);
  });
});

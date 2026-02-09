/**
 * Bead types - Core task unit in Axon
 */

export type BeadStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';
export type BeadPriority = 'low' | 'medium' | 'high';
export type AgentType = 'sisyphus' | 'oracle' | 'background';

export interface Bead {
    id: string; // bead_001
    title: string;
    description: string;
    dependencies: string[]; // Dependent bead IDs
    estimated_tokens: number;
    priority: BeadPriority;
    skills_required: string[];
    status: BeadStatus;
    agent: AgentType;
    created_at: string;
    completed_at?: string;
    error?: string;
    artifacts?: {
        files: string[];
        commits: string[];
    };
}

export interface BeadsGraphMetadata {
    total_estimated_tokens: number;
    total_cost_usd: number;
    created_at: string;
    updated_at: string;
}

export interface BeadsGraph {
    version: string;
    beads: Bead[];
    metadata: BeadsGraphMetadata;
}

export interface BeadExecutionResult {
    success: boolean;
    bead: Bead;
    tokensUsed: number;
    cost: number;
    artifacts: {
        files: string[];
        commits: string[];
    };
    error?: string;
}

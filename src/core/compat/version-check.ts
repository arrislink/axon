/**
 * Version Compatibility Check
 * 
 * Checks versions of critical dependencies:
 * - OpenCode CLI
 * - OhMyOpenCode (OMO)
 * - Node.js / Bun
 */

import { logger } from '../../utils/logger';


export interface CompatibilityCheckResult {
    tool: string;
    version: string;
    compatible: boolean;
    required: string;
}

export async function checkCompatibility(): Promise<void> {
    const checks: CompatibilityCheckResult[] = [];

    // 1. Check OpenCode
    try {
        const proc = Bun.spawn(['opencode', '--version'], { stderr: 'pipe' });
        const output = await new Response(proc.stdout).text();
        const match = output.match(/(\d+\.\d+\.\d+)/);
        if (match) {
            // Assume we need at least 1.0.0 (placeholder logic)
            // In reality, we might check against a specific version
            checks.push({
                tool: 'OpenCode',
                version: match[1],
                compatible: true, // For now, assume true unless valid semver check fails
                required: '>=1.0.0'
            });
        }
    } catch {
        // Ignore if not found or failed
    }

    // 2. Check OMO
    try {
        const proc = Bun.spawn(['bunx', 'oh-my-opencode', '--version'], { stderr: 'pipe' });
        const output = await new Response(proc.stdout).text();
        const match = output.match(/(\d+\.\d+\.\d+)/);
        if (match) {
            checks.push({
                tool: 'OhMyOpenCode',
                version: match[1],
                compatible: true,
                required: '>=1.0.0'
            });
        }
    } catch {
        // Ignore
    }

    // 3. Node/Bun
    checks.push({
        tool: 'Runtime',
        version: process.version,
        compatible: true,
        required: '>=18.0.0'
    });

    if (process.env['DEBUG']) {
        logger.debug('Compatibility Checks:');
        checks.forEach(c => {
            logger.debug(`  ${c.tool}: ${c.version} (Required: ${c.required})`);
        });
    }

    // If we had strict requirements, we would log warnings here.
    // For now, this is implementing the infrastructure.
}

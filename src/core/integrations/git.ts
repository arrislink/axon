/**
 * Git operations wrapper
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

export class GitOperations {
    private cwd: string;

    constructor(cwd: string = process.cwd()) {
        this.cwd = cwd;
    }

    /**
     * Check if directory is a git repository
     */
    isGitRepo(): boolean {
        return existsSync(join(this.cwd, '.git'));
    }

    /**
     * Initialize a new git repository
     */
    async init(): Promise<void> {
        await $`git init`.cwd(this.cwd).quiet();
    }

    /**
     * Stage all changes
     */
    async addAll(): Promise<void> {
        await $`git add .`.cwd(this.cwd).quiet();
    }

    /**
     * Commit changes with message
     */
    async commit(message: string): Promise<string> {
        const result = await $`git commit -m ${message}`.cwd(this.cwd).quiet();
        // Extract commit hash from output
        const output = result.stdout.toString();
        const match = output.match(/\[.+\s+([a-f0-9]+)\]/);
        return match ? match[1] : '';
    }

    /**
     * Get current branch name
     */
    async getCurrentBranch(): Promise<string> {
        const result = await $`git branch --show-current`.cwd(this.cwd).quiet();
        return result.stdout.toString().trim();
    }

    /**
     * Get last commit hash
     */
    async getLastCommitHash(): Promise<string> {
        const result = await $`git rev-parse --short HEAD`.cwd(this.cwd).quiet();
        return result.stdout.toString().trim();
    }

    /**
     * Check if there are uncommitted changes
     */
    async hasChanges(): Promise<boolean> {
        const result = await $`git status --porcelain`.cwd(this.cwd).quiet();
        return result.stdout.toString().trim().length > 0;
    }

    /**
     * Create initial commit
     */
    async initialCommit(): Promise<void> {
        await this.addAll();
        await this.commit('🎉 Initial commit by Axon');
    }

    /**
     * Create a .gitignore file with common entries
     */
    async createGitignore(): Promise<void> {
        const content = `# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Axon
.axon/logs/
.axon/usage.db
`;

        await Bun.write(join(this.cwd, '.gitignore'), content);
    }
}

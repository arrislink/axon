/**
 * Beads Executor - Executes tasks in order
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { AxonConfig, Bead, BeadsGraph, BeadExecutionResult } from '../../types';
import { getNextExecutable } from './graph';
import { AgentOrchestrator } from '../agents/orchestrator';
import { GitOperations } from '../integrations/git';
import { BeadsError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { SkillsLibrary } from '../skills/library';

export class BeadsExecutor {
    private graph: BeadsGraph;
    private graphPath: string;
    private config: AxonConfig;
    private orchestrator: AgentOrchestrator;
    private git: GitOperations;
    private skillsLibrary: SkillsLibrary;

    constructor(
        config: AxonConfig,
        projectRoot: string,
        apiKey: string
    ) {
        this.config = config;
        this.graphPath = join(projectRoot, config.tools.beads.path, 'graph.json');
        this.graph = this.loadGraph();
        this.orchestrator = new AgentOrchestrator(config, apiKey);
        this.git = new GitOperations(projectRoot);

        const localSkillsPath = join(projectRoot, config.tools.skills.local_path);
        this.skillsLibrary = new SkillsLibrary(localSkillsPath, config.tools.skills.global_path);
    }

    private loadGraph(): BeadsGraph {
        if (!existsSync(this.graphPath)) {
            throw new BeadsError('任务图文件不存在', ['运行 `ax plan` 生成任务图']);
        }

        try {
            const content = readFileSync(this.graphPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            throw new BeadsError(`无法读取任务图: ${(error as Error).message}`);
        }
    }

    private saveGraph(): void {
        this.graph.metadata.updated_at = new Date().toISOString();
        writeFileSync(this.graphPath, JSON.stringify(this.graph, null, 2), 'utf-8');
    }

    /**
     * Execute the next available bead
     */
    async executeNext(): Promise<BeadExecutionResult | null> {
        const nextBead = getNextExecutable(this.graph.beads);
        if (!nextBead) {
            logger.success('所有任务已完成！');
            return null;
        }

        return this.executeBead(nextBead);
    }

    /**
     * Execute a specific bead by ID
     */
    async executeById(beadId: string): Promise<BeadExecutionResult> {
        const bead = this.graph.beads.find((b) => b.id === beadId);
        if (!bead) {
            throw new BeadsError(`任务 ${beadId} 不存在`);
        }
        return this.executeBead(bead);
    }

    /**
     * Execute all pending beads
     */
    async executeAll(): Promise<BeadExecutionResult[]> {
        const results: BeadExecutionResult[] = [];

        let nextBead = getNextExecutable(this.graph.beads);
        while (nextBead) {
            const result = await this.executeBead(nextBead);
            results.push(result);

            if (!result.success) {
                logger.error('任务执行失败，停止执行');
                break;
            }

            nextBead = getNextExecutable(this.graph.beads);
        }

        return results;
    }

    private async executeBead(bead: Bead): Promise<BeadExecutionResult> {
        logger.info(`🔨 正在执行: ${bead.id} - ${bead.title}`);
        logger.info(`📋 描述: ${bead.description}`);

        // Update status to running
        this.updateBeadStatus(bead.id, 'running');

        try {
            // Load spec for context
            const specPath = join(
                this.config.tools.openspec.path,
                'spec.md'
            );
            const spec = existsSync(specPath) ? readFileSync(specPath, 'utf-8') : '';

            // Search for relevant skills
            let skills: any[] = [];
            if (this.config.tools.skills.enabled) {
                // Search by bead title and required skills
                const query = `${bead.title} ${bead.skills_required.join(' ')}`;
                const searchResults = await this.skillsLibrary.search(query, 3);
                skills = searchResults.map(r => r.skill);

                if (skills.length > 0) {
                    logger.info(`📚 匹配技能模板:`);
                    skills.forEach(s => logger.info(`   - ${s.metadata.name}`));
                }
            }

            // Execute with orchestrator
            const result = await this.orchestrator.execute({
                bead,
                spec,
                skills,
            });

            // Auto commit if enabled
            if (this.config.tools.beads.auto_commit && result.artifacts.files.length > 0) {
                await this.commitChanges(bead, result.artifacts.commits);
            }

            // Mark as completed
            this.updateBeadStatus(bead.id, 'completed', {
                artifacts: result.artifacts,
                completed_at: new Date().toISOString(),
            });

            logger.success(`任务完成！Token 消耗: ${result.tokensUsed.toLocaleString()}`);

            return {
                success: true,
                bead,
                tokensUsed: result.tokensUsed,
                cost: result.cost,
                artifacts: result.artifacts,
            };
        } catch (error) {
            const errorMessage = (error as Error).message;
            logger.error(`任务失败: ${errorMessage}`);

            this.updateBeadStatus(bead.id, 'failed', {
                error: errorMessage,
            });

            return {
                success: false,
                bead,
                tokensUsed: 0,
                cost: 0,
                artifacts: { files: [], commits: [] },
                error: errorMessage,
            };
        }
    }

    private updateBeadStatus(
        beadId: string,
        status: Bead['status'],
        updates?: Partial<Bead>
    ): void {
        const bead = this.graph.beads.find((b) => b.id === beadId);
        if (!bead) return;

        bead.status = status;
        if (updates) {
            Object.assign(bead, updates);
        }

        this.saveGraph();
    }

    private async commitChanges(bead: Bead, existingCommits: string[]): Promise<void> {
        if (!this.git.isGitRepo()) return;

        const hasChanges = await this.git.hasChanges();
        if (!hasChanges) return;

        const template = this.config.tools.beads.commit_template || '✅ {bead_id}: {title}';
        const message = template.replace('{bead_id}', bead.id).replace('{title}', bead.title);

        await this.git.addAll();
        const commitHash = await this.git.commit(message);

        if (commitHash) {
            existingCommits.push(commitHash);
            logger.info(`📦 Git commit: "${message}"`);
        }
    }

    /**
     * Get execution statistics
     */
    getStats() {
        const total = this.graph.beads.length;
        const completed = this.graph.beads.filter((b) => b.status === 'completed').length;
        const running = this.graph.beads.filter((b) => b.status === 'running').length;
        const failed = this.graph.beads.filter((b) => b.status === 'failed').length;
        const pending = this.graph.beads.filter((b) => b.status === 'pending').length;

        return {
            total,
            completed,
            running,
            failed,
            pending,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    /**
     * Get the current graph
     */
    getGraph(): BeadsGraph {
        return this.graph;
    }
}

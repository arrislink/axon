/**
 * Cost Tracker - Tracks token usage and costs
 */

import type { SafetyConfig } from '../../types';
import { CostLimitError } from '../../utils/errors';
import { MODEL_PRICING } from '../config/defaults';

interface UsageRecord {
    model: string;
    tokens: number;
    cost: number;
    timestamp: string;
}

export class CostTracker {
    private config: SafetyConfig;
    private usageRecords: UsageRecord[] = [];

    constructor(config: SafetyConfig) {
        this.config = config;
    }

    /**
     * Check if we can afford the estimated tokens
     */
    async checkLimit(estimatedTokens: number): Promise<void> {
        const dailyTotal = this.getDailyTokens();

        if (dailyTotal + estimatedTokens > this.config.daily_token_limit) {
            throw new CostLimitError(
                this.config.daily_token_limit,
                dailyTotal,
                estimatedTokens
            );
        }
    }

    /**
     * Record token usage
     */
    recordUsage(model: string, tokens: number): number {
        const cost = this.calculateCost(model, tokens);

        this.usageRecords.push({
            model,
            tokens,
            cost,
            timestamp: new Date().toISOString(),
        });

        // Check for cost alert
        if (cost > this.config.cost_alert_threshold) {
            console.warn(`⚠️  单次操作成本较高: $${cost.toFixed(4)}`);
        }

        return cost;
    }

    /**
     * Calculate cost for tokens
     */
    calculateCost(model: string, tokens: number): number {
        const pricing = MODEL_PRICING[model];
        if (!pricing) {
            // Default pricing
            return (tokens / 1_000_000) * 3.0;
        }

        // Assume 50/50 split between input and output
        const avgRate = (pricing.input + pricing.output) / 2;
        return (tokens / 1_000_000) * avgRate;
    }

    /**
     * Get today's total tokens
     */
    getDailyTokens(): number {
        const today = new Date().toISOString().split('T')[0];
        return this.usageRecords
            .filter((r) => r.timestamp.startsWith(today))
            .reduce((sum, r) => sum + r.tokens, 0);
    }

    /**
     * Get today's total cost
     */
    getDailyCost(): number {
        const today = new Date().toISOString().split('T')[0];
        return this.usageRecords
            .filter((r) => r.timestamp.startsWith(today))
            .reduce((sum, r) => sum + r.cost, 0);
    }

    /**
     * Get usage statistics
     */
    getStatistics() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.usageRecords.filter((r) => r.timestamp.startsWith(today));

        const byModel: Record<string, { tokens: number; cost: number }> = {};
        for (const record of todayRecords) {
            if (!byModel[record.model]) {
                byModel[record.model] = { tokens: 0, cost: 0 };
            }
            byModel[record.model].tokens += record.tokens;
            byModel[record.model].cost += record.cost;
        }

        return {
            total_tokens: todayRecords.reduce((sum, r) => sum + r.tokens, 0),
            total_cost: todayRecords.reduce((sum, r) => sum + r.cost, 0),
            by_model: byModel,
            remaining_tokens: this.config.daily_token_limit - this.getDailyTokens(),
        };
    }

    /**
     * Reset daily usage (for testing)
     */
    reset(): void {
        this.usageRecords = [];
    }
}

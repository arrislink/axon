/**
 * Error handling classes for Axon
 */

import chalk from 'chalk';

export class AxonError extends Error {
    constructor(
        message: string,
        public code: string,
        public suggestions: string[] = []
    ) {
        super(message);
        this.name = 'AxonError';
    }

    format(): string {
        let output = `\n${chalk.red('❌ 错误')}: ${this.message}\n`;

        if (this.suggestions.length > 0) {
            output += `\n${chalk.yellow('建议操作')}:\n`;
            for (const suggestion of this.suggestions) {
                output += `  ${chalk.dim('•')} ${suggestion}\n`;
            }
        }

        return output;
    }
}

export class ConfigError extends AxonError {
    constructor(message: string, suggestions: string[] = []) {
        super(
            message,
            'CONFIG_ERROR',
            suggestions.length > 0
                ? suggestions
                : ['运行 `ax doctor --fix` 尝试自动修复', '检查配置文件格式是否正确']
        );
    }
}

export class APIError extends AxonError {
    constructor(
        message: string,
        public statusCode: number
    ) {
        super(message, 'API_ERROR', [
            '检查网络连接',
            '验证 API 密钥是否有效',
            '运行 `ax doctor --check-keys` 验证密钥',
        ]);
    }
}

export class BeadsError extends AxonError {
    constructor(message: string, suggestions: string[] = []) {
        super(
            message,
            'BEADS_ERROR',
            suggestions.length > 0
                ? suggestions
                : ['检查任务图文件 `.beads/graph.json`', '运行 `ax plan` 重新生成任务图']
        );
    }
}

export class SkillsError extends AxonError {
    constructor(message: string, suggestions: string[] = []) {
        super(
            message,
            'SKILLS_ERROR',
            suggestions.length > 0 ? suggestions : ['检查技能库路径是否正确', '运行 `ax skills list` 查看可用技能']
        );
    }
}

export class CostLimitError extends AxonError {
    constructor(
        dailyLimit: number,
        currentUsage: number,
        estimated: number
    ) {
        super(
            `超过每日 token 限制 (${dailyLimit.toLocaleString()})`,
            'COST_LIMIT',
            [
                `当前已用: ${currentUsage.toLocaleString()} tokens`,
                `本次预估: ${estimated.toLocaleString()} tokens`,
                '调整 `.axon/config.yaml` 中的 `daily_token_limit` 设置',
                '或等待明天额度重置',
            ]
        );
    }
}

/**
 * Global error handler
 */
export function handleError(error: Error): never {
    if (error instanceof AxonError) {
        console.error(error.format());
        process.exit(1);
    }

    console.error(`\n${chalk.red('❌ 未预期的错误')}: ${error.message}`);
    if (process.env['DEBUG']) {
        console.error(chalk.dim(error.stack));
    }
    process.exit(1);
}

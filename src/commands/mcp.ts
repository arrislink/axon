import { Command } from 'commander';
import { ConfigManager } from '../core/config';
import { type McpLLMMode, startAxonMcpServer } from '../core/mcp/server';
import { AxonError } from '../utils/errors';
import { t } from '../utils/i18n';

export const mcpCommand = new Command('mcp').description(t('Run MCP server', '运行 MCP Server'));

mcpCommand
  .option('--llm <mode>', t('LLM mode: auto|off', 'LLM 模式: auto|off'), 'auto')
  .action(async (options) => {
    const projectRoot = process.cwd();
    if (!ConfigManager.isAxonProject(projectRoot)) {
      throw new AxonError('当前目录不是 Axon 项目', 'MCP_ERROR', ['请先运行 `ax init` 初始化项目']);
    }

    const llm = (options.llm === 'off' ? 'off' : 'auto') as McpLLMMode;
    await startAxonMcpServer({ projectRoot, llm });
  });

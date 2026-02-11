/**
 * Agent Orchestrator - Manages AI agent execution
 */

import type { AxonConfig, Bead, Skill } from '../../types';
import { BeadsError } from '../../utils/errors';
import { AxonLLMClient } from '../llm';

export interface ExecutionContext {
  bead: Bead;
  spec: string;
  skills: Skill[];
}

export interface ExecutionResult {
  success: boolean;
  artifacts: {
    files: string[];
    commits: string[];
  };
  tokensUsed: number;
  cost: number;
}

interface GeneratedFile {
  path: string;
  content: string;
}

export class AgentOrchestrator {
  private config: AxonConfig;
  private llm: AxonLLMClient;

  constructor(config: AxonConfig) {
    this.config = config;
    this.llm = new AxonLLMClient();
  }

  /**
   * Execute a bead with the appropriate agent
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { bead } = context;
    const agentConfig = this.config.agents[bead.agent] || this.config.agents.sisyphus;

    // Build prompt
    const prompt = this.buildPrompt(context);

    // Call LLM
    const response = await this.llm.chat([{ role: 'user', content: prompt }], {
      agent: bead.agent,
      model: agentConfig.model,
      temperature: agentConfig.temperature,
      maxTokens: agentConfig.max_tokens,
    });

    const tokensUsed = response.tokens.input + response.tokens.output;
    const cost = response.cost;

    // Parse and write files
    const artifacts = await this.processResponse(response.content);

    return {
      success: true,
      artifacts,
      tokensUsed,
      cost,
    };
  }

  private buildPrompt(context: ExecutionContext): string {
    const { bead, spec, skills } = context;

    let prompt = `你正在执行 Axon 任务图中的任务。

**任务信息:**
- ID: ${bead.id}
- 标题: ${bead.title}
- 描述: ${bead.description}
- 优先级: ${bead.priority}
- 需要技能: ${bead.skills_required.join(', ') || '无'}

**项目规格 (OpenSpec):**
${spec || '(无规格文档)'}
`;

    if (skills.length > 0) {
      prompt += '\n**可用技能模板:**\n';
      for (const skill of skills) {
        prompt += `
### ${skill.metadata.name}
${skill.content}
`;
      }
    }

    prompt += `

**要求:**
1. 严格按照 OpenSpec 中的架构决策实现
2. 优先使用提供的技能模板
3. 生成的代码必须包含单元测试
4. 完成后输出 "DONE: ${bead.id}"

**输出格式:**
请按以下结构输出：

\`\`\`json
{
  "files": [
    {
      "path": "src/example.ts",
      "content": "// 文件内容..."
    }
  ],
  "tests": [
    {
      "path": "tests/example.test.ts",
      "content": "// 测试内容..."
    }
  ],
  "explanation": "实现说明..."
}
\`\`\`
`;

    return prompt;
  }

  private async processResponse(text: string): Promise<{ files: string[]; commits: string[] }> {
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new BeadsError('无法解析 AI 响应: 未找到 JSON 块');
    }

    let data: { files?: GeneratedFile[]; tests?: GeneratedFile[]; explanation?: string };
    try {
      data = JSON.parse(jsonMatch[1]);
    } catch {
      throw new BeadsError('无法解析 AI 响应: JSON 格式无效');
    }

    const files: string[] = [];

    // Write generated files
    for (const file of data.files || []) {
      await Bun.write(file.path, file.content);
      files.push(file.path);
    }

    // Write test files
    for (const test of data.tests || []) {
      await Bun.write(test.path, test.content);
      files.push(test.path);
    }

    return {
      files,
      commits: [],
    };
  }
}

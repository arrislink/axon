/**
 * Beads Generator - Generates task graph from spec
 */

import type { AxonConfig, Bead, BeadsGraph } from '../../types';
import { BeadsError } from '../../utils/errors';
import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { AxonLLMClient } from '../llm';
import { validateGraph } from './graph';

export class BeadsGenerator {
  private llm: AxonLLMClient;

  constructor(_config: AxonConfig) {
    this.llm = new AxonLLMClient();
  }

  /**
   * Generate beads from specification document
   */
  async generateFromSpec(specContent: string, skillContext?: string): Promise<BeadsGraph> {
    const prompt = this.buildPrompt(specContent, skillContext);

    logger.info(
      t(
        '🔍 Decomposing project into atomic tasks (Beads) using AI...',
        '🔍 正在通过 AI 将项目拆解为原子任务 (Beads)...',
      ),
    );
    const response = await this.llm.chat([{ role: 'user', content: prompt }], {
      agent: 'sisyphus',
      temperature: 0.7,
    });

    const beadsData = this.parseResponse(response.content);

    // Create graph with metadata
    const graph: BeadsGraph = {
      version: '1.0',
      beads: beadsData.beads.map((b) => ({
        ...b,
        created_at: new Date().toISOString(),
      })),
      metadata: {
        total_estimated_tokens: beadsData.beads.reduce((sum, b) => sum + b.estimated_tokens, 0),
        total_cost_usd: this.estimateCost(beadsData.beads),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Validate
    const validation = validateGraph(graph);
    if (!validation.valid) {
      throw new BeadsError(`任务图验证失败:\n${validation.errors.join('\n')}`);
    }

    return graph;
  }

  private buildPrompt(spec: string, skillContext?: string): string {
    return `你是一个专业的任务拆解专家。请将以下项目规格拆解为可执行的原子任务（Beads）。

${skillContext ? `参考专家知识 (Skills):\n${skillContext}\n\n` : ''}
规格文档:
${spec}

要求:
1. 每个任务必须是原子的（1-2 小时可完成）
2. 明确任务之间的依赖关系（使用拓扑排序）
3. 为每个任务估算 token 消耗
4. 分配合适的代理（sisyphus/oracle/background）
5. 标注需要的技能标签

请输出 JSON 格式，严格遵循以下 Schema:

\`\`\`json
{
  "beads": [
    {
      "id": "bead_001",
      "title": "任务标题",
      "description": "详细描述（包含验收标准）",
      "dependencies": [],
      "estimated_tokens": 3000,
      "priority": "high",
      "skills_required": ["database-design"],
      "status": "pending",
      "agent": "sisyphus"
    }
  ]
}
\`\`\`

注意:
- id 格式: bead_NNN (从 001 开始)
- dependencies 必须引用已定义的 bead id
- agent 选择: 复杂任务用 sisyphus, 战略思考用 oracle, 简单任务用 background
- 确保依赖关系不形成循环`;
  }

  private parseResponse(text: string): { beads: Bead[] } {
    // Extract JSON from response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    try {
      const data = JSON.parse(jsonStr);
      if (!data.beads || !Array.isArray(data.beads)) {
        throw new BeadsError('无效的任务图格式: 缺少 beads 数组');
      }
      return data;
    } catch (error) {
      throw new BeadsError(`解析 AI 响应失败: ${(error as Error).message}`);
    }
  }

  private estimateCost(beads: Bead[]): number {
    const COST_PER_1M_TOKENS: Record<string, number> = {
      sisyphus: 3.0,
      oracle: 3.0,
      background: 0.5,
    };

    let totalCost = 0;
    for (const bead of beads) {
      const rate = COST_PER_1M_TOKENS[bead.agent] || 3.0;
      totalCost += (bead.estimated_tokens / 1_000_000) * rate;
    }

    return totalCost;
  }
}

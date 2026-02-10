/**
 * Spec Analyzer - Transforms specifications into professional PRDs
 */

import { AxonLLMClient } from '../llm';
import { logger } from '../../utils/logger';
import { t } from '../../utils/i18n';
import type { AxonConfig } from '../../types';

export class SpecAnalyzer {
    private llm: AxonLLMClient;

    constructor(_config: AxonConfig) {
        this.llm = new AxonLLMClient();
    }

    /**
     * Analyze specification and generate a structured PRD
     */
    async analyze(specContent: string, skillContext?: string): Promise<string> {
        logger.info(t('🔍 Analyzing specification and distilling requirements...', '🔍 正在分析规格文档并提取需求...'));

        const prompt = this.buildPRDPrompt(specContent, skillContext);

        const response = await this.llm.chat([{ role: 'user', content: prompt }], {
            agent: 'oracle', // Use oracle for strategic/analytic tasks
            temperature: 0.3,
        });

        return response.content;
    }

    /**
     * Build the prompt for PRD generation, incorporating skill expertise
     */
    private buildPRDPrompt(spec: string, skillContext?: string): string {
        return `你是一个资深产品专家和系统架构师。请根据以下项目规格，整理出一份专业的 PRD（产品需求文档）。

${skillContext ? `参考专家知识 (Skills):\n${skillContext}\n\n` : ''}

原始规格文档:
${spec}

请生成以下结构的 PRD:

# [项目名称] 产品需求文档 (PRD)

## 1. 项目概述
- 项目背景
- 核心目标
- 目标用户

## 2. 核心功能需求
- [功能模块 A]
    - 详细描述
    - 业务流程
- [功能模块 B]
    ...

## 3. 技术架构建议
- 技术栈选择
- 核心模块设计
- 数据流动模型

## 4. 非功能性需求
- 性能要求
- 安全性/合规性
- 扩展性

## 5. 验收标准
- 核心验收项
- 边界情况

请使用 Markdown 格式，语言简洁、专业、严谨。`;
    }
}

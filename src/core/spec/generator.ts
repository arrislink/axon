/**
 * Spec Generator - Generates OpenSpec documents
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { AxonLLMClient } from '../llm';

interface CollectedSpec {
    projectType: string;
    features: string[];
    techStack: string;
    description: string;
    additionalRequirements: string;
}

export class SpecGenerator {
    private llm: AxonLLMClient | null = null;

    constructor(enableAI = true) {
        if (enableAI) {
            this.llm = new AxonLLMClient();
        }
    }

    /**
     * Generate spec document from collected requirements
     */
    async generate(collected: CollectedSpec): Promise<string> {
        if (this.llm?.isAvailable()) {
            return await this.generateWithAI(collected);
        }
        return this.generateFromTemplate(collected);
    }

    private async generateWithAI(collected: CollectedSpec): Promise<string> {
        const prompt = `作为一名资深架构师，请根据以下需求生成一份结构化的 OpenSpec 规格文档。

需求信息:
- 项目描述: ${collected.description}
- 项目类型: ${collected.projectType}
- 所需功能: ${collected.features.join(', ')}
- 技术栈: ${collected.techStack}
- 其他需求: ${collected.additionalRequirements || '无'}

请生成 Markdown 格式的规格文档，包含以下部分:
1. 项目概述
2. 功能需求 (按功能模块组织)
3. 技术架构 (包含技术选型理由)
4. API 设计 (如果适用)
5. 数据模型
6. 非功能需求 (性能、安全等)
7. 架构决策记录 (ADR)

确保文档清晰、可执行，便于后续任务拆解。`;

        const response = await this.llm!.chat([{ role: 'user', content: prompt }], {
            temperature: 0.7,
            maxTokens: 4000,
        });

        return response.content;
    }

    private generateFromTemplate(collected: CollectedSpec): string {
        const techStackNames: Record<string, string> = {
            'typescript-bun': 'TypeScript + Bun',
            'typescript-node': 'TypeScript + Node.js',
            go: 'Go',
            'python-fastapi': 'Python + FastAPI',
            rust: 'Rust',
            auto: '待定',
        };

        const projectTypeNames: Record<string, string> = {
            api: 'Web API',
            webapp: 'Web 应用',
            cli: 'CLI 工具',
            library: '库/SDK',
            other: '其他',
        };

        return `# ${collected.description}

## 1. 项目概述

**类型**: ${projectTypeNames[collected.projectType] || collected.projectType}

**描述**: ${collected.description}

**技术栈**: ${techStackNames[collected.techStack] || collected.techStack}

---

## 2. 功能需求

${collected.features.map((f) => `### ${this.formatFeatureName(f)}\n\n- [ ] 待详细定义\n`).join('\n')}

---

## 3. 技术架构

### 3.1 技术选型

- **运行时**: ${techStackNames[collected.techStack] || collected.techStack}
- **构建工具**: 待定
- **测试框架**: 待定

### 3.2 目录结构

\`\`\`
src/
├── index.ts          # 入口
├── ...               # 待细化
\`\`\`

---

## 4. 非功能需求

- **性能**: 待定义
- **安全**: 待定义
- **可维护性**: 待定义

---

## 5. 架构决策记录 (ADR)

### ADR-001: 技术栈选择

- **状态**: 已决定
- **决定**: 使用 ${techStackNames[collected.techStack] || collected.techStack}
- **理由**: 待补充

---

## 附录

${collected.additionalRequirements ? `### 其他需求\n\n${collected.additionalRequirements}` : ''}
`;
    }

    private formatFeatureName(feature: string): string {
        const names: Record<string, string> = {
            'auth-jwt': 'JWT 用户认证',
            oauth: 'OAuth 2.0 集成',
            crud: 'CRUD 基础接口',
            validation: '数据验证',
            openapi: 'OpenAPI 文档',
            'rate-limit': '速率限制',
            logging: '日志记录',
            'error-handling': '错误处理',
            config: '配置管理',
            testing: '单元测试',
            auth: '用户认证',
            responsive: '响应式 UI',
            state: '状态管理',
            routing: '路由',
            'api-integration': 'API 集成',
            interactive: '交互式提示',
            'config-file': '配置文件支持',
            help: '帮助文档',
            progress: '进度显示',
            colors: '颜色输出',
        };
        return names[feature] || feature;
    }

    /**
     * Save spec to file
     */
    async save(content: string, targetPath: string): Promise<void> {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(targetPath, content, 'utf-8');
    }
}

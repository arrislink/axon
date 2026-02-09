/**
 * Spec Collector - Interactive requirements gathering
 */

import { input, select, multiSelect, confirm } from '../../utils/prompt';
import { logger } from '../../utils/logger';

interface CollectedSpec {
    projectType: string;
    features: string[];
    techStack: string;
    description: string;
    additionalRequirements: string;
}

export class SpecCollector {
    // Reserved for future AI-assisted spec collection
    constructor() {
        // Config and API key will be used in future versions via AxonLLMClient
    }

    /**
     * Run interactive spec collection
     */
    async collect(): Promise<CollectedSpec> {
        logger.title('Axon 需求收集');
        console.log('让我们开始定义你的项目！\n');

        // Step 1: Project description
        const description = await input({
            message: '🍀 你想构建什么项目？',
            validate: (val) => val.length > 5 || '请提供更详细的描述',
        });

        // Step 2: Project type
        const projectType = await select<string>('📦 项目类型？', [
            { name: 'Web API', value: 'api', description: 'RESTful 或 GraphQL 后端服务' },
            { name: 'Web 应用', value: 'webapp', description: '前端 + 后端完整应用' },
            { name: 'CLI 工具', value: 'cli', description: '命令行工具' },
            { name: '库/SDK', value: 'library', description: '可复用的代码库' },
            { name: '其他', value: 'other', description: '其他类型项目' },
        ]);

        // Step 3: Features (based on project type)
        const featureOptions = this.getFeatureOptions(projectType);
        const features = await multiSelect<string>('✨ 需要哪些功能？', featureOptions);

        // Step 4: Tech stack
        const techStack = await select<string>('🛠️ 技术栈偏好？', [
            { name: 'TypeScript + Bun', value: 'typescript-bun', description: '快速、现代的 JS 运行时' },
            { name: 'TypeScript + Node.js', value: 'typescript-node', description: '成熟稳定的 JS 运行时' },
            { name: 'Go', value: 'go', description: '高性能、简洁的语言' },
            { name: 'Python + FastAPI', value: 'python-fastapi', description: '快速 API 开发' },
            { name: 'Rust', value: 'rust', description: '内存安全、高性能' },
            { name: '让 AI 推荐', value: 'auto', description: '根据项目需求自动选择' },
        ]);

        // Step 5: Additional requirements
        let additionalRequirements = '';
        const hasMore = await confirm({ message: '📝 还有其他需求要补充吗？', default: false });
        if (hasMore) {
            additionalRequirements = await input({
                message: '请描述其他需求:',
            });
        }

        return {
            projectType,
            features,
            techStack,
            description,
            additionalRequirements,
        };
    }

    private getFeatureOptions(projectType: string) {
        const common = [
            { name: '日志记录', value: 'logging' },
            { name: '错误处理', value: 'error-handling' },
            { name: '配置管理', value: 'config' },
            { name: '单元测试', value: 'testing' },
        ];

        switch (projectType) {
            case 'api':
                return [
                    { name: '用户认证 (JWT)', value: 'auth-jwt' },
                    { name: 'OAuth 2.0', value: 'oauth' },
                    { name: 'CRUD 基础接口', value: 'crud' },
                    { name: '数据验证', value: 'validation' },
                    { name: 'API 文档 (OpenAPI)', value: 'openapi' },
                    { name: '速率限制', value: 'rate-limit' },
                    ...common,
                ];
            case 'webapp':
                return [
                    { name: '用户认证', value: 'auth' },
                    { name: '响应式 UI', value: 'responsive' },
                    { name: '状态管理', value: 'state' },
                    { name: '路由', value: 'routing' },
                    { name: 'API 集成', value: 'api-integration' },
                    ...common,
                ];
            case 'cli':
                return [
                    { name: '交互式提示', value: 'interactive' },
                    { name: '配置文件支持', value: 'config-file' },
                    { name: '帮助文档', value: 'help' },
                    { name: '进度显示', value: 'progress' },
                    { name: '颜色输出', value: 'colors' },
                    ...common,
                ];
            default:
                return common;
        }
    }
}

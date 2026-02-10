import { t } from '../../utils/i18n';
import { logger } from '../../utils/logger';
import { confirm, editor, input, multiSelect, select } from '../../utils/prompt';
import { DocumentManager } from '../docs/manager';
import type { Document } from '../../types/docs';
import type { CollectedSpec } from '../../types/spec';

export class SpecCollector {
  private docManager: DocumentManager;

  constructor() {
    this.docManager = new DocumentManager();
  }

  /**
   * Entry point for collecting project requirements
   */
  async collect(): Promise<CollectedSpec> {
    const docs = this.docManager.list();
    if (docs.length > 0) {
      const useDocs = await confirm({
        message: t(`Found ${docs.length} reference documents. Use them to generate specification?`, `找到 ${docs.length} 个参考文档。是否基于这些文档生成规格？`),
        default: true
      });

      if (useDocs) {
        return await this.collectFromDocs(docs);
      }
    }

    return await this.collectInteractive();
  }

  /**
   * Collects spec based on provided documents.
   */
  private async collectFromDocs(_docs: Document[]): Promise<CollectedSpec> {
    logger.info(t('🤖 Generating specification from documents...', '🤖 正在基于文档生成规格...'));

    const context = this.docManager.compileContext({
      maxTokens: 50000 // Reserve space for response
    });

    const prompt = t(`You are a professional product manager. Based on the following reference documents, generate a complete project specification document (OpenSpec format).

${context}

Requirements:
1. Extract core requirements and features.
2. Identify tech stack and constraints.
3. List non-functional requirements.
4. If API specs exist, include key interface definitions.
5. Generate in Markdown format.`, `你是一个专业的产品经理。请基于以下参考资料，生成一份完整的项目规格文档。

${context}

要求：
1. 提取核心需求和功能
2. 识别技术栈和约束条件
3. 列出关键的非功能需求（性能、安全等）
4. 如果有 API 规范，保留关键接口定义
5. 请生成符合 OpenSpec 格式的规格文档（Markdown 格式）。`);

    // We need to use the LLM client here
    // Since SpecCollector constructor doesn't take config yet, we'll instantiate AxonLLMClient directly
    // In a real generic dependency injection scenario, this should be passed in.
    const { AxonLLMClient } = await import('../llm');
    const llm = new AxonLLMClient();

    try {
      const response = await llm.complete(prompt);

      return {
        projectType: 'auto',
        features: [],
        techStack: 'auto',
        description: t('Generated from documents', '从文档生成'),
        additionalRequirements: '',
        rawContent: response
      };
    } catch (error) {
      logger.error(t(`AI generation failed: ${(error as Error).message}`, `AI 生成失败: ${(error as Error).message}`));
      logger.info(t('Falling back to interactive mode.', '回退到交互模式。'));
      return this.collectInteractive();
    }
  }

  /**
   * Run interactive spec collection
   */
  async collectInteractive(): Promise<CollectedSpec> {
    logger.title(t('Axon Requirements Collection', 'Axon 需求收集'));
    console.log(t("Let's start defining your project!\n", '让我们开始定义你的项目！\n'));

    // Step 1: Project description
    const description = await input({
      message: t('🍀 What project do you want to build?', '🍀 你想构建什么项目？'),
      validate: (val) =>
        val.length > 5 || t('Please provide a more detailed description', '请提供更详细的描述'),
    });

    // Step 2: Project type
    const projectType = await select<string>(t('📦 Project type?', '📦 项目类型？'), [
      {
        name: 'Web API',
        value: 'api',
        description: t('RESTful or GraphQL backend service', 'RESTful 或 GraphQL 后端服务'),
      },
      {
        name: 'Web App',
        value: 'webapp',
        description: t('Frontend + Backend full application', '前端 + 后端完整应用'),
      },
      {
        name: 'Axon Skill',
        value: 'skill',
        description: t('Reusable AI skill/plugin', '可复用的 AI 技能/插件'),
      },
      { name: 'CLI Tool', value: 'cli', description: t('Command line tool', '命令行工具') },
      {
        name: 'Library/SDK',
        value: 'library',
        description: t('Reusable code library', '可复用的代码库'),
      },
      { name: 'Other', value: 'other', description: t('Other types of projects', '其他类型项目') },
    ]);

    // Step 3: Features (based on project type)
    const featureOptions = this.getFeatureOptions(projectType);
    const features = await multiSelect<string>(
      t('✨ Which features do you need?', '✨ 需要哪些功能？'),
      featureOptions,
    );

    // Step 4: Tech stack
    const techStack = await select<string>(t('🛠️ Tech stack preference?', '🛠️ 技术栈偏好？'), [
      {
        name: 'TypeScript + Bun',
        value: 'typescript-bun',
        description: t('Fast, modern JS runtime', '快速、现代的 JS 运行时'),
      },
      {
        name: 'TypeScript + Node.js',
        value: 'typescript-node',
        description: t('Mature and stable JS runtime', '成熟稳定的 JS 运行时'),
      },
      {
        name: 'Go',
        value: 'go',
        description: t('High performance, concise language', '高性能、简洁的语言'),
      },
      {
        name: 'Python + FastAPI',
        value: 'python-fastapi',
        description: t('Fast API development', '快速 API 开发'),
      },
      {
        name: 'Rust',
        value: 'rust',
        description: t('Memory safe, high performance', '内存安全、高性能'),
      },
      {
        name: 'Let AI Recommend',
        value: 'auto',
        description: t('Automatically choose based on requirements', '根据项目需求自动选择'),
      },
    ]);

    // Step 5: Additional requirements
    let additionalRequirements = '';
    const hasMore = await confirm({
      message: t('📝 Any other requirements to add?', '📝 还有其他需求要补充吗？'),
      default: false,
    });
    if (hasMore) {
      additionalRequirements = await editor(
        t('Please describe other requirements (open in editor):', '请在编辑器中描述其他需求:'),
      );
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
      { name: t('Logging', '日志记录'), value: 'logging' },
      { name: t('Error Handling', '错误处理'), value: 'error-handling' },
      { name: t('Config Management', '配置管理'), value: 'config' },
      { name: t('Unit Testing', '单元测试'), value: 'testing' },
    ];

    switch (projectType) {
      case 'api':
        return [
          { name: t('Authentication (JWT)', '用户认证 (JWT)'), value: 'auth-jwt' },
          { name: 'OAuth 2.0', value: 'oauth' },
          { name: t('CRUD Basic API', 'CRUD 基础接口'), value: 'crud' },
          { name: t('Data Validation', '数据验证'), value: 'validation' },
          { name: t('API Docs (OpenAPI)', 'API 文档 (OpenAPI)'), value: 'openapi' },
          { name: t('Rate Limit', '速率限制'), value: 'rate-limit' },
          ...common,
        ];
      case 'webapp':
        return [
          { name: t('Authentication', '用户认证'), value: 'auth' },
          { name: t('Responsive UI', '响应式 UI'), value: 'responsive' },
          { name: t('State Management', '状态管理'), value: 'state' },
          { name: t('Routing', '路由'), value: 'routing' },
          { name: t('API Integration', 'API 集成'), value: 'api-integration' },
          ...common,
        ];
      case 'cli':
        return [
          { name: t('Interactive Prompts', '交互式提示'), value: 'interactive' },
          { name: t('Config File Support', '配置文件支持'), value: 'config-file' },
          { name: t('Help Docs', '帮助文档'), value: 'help' },
          { name: t('Progress Indicators', '进度显示'), value: 'progress' },
          { name: t('Colorized Output', '颜色输出'), value: 'colors' },
          ...common,
        ];
      case 'skill':
        return [
          { name: t('Skill Spec', '功能描述 (Skill Spec)'), value: 'skill-spec' },
          { name: t('Skill Examples', '使用示例 (Examples)'), value: 'skill-examples' },
          { name: t('Core Logic (Beads)', '核心逻辑 (Beads)'), value: 'skill-logic' },
          { name: t('Dependency Management', '依赖管理'), value: 'skill-deps' },
          ...common,
        ];
      default:
        return common;
    }
  }
}

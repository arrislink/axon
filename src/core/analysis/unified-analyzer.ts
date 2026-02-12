import type { EnhancedSpec, RequirementAnalysis } from '../../types/enhanced-spec';
import { logger } from '../../utils/logger';
import { LLMClient } from '../llm/client';
import { SkillsManager } from '../perception/skills';
import { type AnalysisResult, RequirementAnalyzer } from './requirement-analyzer';
import { type ParsedRequirements, RequirementParser } from './requirement-parser';

export interface UnifiedAnalysisInput {
  userInstruction: string;
  reqPath?: string;
}

export interface UnifiedAnalysisResult {
  success: boolean;
  spec?: EnhancedSpec;
  analysis?: RequirementAnalysis;
  parsedRequirements?: ParsedRequirements;
  clarificationNeeded?: boolean;
  clarificationQuestions?: string[];
  error?: string;
}

export class UnifiedAnalyzer {
  private llmClient: LLMClient;
  private skillsManager: SkillsManager;
  private requirementAnalyzer: RequirementAnalyzer;
  private requirementParser: RequirementParser;

  constructor(projectRoot: string) {
    this.llmClient = new LLMClient();
    this.skillsManager = new SkillsManager(projectRoot);
    this.requirementAnalyzer = new RequirementAnalyzer();
    this.requirementParser = new RequirementParser(projectRoot);
  }

  async analyze(input: UnifiedAnalysisInput): Promise<UnifiedAnalysisResult> {
    try {
      logger.info('🔍 Starting unified requirement analysis...');

      // Step 1: Parse requirement files if provided
      let parsedRequirements: ParsedRequirements | undefined;
      let combinedInput = input.userInstruction;

      if (input.reqPath) {
        logger.info(`📄 Parsing requirement files from: ${input.reqPath}`);
        parsedRequirements = await this.requirementParser.parseFromPath(input.reqPath);

        // Merge user instruction with parsed requirements
        combinedInput = this.requirementParser.mergeWithInstruction(
          parsedRequirements,
          input.userInstruction,
        );

        logger.info(
          `✓ Parsed ${parsedRequirements.summary.totalFiles} files (${parsedRequirements.summary.totalSize} bytes)`,
        );
      }

      // Step 2: Analyze requirements
      logger.info('🧠 Analyzing requirements...');
      const analysisResult = await this.requirementAnalyzer.analyze(combinedInput);

      if (!analysisResult.success || !analysisResult.analysis) {
        return {
          success: false,
          error: `Requirement analysis failed: ${analysisResult.error}`,
          parsedRequirements,
        };
      }

      const analysis = analysisResult.analysis;
      logger.info(
        `✓ Analysis complete: ${analysis.key_entities.length} entities, ${analysis.workflows.length} workflows`,
      );

      // Step 3: Check for high ambiguity
      let clarificationNeeded = false;
      let clarificationQuestions: string[] = [];

      if (analysis.ambiguity_score > 50) {
        clarificationNeeded = true;
        clarificationQuestions = await this.requirementAnalyzer.generateClarificationQuestions(
          combinedInput,
          analysis,
        );

        logger.warn(
          `⚠️ High ambiguity detected (${analysis.ambiguity_score}/100). Clarification recommended.`,
        );
        for (const q of clarificationQuestions) {
          logger.info(`  ❓ ${q}`);
        }
      }

      // Step 4: Generate Enhanced Spec
      logger.info('📝 Generating PRD specification...');
      const spec = await this.generateSpec(combinedInput, analysis);

      logger.success(`✓ Generated PRD: ${spec.metadata.title}`);
      logger.info(`  📊 ${spec.stories.length} stories, ${spec.entities.length} entities`);
      logger.info(`  🎯 Complexity: ${spec.analysis.estimated_effort}`);

      return {
        success: true,
        spec,
        analysis,
        parsedRequirements,
        clarificationNeeded,
        clarificationQuestions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async generateSpec(
    combinedInput: string,
    analysis: RequirementAnalysis,
  ): Promise<EnhancedSpec> {
    const skills = await this.skillsManager.loadInstalled();
    const skillsContext = await this.skillsManager.getSkillsContent(skills.slice(0, 3));

    const systemPrompt = this.buildSpecGenerationPrompt(skillsContext);

    const userPrompt = `Create a detailed PRD specification based on this analysis:

Intent: ${analysis.intent}
Scope In: ${analysis.scope.in_scope.join(', ')}
Scope Out: ${analysis.scope.out_of_scope.join(', ')}
Key Entities: ${analysis.key_entities.join(', ')}
Workflows: ${analysis.workflows.join(', ')}
Estimated Effort: ${analysis.estimated_effort}

Original Input:
${combinedInput}`;

    const response = await this.llmClient.completeJSON<EnhancedSpec>([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    if (!response.success || !response.data) {
      throw new Error(`Spec generation failed: ${response.error}`);
    }

    const spec = response.data;
    spec.metadata.created_at = new Date().toISOString();
    spec.metadata.updated_at = new Date().toISOString();
    spec.analysis = analysis;

    return spec;
  }

  private buildSpecGenerationPrompt(skillsContext: string): string {
    return `You are an expert product manager and software architect. Create a comprehensive PRD specification document.

${skillsContext ? `\nReference Skills:\n${skillsContext}\n` : ''}

Generate a specification with these sections:

1. metadata: title, description, status ("draft")
2. personas: 1-3 user personas with goals and pain points
3. stories: User stories mapped to personas with acceptance criteria
4. entities: Core data models with attributes and relationships
5. workflows: Business processes with steps and actors
6. business_rules: Domain constraints and policies
7. technical_constraints: Performance, security, scalability requirements
8. implementation: Tech stack and architecture decisions
9. success_criteria: Measurable outcomes

Guidelines:
- Be specific and actionable
- Include concrete acceptance criteria
- Define clear entity relationships
- Consider edge cases in workflows
- Make architecture decisions explicit

Output valid JSON matching the EnhancedSpec interface structure.`;
  }

  async quickAnalyze(instruction: string): Promise<AnalysisResult> {
    return this.requirementAnalyzer.analyze(instruction);
  }
}

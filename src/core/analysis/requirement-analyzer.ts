import type { RequirementAnalysis } from '../../types/enhanced-spec';
import { LLMClient } from '../llm/client';

export interface AnalysisResult {
  success: boolean;
  analysis?: RequirementAnalysis;
  error?: string;
}

export class RequirementAnalyzer {
  private llmClient: LLMClient;

  constructor() {
    this.llmClient = new LLMClient();
  }

  async analyze(userInput: string, context?: string): Promise<AnalysisResult> {
    const systemPrompt = `You are an expert requirements analyst. Analyze the user's development request and extract structured information.

Analyze for:
1. Core intent and goal
2. Scope boundaries (what's in/out)
3. Key entities and nouns
4. Workflows and processes
5. Ambiguities needing clarification
6. Effort estimation

Respond with JSON in this exact format:
{
  "intent": "single sentence describing the core goal",
  "scope": {
    "in_scope": ["specific features or tasks included"],
    "out_of_scope": ["explicit exclusions"],
    "assumptions": ["assumptions being made"]
  },
  "ambiguity_score": 0-100 (0=clear, 100=very vague),
  "clarification_questions": ["questions to ask user"],
  "key_entities": ["domain entities identified"],
  "workflows": ["business processes identified"],
  "estimated_effort": "hours|days|weeks|months"
}`;

    const userPrompt = context
      ? `Context: ${context}\n\nRequest: ${userInput}`
      : `Request: ${userInput}`;

    try {
      const response = await this.llmClient.completeJSON<RequirementAnalysis>([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error || 'Failed to analyze requirements',
        };
      }

      return {
        success: true,
        analysis: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generateClarificationQuestions(
    userInput: string,
    analysis: RequirementAnalysis,
  ): Promise<string[]> {
    if (analysis.ambiguity_score < 30) {
      return [];
    }

    const systemPrompt = `Based on the requirement analysis, generate 3-5 specific clarification questions to reduce ambiguity.

The questions should:
- Be specific and actionable
- Help define scope boundaries
- Uncover hidden assumptions
- Identify missing details

Respond with JSON: {"questions": ["question 1", "question 2", ...]}`;

    const userPrompt = `Original request: ${userInput}

Analysis:
- Intent: ${analysis.intent}
- Ambiguity score: ${analysis.ambiguity_score}/100
- Key entities: ${analysis.key_entities.join(', ')}
- Current scope: ${analysis.scope.in_scope.join(', ')}

Generate clarification questions.`;

    try {
      const response = await this.llmClient.completeJSON<{ questions: string[] }>([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (response.success && response.data) {
        return response.data.questions;
      }
    } catch {
      return analysis.clarification_questions.slice(0, 5);
    }

    return analysis.clarification_questions.slice(0, 5);
  }

  calculateAmbiguityScore(text: string): number {
    let score = 0;
    const lower = text.toLowerCase();

    const vagueTerms = ['maybe', 'possibly', 'some', 'various', 'etc', 'something', 'anything'];
    for (const term of vagueTerms) {
      if (lower.includes(term)) score += 10;
    }

    const missingSpecifics = !lower.includes('user') && !lower.includes('admin');
    if (missingSpecifics) score += 15;

    if (text.length < 50) score += 20;

    return Math.min(score, 100);
  }
}

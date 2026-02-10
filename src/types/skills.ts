/**
 * Skills types for Axon
 */

export interface SkillMetadata {
  name: string;
  description: string;
  tags: string[];
  models: string[];
  tokens_avg: number;
  difficulty: 'easy' | 'medium' | 'hard';
  last_updated: string;
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
  path: string;
  score?: number;
}

export interface SkillSearchResult {
  skill: Skill;
  score: number;
  matchedOn: ('name' | 'tags' | 'description' | 'content')[];
}

export interface SkillLibraryStats {
  total: number;
  byTag: Record<string, number>;
  byDifficulty: Record<string, number>;
}

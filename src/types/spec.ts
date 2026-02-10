/**
 * Specification types
 */

export interface CollectedSpec {
  projectType: string;
  features: string[];
  techStack: string;
  description: string;
  additionalRequirements: string;
  rawContent?: string; // Pre-generated content from docs
}

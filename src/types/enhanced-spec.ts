/**
 * Enhanced Spec Types - AI-Optimized PRD Structure
 *
 * Provides rich context for better requirement analysis
 * and intelligent bead generation.
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Complexity = 'simple' | 'moderate' | 'complex' | 'very_complex';
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * User Persona - Target user definition
 */
export interface UserPersona {
  id: string;
  name: string;
  role: string;
  goals: string[];
  pain_points: string[];
  technical_level: 'beginner' | 'intermediate' | 'expert';
}

/**
 * User Story - Feature from user perspective
 */
export interface UserStory {
  id: string;
  persona: string;
  action: string;
  benefit: string;
  acceptance_criteria: string[];
  priority: Priority;
}

/**
 * Business Rule - Domain constraint or policy
 */
export interface BusinessRule {
  id: string;
  description: string;
  type: 'constraint' | 'validation' | 'calculation' | 'workflow';
  impact: string[];
}

/**
 * Data Entity - Core domain model
 */
export interface DataEntity {
  name: string;
  attributes: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  relationships: Array<{
    entity: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    description?: string;
  }>;
}

/**
 * Workflow - Business process flow
 */
export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: Array<{
    order: number;
    action: string;
    actor: string;
    system?: string[];
  }>;
  alternative_flows?: string[];
}

/**
 * Technical Constraint - Architecture/tech limitations
 */
export interface TechnicalConstraint {
  category: 'performance' | 'security' | 'scalability' | 'compatibility' | 'cost';
  description: string;
  requirement: string;
}

/**
 * Requirement Analysis Output
 */
export interface RequirementAnalysis {
  intent: string;
  scope: {
    in_scope: string[];
    out_of_scope: string[];
    assumptions: string[];
  };
  ambiguity_score: number;
  clarification_questions: string[];
  key_entities: string[];
  workflows: string[];
  estimated_effort: 'hours' | 'days' | 'weeks' | 'months';
}

/**
 * Enhanced Spec - Rich PRD structure
 */
export interface EnhancedSpec {
  version: string;
  metadata: {
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
    author?: string;
    status: 'draft' | 'review' | 'approved' | 'implemented';
  };

  analysis: RequirementAnalysis;

  personas: UserPersona[];
  stories: UserStory[];
  entities: DataEntity[];
  workflows: Workflow[];
  business_rules: BusinessRule[];
  technical_constraints: TechnicalConstraint[];

  implementation: {
    tech_stack: string[];
    architecture_decisions: Array<{
      id: string;
      title: string;
      decision: string;
      rationale: string;
      alternatives_considered: string[];
    }>;
    security_considerations: string[];
    performance_targets: string[];
  };

  success_criteria: string[];
}

/**
 * Bead Types - Enhanced bead definitions
 */
export interface BeadDependency {
  bead_id: string;
  type: 'hard' | 'soft';
  reason: string;
}

export interface BeadComplexity {
  level: Complexity;
  story_points: number;
  estimated_hours: number;
  risk_factors: string[];
}

export interface EnhancedBead {
  id: string;
  title: string;
  description: string;
  instruction: string;

  context: {
    related_stories: string[];
    related_entities: string[];
    related_workflows: string[];
    business_rules: string[];
  };

  dependencies: BeadDependency[];
  reverse_dependencies?: string[];

  complexity: BeadComplexity;

  skills_required: string[];
  files_to_modify: string[];
  files_to_create: string[];

  acceptance_criteria: string[];
  verification_command?: string;

  status: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  priority: Priority;

  parallel_group?: string;
  can_parallelize: boolean;

  created_at: string;
  updated_at: string;
  completed_at?: string;

  artifacts?: {
    files: string[];
    commits: string[];
    notes: string[];
  };
}

/**
 * Bead Graph - Enhanced with analysis metadata
 */
export interface EnhancedBeadGraph {
  version: string;
  spec_version: string;
  generated_at: string;

  analysis: {
    total_beads: number;
    critical_path_length: number;
    parallel_groups: number;
    estimated_total_hours: number;
    risk_level: RiskLevel;
  };

  beads: EnhancedBead[];

  execution_plan: {
    phases: Array<{
      name: string;
      beads: string[];
      can_parallelize: boolean;
    }>;
  };

  metadata: {
    total_beads: number;
    completed_beads: number;
    failed_beads: number;
    in_progress_beads: number;
    blocked_beads: number;
  };
}

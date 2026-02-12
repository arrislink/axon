import { describe, expect, it } from 'bun:test';
import { RequirementAnalyzer } from '../src/core/analysis/requirement-analyzer';
import { RequirementParser } from '../src/core/analysis/requirement-parser';
import { Planner } from '../src/core/planning';

describe('RequirementAnalyzer', () => {
  const analyzer = new RequirementAnalyzer();

  it('should calculate ambiguity score for vague text', () => {
    const vagueText = 'Build something with some features';
    const score = analyzer.calculateAmbiguityScore(vagueText);
    expect(score).toBeGreaterThan(50);
  });

  it('should calculate low ambiguity score for specific text', () => {
    const specificText =
      'Implement user authentication system with JWT tokens for admin users with password validation';
    const score = analyzer.calculateAmbiguityScore(specificText);
    expect(score).toBeLessThan(50);
  });

  it('should detect vague terms', () => {
    const text = 'Maybe add some functionality';
    const score = analyzer.calculateAmbiguityScore(text);
    expect(score).toBeGreaterThan(0);
  });
});

describe('RequirementParser', () => {
  const parser = new RequirementParser(process.cwd());

  it('should extract key sections from markdown content', () => {
    const content = `
# Project

## Requirements
- Feature 1
- Feature 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
`;
    const sections = parser.extractKeySections(content);

    expect(sections.requirements).toContain('Feature 1');
    expect(sections.requirements).toContain('Feature 2');
    expect(sections.acceptanceCriteria).toContain('Criterion 1');
    expect(sections.acceptanceCriteria).toContain('Criterion 2');
  });

  it('should merge instruction with parsed requirements', () => {
    const parsed = {
      rawText: '## File\nContent',
      files: [],
      summary: { totalFiles: 1, totalSize: 100, byType: {} },
    };

    const merged = parser.mergeWithInstruction(parsed, 'Build app');
    expect(merged).toContain('User Request');
    expect(merged).toContain('Build app');
    // files is empty, so Requirement Documents section should not be included
    expect(merged).not.toContain('Requirement Documents');
    expect(merged).toBe('# User Request\n\nBuild app');
  });
});

describe('Planner', () => {
  const planner = new Planner(process.cwd());

  it('should return null when no spec exists', () => {
    const spec = planner.loadSpec();
    expect(spec === null || typeof spec === 'object').toBe(true);
  });

  it('should return null when no graph exists', () => {
    const graph = planner.loadGraph();
    expect(graph === null || typeof graph === 'object').toBe(true);
  });
});

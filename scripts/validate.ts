#!/usr/bin/env bun

import { execSync } from 'node:child_process';

interface ValidationStep {
  name: string;
  command: string;
  critical: boolean;
}

const steps: ValidationStep[] = [
  {
    name: 'TypeScript Type Check',
    command: 'bun run type-check',
    critical: true,
  },
  {
    name: 'Lint Check',
    command: 'bunx @biomejs/biome check .',
    critical: true,
  },
  {
    name: 'Build Binary',
    command: 'bun run build',
    critical: true,
  },
  {
    name: 'Run Tests',
    command: 'bun test',
    critical: true,
  },
  {
    name: 'Verify Binary Exists',
    command: 'test -f dist/ax && echo "Binary exists"',
    critical: true,
  },
  {
    name: 'Check Required Files',
    command: 'test -f README.md && test -f LICENSE && echo "Required files exist"',
    critical: true,
  },
];

console.log('🔍 Running pre-publish validation...\n');

const failedSteps = [];
const passedSteps = [];

for (const step of steps) {
  process.stdout.write(`⏳ ${step.name}... `);

  try {
    execSync(step.command, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log('✅');
    passedSteps.push(step.name);
  } catch (error) {
    console.log('❌');
    failedSteps.push({ name: step.name, critical: step.critical });

    if (step.critical) {
      console.error(`\n💥 Critical step failed: ${step.name}`);
      console.error('Publishing aborted.\n');
      process.exit(1);
    }
  }
}

console.log('\n📊 Validation Summary:');
console.log(`   ✅ Passed: ${passedSteps.length}/${steps.length}`);
console.log(`   ❌ Failed: ${failedSteps.length}/${steps.length}`);

if (failedSteps.length > 0) {
  console.log('\n⚠️  Non-critical failures:');
  for (const step of failedSteps) {
    console.log(`   - ${step.name}`);
  }
}

console.log('\n✨ All critical checks passed! Ready to publish.\n');
process.exit(0);

import type { BeadsGraph } from '../../types';
import type { CheckResult } from './check-runner';

export interface VerifyInputs {
  spec?: string;
  prd?: string;
  graph?: BeadsGraph;
  checks?: CheckResult[];
}

function summarizeChecks(checks: CheckResult[] | undefined): string {
  if (!checks || checks.length === 0) return '- 未配置或未运行 checks\n';
  const lines: string[] = [];
  for (const c of checks) {
    const status = c.exitCode === 0 ? 'PASS' : 'FAIL';
    lines.push(`- ${status}: ${c.command}`);
  }
  return lines.join('\n') + '\n';
}

export function buildVerifyMarkdown(inputs: VerifyInputs): string {
  const { spec, prd, graph, checks } = inputs;
  const pending = graph?.beads?.filter((b) => b.status === 'pending') || [];
  const failed = graph?.beads?.filter((b) => b.status === 'failed') || [];

  const md: string[] = [];
  md.push('# VERIFY\n');

  md.push('## Beads 状态\n');
  md.push(`- 总任务: ${graph?.beads?.length || 0}`);
  md.push(`- 待处理: ${pending.length}`);
  md.push(`- 失败: ${failed.length}\n`);

  if (failed.length > 0) {
    md.push('### 失败任务\n');
    for (const b of failed) {
      md.push(`- ${b.id}: ${b.title}${b.error ? ` (${b.error})` : ''}`);
    }
    md.push('');
  }

  md.push('## Checks\n');
  md.push(summarizeChecks(checks));

  md.push('## 需求对照（轻量）\n');
  md.push('- 本报告不做深度语义审计，仅提供可追溯的文件与状态汇总');
  md.push(`- Spec: ${spec && spec.trim().length > 0 ? '存在' : '缺失'}`);
  md.push(`- PRD: ${prd && prd.trim().length > 0 ? '存在' : '缺失'}`);

  return md.join('\n');
}


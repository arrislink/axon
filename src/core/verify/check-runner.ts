export interface CheckResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class CheckRunner {
  private cwd: string;
  private commands: string[];

  constructor(cwd: string, commands: string[]) {
    this.cwd = cwd;
    this.commands = commands.map((c) => c.trim()).filter(Boolean);
  }

  runAll(): CheckResult[] {
    const results: CheckResult[] = [];
    for (const command of this.commands) {
      const proc = Bun.spawnSync(['bash', '-lc', command], {
        cwd: this.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: process.env,
      });

      results.push({
        command,
        exitCode: proc.exitCode,
        stdout: new TextDecoder().decode(proc.stdout),
        stderr: new TextDecoder().decode(proc.stderr),
      });
    }
    return results;
  }
}


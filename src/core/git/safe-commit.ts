/**
 * Safe Git Operations
 *
 *
 * Provides wrappers around git commands to ensure safety:
 * 1. Check for unstaged changes before commit
 * 2. Warn when committing to protected branches (main/master)
 * 3. Support dry-run and interactive confirmation
 */

import chalk from 'chalk';
import prompts from 'prompts';
import { logger } from '../../utils/logger';

export async function getGitStatus(
  cwd: string = process.cwd(),
  options: { includeUntracked?: boolean } = { includeUntracked: true },
) {
  const args = ['-c', 'core.quotepath=false', 'status', '--porcelain'];
  if (options.includeUntracked === false) {
    args.push('--untracked-files=no');
  }

  const proc = Bun.spawn(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
  const text = await new Response(proc.stdout).text();
  const lines = text.trim().split('\n').filter(Boolean);

  // Filter out Axon internal temporary files that might not be in .gitignore
  const filtered = lines.filter((line) => {
    const filePath = line.slice(3).trim();
    // Ignore axon editor temporary files
    if (filePath.includes('.axon-editor-')) return false;
    return true;
  });

  return filtered.join('\n');
}

export async function getCurrentBranch(cwd: string = process.cwd()) {
  const proc = Bun.spawn(['git', 'branch', '--show-current'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const text = await new Response(proc.stdout).text();
  return text.trim();
}

export async function ensureGitSafety(options?: {
  cwd?: string;
  allowDirty?: boolean;
  includeUntracked?: boolean;
}) {
  const cwd = options?.cwd || process.cwd();

  // 1. Check Git Status
  if (!options?.allowDirty) {
    // Default to NOT including untracked files for safety checks to be less intrusive
    const includeUntracked = options?.includeUntracked ?? false;
    const status = await getGitStatus(cwd, { includeUntracked });
    if (status) {
      logger.warn('⚠️  工作目录不干净 (包含未提交的更改)');
      console.log(chalk.dim(status));

      const answer = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: '工作目录有未提交的更改，继续可能导致数据丢失。是否继续？',
        initial: false,
      });

      if (!answer.proceed) {
        throw new Error('操作已取消 (工作目录不干净)');
      }
    }
  }

  // 2. Check Branch Protection
  const branch = await getCurrentBranch(cwd);
  if (branch === 'main' || branch === 'master') {
    logger.warn(`⚠️  当前在保护分支: ${branch}`);

    const answer = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: '确定要在主分支执行操作吗？',
      initial: false,
    });

    if (!answer.proceed) {
      throw new Error('操作已取消 (保护分支)');
    }
  }
}

export async function safeCommit(
  message: string,
  options?: {
    dryRun?: boolean;
    interactive?: boolean;
    cwd?: string;
    skipSafetyCheck?: boolean;
  },
) {
  const cwd = options?.cwd || process.cwd();

  // Helper to run git command
  const git = async (args: string[]) => {
    const proc = Bun.spawn(['git', ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
    const text = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`Git error: ${err}`);
    return text.trim();
  };

  try {
    if (!options?.skipSafetyCheck) {
      // We allow dirty because we are about to commit them!
      // But we still check branch protection.
      // Actually, safeCommit implies we HAVE changes to commit.
      const branch = await getCurrentBranch(cwd);
      if (branch === 'main' || branch === 'master') {
        logger.warn(`⚠️  当前在保护分支: ${branch}`);
        const answer = await prompts({
          type: 'confirm',
          name: 'proceed',
          message: '确定要在主分支直接提交吗？',
          initial: false,
        });
        if (!answer.proceed) {
          logger.info('已取消提交');
          return;
        }
      }
    }

    // 1. Check Git Status (to see what to commit)
    const status = await getGitStatus(cwd);

    if (!status) {
      logger.info('没有需要提交的更改');
      return;
    }

    // 3. Show files to be committed
    logger.info('\n即将提交的文件:');
    const files = status.split('\n');
    // Limit output if too many files
    if (files.length > 10) {
      files.slice(0, 10).forEach((f) => console.log(`  ${f}`));
      console.log(`  ... 以及其他 ${files.length - 10} 个文件`);
    } else {
      files.forEach((f) => console.log(`  ${f}`));
    }
    console.log('');

    // 4. Interactive Confirmation
    if (options?.interactive) {
      const answer = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: `确认提交? (${message})`,
        initial: true,
      });

      if (!answer.proceed) {
        logger.info('已取消提交');
        return;
      }
    }

    // 5. Dry Run
    if (options?.dryRun) {
      logger.info('[DRY RUN] 将执行:');
      console.log('  git add .');
      console.log(`  git commit -m "${message}"`);
      return;
    }

    // 6. Execute Commit
    await git(['add', '.']);
    await git(['commit', '-m', message]);
    logger.success(`✅ 已提交: ${message}`);
  } catch (error) {
    logger.error(`提交失败: ${(error as Error).message}`);

    if ((error as Error).message.includes('pre-commit')) {
      logger.warn('Pre-commit hook 失败，请检查代码质量');
    }
    throw error;
  }
}

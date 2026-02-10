/**
 * ax doctor command - Diagnose environment issues
 */

import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import { ConfigManager, DEFAULT_DIRECTORIES } from '../core/config';
import { AnthropicClient } from '../core/integrations/anthropic';
import { GitOperations } from '../core/integrations/git';
import { OMOConfigReader } from '../core/llm/omo-config-reader';
import { t } from '../utils/i18n';
import { logger } from '../utils/logger';
import { spinner } from '../utils/spinner';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: string;
}

export const doctorCommand = new Command('doctor')
  .description(t('Diagnose environment issues', '诊断环境问题'))
  .option('--check-keys', t('Verify API keys', '验证 API 密钥'))
  .option('--check-tools', t('Check dependencies', '检查依赖工具'))
  .option('--fix', t('Try to auto-fix', '尝试自动修复'))
  .action(async (options) => {
    logger.title('Axon 环境诊断');

    const results: CheckResult[] = [];
    const projectRoot = process.cwd();

    // Check 1: Axon project
    if (ConfigManager.isAxonProject(projectRoot)) {
      results.push({
        name: 'Axon 项目',
        status: 'ok',
        message: '已初始化',
      });

      for (const dir of DEFAULT_DIRECTORIES) {
        const fullPath = join(projectRoot, dir);
        if (!existsSync(fullPath)) {
          results.push({
            name: `目录 ${dir}`,
            status: 'warn',
            message: '不存在',
            fix: `mkdir -p ${fullPath}`,
          });
        }
      }
    } else {
      results.push({
        name: 'Axon 项目',
        status: 'warn',
        message: '当前目录不是 Axon 项目',
        fix: 'ax init',
      });
    }

    // Check 2: Git
    const git = new GitOperations(projectRoot);
    if (git.isGitRepo()) {
      results.push({
        name: 'Git 仓库',
        status: 'ok',
        message: '已初始化',
      });
    } else {
      results.push({
        name: 'Git 仓库',
        status: 'warn',
        message: '未初始化',
        fix: 'git init',
      });
    }

    // Check 3: API Keys
    const omoReader = new OMOConfigReader();
    const providers = ['anthropic', 'openai', 'google'];

    for (const name of providers) {
      const envVar = `${name.toUpperCase()}_API_KEY`;
      let apiKey = process.env[envVar];
      let source = 'environment';

      // Check OMO if env not set
      if (!apiKey) {
        // Try direct provider name match
        let provider = omoReader.getProvider(name);
        // Also try finding by provider type (e.g. agent 'sisyphus' has type 'antigravity')
        if (!provider) {
          provider = omoReader.getAllProviders().find((p) => p.type === name) || null;
        }
        if (provider) {
          apiKey = omoReader.getProviderApiKey(provider);
          source = `OMO config (${omoReader.getConfigSource()})`;
        }
      }

      // Last resort: Antigravity token works as universal proxy auth
      if (!apiKey && omoReader.hasAntigravityAuth()) {
        apiKey = omoReader.getAntigravityToken();
        source = 'Antigravity token (~/.config/opencode/antigravity-accounts.json)';
      }

      if (apiKey) {
        if (options.checkKeys) {
          spinner.start(`验证 ${name} API 密钥 (${source})...`);
          try {
            const client = new AnthropicClient(apiKey, {
              model: name === 'anthropic' ? 'claude-sonnet-4-20250514' : 'unknown',
              provider: name as any,
            });
            const valid = await client.validateKey();
            spinner.stop();

            if (valid) {
              results.push({
                name: `${name} API`,
                status: 'ok',
                message: `密钥有效 (来自 ${source})`,
              });
            } else {
              results.push({
                name: `${name} API`,
                status: 'error',
                message: `密钥无效或已过期 (来自 ${source})`,
                fix: `ax config keys ${name} YOUR_KEY`,
              });
            }
          } catch (error) {
            spinner.stop();
            results.push({
              name: `${name} API`,
              status: 'error',
              message: `验证失败 (${source}): ${(error as Error).message}`,
            });
          }
        } else {
          const masked = apiKey.length > 10 ? `${apiKey.slice(0, 10)}...` : '***';
          results.push({
            name: `${name} API`,
            status: 'ok',
            message: `已设置 (${masked}) [来自 ${source}]`,
          });
        }
      } else {
        results.push({
          name: `${name} API`,
          status: name === 'anthropic' ? 'error' : 'warn',
          message: `${envVar} 未设置`,
          fix: `ax config keys ${name} YOUR_KEY`,
        });
      }
    }


    // Check 4: Bun version
    try {
      const bunVersion = Bun.version;
      const [major, minor] = bunVersion.split('.').map(Number);
      if (major >= 1 && minor >= 1) {
        results.push({
          name: 'Bun 版本',
          status: 'ok',
          message: `v${bunVersion}`,
        });
      } else {
        results.push({
          name: 'Bun 版本',
          status: 'warn',
          message: `v${bunVersion} (建议 >= 1.1.0)`,
          fix: 'bun upgrade',
        });
      }
    } catch {
      results.push({
        name: 'Bun',
        status: 'error',
        message: '无法检测版本',
      });
    }

    // Display results
    logger.blank();
    let hasErrors = false;
    let hasWarnings = false;

    for (const result of results) {
      let icon: string;
      let color: (text: string) => string;

      switch (result.status) {
        case 'ok':
          icon = '✅';
          color = chalk.green;
          break;
        case 'warn':
          icon = '⚠️';
          color = chalk.yellow;
          hasWarnings = true;
          break;
        case 'error':
          icon = '❌';
          color = chalk.red;
          hasErrors = true;
          break;
      }

      console.log(`${icon} ${chalk.bold(result.name)}: ${color(result.message)}`);

      if (result.fix && (result.status === 'error' || result.status === 'warn')) {
        console.log(`   ${chalk.dim('修复:')} ${chalk.cyan(result.fix)}`);
      }
    }

    logger.blank();
    logger.divider();

    if (hasErrors) {
      console.log(chalk.red('存在错误，请修复后重试'));
    } else if (hasWarnings) {
      console.log(chalk.yellow('存在警告，但可以正常使用'));
    } else {
      console.log(chalk.green('环境检查通过！'));
    }

    // Auto fix
    if (options.fix && (hasErrors || hasWarnings)) {
      logger.blank();
      logger.info('尝试自动修复...');

      for (const result of results) {
        if (result.fix && result.status !== 'ok') {
          if (result.fix.startsWith('mkdir')) {
            const path = result.fix.replace('mkdir -p ', '');
            if (!existsSync(path)) {
              await Bun.$`mkdir -p ${path}`.quiet();
              logger.success(`创建目录: ${path}`);
            }
          }
          // Other fixes would require user interaction
        }
      }
    }

    logger.blank();
  });

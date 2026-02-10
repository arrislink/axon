/**
 * ax config command - Manage configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { logger } from '../utils/logger';
import ora from 'ora';
import { OMOConfigReader } from '../core/llm/omo-config-reader';
import { AxonLLMClient } from '../core/llm';

export const configCommand = new Command('config')
    .description('管理 LLM Provider 配置');

// ax config list
configCommand
    .command('list')
    .alias('ls')
    .description('列出所有可用的 Provider')
    .option('--json', '以 JSON 格式输出')
    .action(async (options) => {
        const omo = new OMOConfigReader();
        const providers = omo.getAllProviders();

        if (options.json) {
            console.log(JSON.stringify(providers, null, 2));
            return;
        }

        if (providers.length === 0) {
            logger.warn('⚠️  未检测到 OMO Provider 配置');
            console.log(chalk.dim(`(检查路径: ~/.omo/providers.yaml 或 ~/.config/opencode/oh-my-opencode.json)`));
            console.log('\n快速开始:');
            console.log(chalk.cyan('  1. bunx oh-my-opencode install'));
            console.log(chalk.cyan('  2. omo config set-provider antigravity'));
            console.log(chalk.cyan('  3. ax config test\n'));
            return;
        }

        const source = omo.getConfigSource();
        console.log(chalk.dim(`配置文件: ${source}\n`));

        const table = new Table({
            head: ['', 'Provider', 'Type', 'Models'],
            colWidths: [3, 20, 15, 40],
            style: { head: ['cyan'] }
        });

        for (const provider of providers) {
            const isPrimary = omo.isPrimary(provider.name);
            const mark = isPrimary ? chalk.green('✓') : '';

            table.push([
                mark,
                chalk.bold(provider.name),
                provider.type || '-',
                (provider.models || []).slice(0, 2).join(', ') + (provider.models.length > 2 ? '...' : ''),
            ]);
        }

        console.log(table.toString());

        const primary = omo.getPrimaryProvider();
        if (primary) {
            console.log(chalk.green(`\n当前默认: ${chalk.bold(primary.name)}`));
        }
    });

// ax config show
configCommand
    .command('show')
    .description('显示当前 Axon 运行模式')
    .action(() => {
        const client = new AxonLLMClient();
        const mode = client.getMode();
        const desc = client.getModeDescription();
        const omo = new OMOConfigReader();

        console.log(chalk.bold('\n🔧 Axon LLM 配置状态\n'));

        const table = new Table({
            colWidths: [20, 50]
        });

        table.push(
            ['运行模式', mode === 'cli' ? chalk.green(mode) : (mode === 'direct' ? chalk.blue(mode) : chalk.yellow(mode))],
            ['描述', desc],
            ['配置来源', omo.getConfigSource() || '无'],
            ['Providers 数量', omo.getAllProviders().length.toString()]
        );

        console.log(table.toString());

        if (mode === 'fallback') {
            console.log(chalk.yellow('\n⚠️  正在使用 Fallback 模式 (仅限环境变量)'));
            console.log('建议安装 OMO 以获得最佳体验:');
            console.log(chalk.cyan('  bunx oh-my-opencode install'));
        }
    });

// ax config test
configCommand
    .command('test')
    .description('测试 Provider 连接')
    .option('-p, --provider <name>', '指定 Provider 测试')
    .option('-m, --model <model>', '指定测试使用的模型')
    .action(async (options) => {
        const spinner = ora('正在初始化 LLM 客户端...').start();
        try {
            const omo = new OMOConfigReader();
            let providerName = options.provider;
            let primary = omo.getPrimaryProvider();

            if (!providerName) {
                if (!primary) {
                    spinner.fail('未找到可用的 Provider。请先配置。');
                    return;
                }
                providerName = primary.name;
            } else {
                primary = omo.getProvider(providerName);
                if (!primary) {
                    spinner.fail(`Provider '${providerName}' 未找到。`);
                    return;
                }
            }

            const model = options.model || primary?.models?.[0];
            spinner.text = `测试连接: ${chalk.cyan(providerName)}${model ? ` (模型: ${chalk.cyan(model)})` : ''}...`;

            const client = new AxonLLMClient();
            const start = Date.now();

            const response = await client.chat([
                { role: 'user', content: 'Say "OK" if you can hear me.' }
            ], {
                model: model,
                temperature: 0.7
            });

            const duration = Date.now() - start;
            spinner.succeed(`连接成功! (${duration}ms)`);

            console.log(chalk.dim('----------------------------------------'));
            console.log(`模型: ${chalk.cyan(response.model)}`);
            console.log(`响应: ${response.content.trim()}`);
            console.log(`Token: ${response.tokens.input} in / ${response.tokens.output} out`);
            if (response.cost > 0) {
                console.log(`成本: $${response.cost.toFixed(6)}`);
            }
            console.log(chalk.dim('----------------------------------------'));

        } catch (error) {
            spinner.fail(`连接失败: ${(error as Error).message}`);
            if (process.env['DEBUG']) {
                console.error(error);
            }
        }
    });

// ax config failover
configCommand
    .command('failover')
    .description('显示 Failover 链')
    .action(() => {
        const omo = new OMOConfigReader();
        const chain = omo.getFailoverChain();

        console.log(chalk.bold('\n🔄 Failover 策略链\n'));

        if (chain.length === 0 || (chain.length === 1 && chain[0].includes('Auto'))) {
            console.log(chalk.yellow('ℹ️  未配置显式 Failover 链，使用自动检测。'));
        } else {
            chain.forEach((name, index) => {
                const arrow = index < chain.length - 1 ? ' ↓ ' : '';
                console.log(`  ${index + 1}. ${chalk.bold(name)}`);
                if (arrow) console.log(chalk.dim(`      ${arrow}`));
            });
        }
    });

// ax config setup
configCommand
    .command('setup')
    .description('配置向导')
    .action(async () => {
        console.log(chalk.bold('\n🚀 Axon 环境配置向导\n'));

        // 1. Check OMO
        const hasOMO = await Bun.$`which omo`.quiet().then(() => true).catch(() => false);
        const hasBunxOMO = await Bun.$`bunx oh-my-opencode --version`.quiet().then(() => true).catch(() => false);

        if (hasOMO || hasBunxOMO) {
            logger.success('✅ OhMyOpenCode (OMO) 已安装');
        } else {
            console.log(chalk.yellow('⚠️  未检测到 OMO'));
            console.log('建议安装 OMO 以获得完整功能:');
            console.log(chalk.cyan('  bun install -g oh-my-opencode'));
        }

        // 2. Check Config
        const omoReader = new OMOConfigReader();
        if (omoReader.hasProviders()) {
            logger.success(`✅ 已加载配置文件 (${omoReader.getAllProviders().length} providers)`);
            console.log(chalk.dim(`   ${omoReader.getConfigSource()}`));
        } else {
            console.log(chalk.yellow('⚠️  未检测到有效配置'));
            console.log('建议运行:');
            console.log(chalk.cyan('  bunx oh-my-opencode install'));
        }

        console.log('\n下一步:');
        console.log(`  运行 ${chalk.cyan('ax config list')} 查看详情`);
        console.log(`  运行 ${chalk.cyan('ax config test')} 测试连接`);
    });

// ax config keys (Legacy support)
configCommand
    .command('keys')
    .description('快速设置 API 密钥 (通过 OMO)')
    .argument('<provider>', '提供商 (anthropic, openai, etc)')
    .argument('[key]', 'API Key')
    .action(async (provider, key) => {
        const cmd = 'bunx oh-my-opencode'; // Default to reliable bunx
        logger.info(`正在调用 ${cmd} 设置密钥...`);

        try {
            const proc = Bun.spawn(['bunx', 'oh-my-opencode', 'config', 'set-key', provider, key || ''], {
                stdout: 'inherit',
                stderr: 'inherit'
            });
            await proc.exited;
        } catch (e) {
            logger.error(`设置失败: ${(e as Error).message}`);
        }
    });

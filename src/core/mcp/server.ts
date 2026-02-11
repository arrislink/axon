import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { BeadStatus, BeadsGraph } from '../../types';
import { ensurePathInProject } from '../../utils/paths';
import { BeadsExecutor } from '../beads/executor';
import { getGraphStats } from '../beads/graph';
import { ConfigManager } from '../config/manager';
import { FlowRunner } from '../flow';
import type { FlowStage, SkillsEnsureMode } from '../flow';
import { SkillsLibrary } from '../skills/library';

export type McpLLMMode = 'auto' | 'off';

export interface AxonMcpServerOptions {
  projectRoot: string;
  llm: McpLLMMode;
}

function tool(name: string, description: string, inputSchema: Tool['inputSchema']): Tool {
  return { name, description, inputSchema };
}

export async function startAxonMcpServer(options: AxonMcpServerOptions): Promise<void> {
  const server = new Server(
    {
      name: 'axon-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Print startup message to stderr to avoid interfering with stdout/stdin communication
  process.stderr.write(
    `[Axon] MCP Server started (LLM: ${options.llm}, Project: ${options.projectRoot})\n`,
  );
  if (options.llm === 'off') {
    process.stderr.write(
      '[Axon] Mode: Passive Tooling. AI logic is hosted by IDE, consuming IDE quotas.\n',
    );
  } else {
    process.stderr.write(
      '[Axon] Mode: Autonomous. Complex tasks will call LLM via Axon/OMO config.\n',
    );
  }
  process.stderr.write('[Axon] Listening for JSON-RPC messages on stdio...\n');

  const projectRoot = options.projectRoot;
  const configManager = new ConfigManager(projectRoot);
  const config = configManager.get();

  const specPath = configManager.getSpecPath();
  const graphPath = configManager.getGraphPath();

  const commonTools: Tool[] = [
    tool('axon.project_info', 'Get basic project information', {
      type: 'object',
      properties: {},
      required: [],
    }),
    tool('axon.spec_show', 'Read .openspec/spec.md', {
      type: 'object',
      properties: {},
      required: [],
    }),
    tool('axon.spec_write', 'Write .openspec/spec.md', {
      type: 'object',
      properties: { content: { type: 'string' } },
      required: ['content'],
    }),
    tool('axon.plan_show', 'Read .beads/graph.json', {
      type: 'object',
      properties: {},
      required: [],
    }),
    tool('axon.plan_write', 'Write .beads/graph.json', {
      type: 'object',
      properties: { graphJson: { type: 'string' } },
      required: ['graphJson'],
    }),
    tool('axon.status', 'Get beads progress summary', {
      type: 'object',
      properties: {},
      required: [],
    }),
    tool('axon.bead_set_status', 'Update a bead status in graph.json', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'paused'] },
        error: { type: 'string' },
      },
      required: ['id', 'status'],
    }),
    tool('axon.skills_search', 'Search skills by query', {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 5 },
      },
      required: ['query'],
    }),
    tool('axon.skills_add', 'Install official skills package via npx skills add', {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Official package name or URL' },
        symlink: { type: 'boolean', default: false },
        all: { type: 'boolean', default: false },
        yes: { type: 'boolean', default: true },
      },
      required: ['name'],
    }),
    tool('axon.skills_update', 'Update installed skills via npx skills update', {
      type: 'object',
      properties: {
        yes: { type: 'boolean', default: true },
      },
      required: [],
    }),
    tool('axon.doc_write', 'Write a markdown doc file in project root', {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path under project root' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    }),
  ];

  const llmTools: Tool[] =
    options.llm === 'auto'
      ? [
          tool('axon.flow_run', 'Run end-to-end flow (uses AxonLLMClient)', {
            type: 'object',
            properties: {
              stages: { type: 'array', items: { type: 'string' } },
              skillsMode: { type: 'string', enum: ['off', 'suggest', 'auto'], default: 'suggest' },
              workMode: { type: 'string', enum: ['next', 'all'], default: 'all' },
              input: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  projectType: { type: 'string' },
                  techStack: { type: 'string' },
                  features: { type: 'array', items: { type: 'string' } },
                  additionalRequirements: { type: 'string' },
                },
              },
            },
            required: [],
          }),
          tool('axon.work_next', 'Execute next executable bead (uses AxonLLMClient)', {
            type: 'object',
            properties: {},
            required: [],
          }),
          tool('axon.work_all', 'Execute all pending beads (uses AxonLLMClient)', {
            type: 'object',
            properties: {},
            required: [],
          }),
        ]
      : [];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...commonTools, ...llmTools],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments || {}) as Record<string, unknown>;

    process.stderr.write(`[Axon] Tool Call: ${name}\n`);
    if (Object.keys(args).length > 0) {
      process.stderr.write(`[Axon] Args: ${JSON.stringify(args)}\n`);
    }

    switch (name) {
      case 'axon.project_info': {
        const info = {
          projectRoot,
          projectName: config.project.name,
          openspecPath: specPath,
          beadsPath: graphPath,
          llmMode: options.llm,
        };
        return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
      }

      case 'axon.spec_show': {
        if (!existsSync(specPath)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Spec file not found. Run axon.spec_init or axon.flow_run first.',
              },
            ],
          };
        }
        const content = readFileSync(specPath, 'utf-8');
        return { content: [{ type: 'text', text: content }] };
      }

      case 'axon.spec_write': {
        const content = String(args.content || '');
        const dir = join(projectRoot, config.tools.openspec.path);
        if (!existsSync(dir)) {
          throw new Error(`OpenSpec directory not found: ${dir}`);
        }
        writeFileSync(specPath, content, 'utf-8');
        return { content: [{ type: 'text', text: 'OK' }] };
      }

      case 'axon.plan_show': {
        if (!existsSync(graphPath)) {
          return {
            content: [
              {
                type: 'text',
                text: 'Plan file (graph.json) not found. Run axon.plan_generate or axon.flow_run first.',
              },
            ],
          };
        }
        const content = readFileSync(graphPath, 'utf-8');
        return { content: [{ type: 'text', text: content }] };
      }

      case 'axon.plan_write': {
        const graphJson = String(args.graphJson || '');
        try {
          JSON.parse(graphJson);
        } catch (e) {
          throw new Error(`Invalid JSON for plan: ${(e as Error).message}`);
        }
        const dir = join(projectRoot, config.tools.beads.path);
        if (!existsSync(dir)) {
          throw new Error(`Beads directory not found: ${dir}`);
        }
        writeFileSync(graphPath, graphJson, 'utf-8');
        return { content: [{ type: 'text', text: 'OK' }] };
      }

      case 'axon.status': {
        if (!existsSync(graphPath)) {
          return { content: [{ type: 'text', text: 'Plan file (graph.json) not found.' }] };
        }
        try {
          const graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
          const stats = getGraphStats(graph);
          return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
        } catch (e) {
          throw new Error(`Failed to parse graph.json: ${(e as Error).message}`);
        }
      }

      case 'axon.bead_set_status': {
        const beadId = String(args.id || '');
        const status = String(args.status || '') as BeadStatus;
        const error = args.error ? String(args.error) : undefined;

        if (!existsSync(graphPath)) {
          throw new Error('Plan file (graph.json) not found.');
        }

        let graph: BeadsGraph;
        try {
          graph = JSON.parse(readFileSync(graphPath, 'utf-8'));
        } catch (e) {
          throw new Error(`Failed to parse graph.json: ${(e as Error).message}`);
        }

        const bead = graph.beads?.find((b: { id: string }) => b.id === beadId);
        if (!bead) throw new Error(`Bead not found: ${beadId}`);
        bead.status = status;
        if (error) bead.error = error;
        writeFileSync(graphPath, JSON.stringify(graph, null, 2), 'utf-8');
        return { content: [{ type: 'text', text: 'OK' }] };
      }

      case 'axon.skills_search': {
        const query = String(args.query || '');
        const limit = typeof args.limit === 'number' ? args.limit : 5;
        const library = new SkillsLibrary(configManager.getAllSkillsPaths());
        const results = await library.search(query, limit);
        const view = results.map((r) => ({
          name: r.skill.metadata.name,
          description: r.skill.metadata.description,
          tags: r.skill.metadata.tags,
          path: r.skill.path,
          score: r.score,
          matchedOn: r.matchedOn,
        }));
        return { content: [{ type: 'text', text: JSON.stringify(view, null, 2) }] };
      }

      case 'axon.skills_add': {
        const nameArg = String(args.name || '');
        const symlink = Boolean(args.symlink);
        const all = Boolean(args.all);
        const yes = args.yes === undefined ? true : Boolean(args.yes);
        if (!nameArg) throw new Error('name is required');

        const cmdArgs = ['skills', 'add', nameArg];
        if (symlink) cmdArgs.push('--symlink');
        if (all) cmdArgs.push('--all');
        if (yes) cmdArgs.push('--yes');

        const result = spawnSync('npx', cmdArgs, { cwd: projectRoot, encoding: 'utf-8' });
        if (result.status !== 0) {
          throw new Error((result.stderr || result.stdout || 'npx skills add failed').trim());
        }
        return { content: [{ type: 'text', text: (result.stdout || 'OK').trim() }] };
      }

      case 'axon.skills_update': {
        const yes = args.yes === undefined ? true : Boolean(args.yes);
        const cmdArgs = ['skills', 'update'];
        if (yes) cmdArgs.push('--yes');
        const result = spawnSync('npx', cmdArgs, { cwd: projectRoot, encoding: 'utf-8' });
        if (result.status !== 0) {
          throw new Error((result.stderr || result.stdout || 'npx skills update failed').trim());
        }
        return { content: [{ type: 'text', text: (result.stdout || 'OK').trim() }] };
      }

      case 'axon.doc_write': {
        const relPath = String(args.path || '');
        const content = String(args.content || '');
        if (!relPath) throw new Error('path is required');
        const absPath = ensurePathInProject(projectRoot, relPath);
        const dir = dirname(absPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(absPath, content, 'utf-8');
        return { content: [{ type: 'text', text: 'OK' }] };
      }

      case 'axon.flow_run': {
        if (options.llm !== 'auto') throw new Error('LLM is disabled for this server');
        const runner = new FlowRunner(projectRoot, config);

        const stages = Array.isArray(args.stages)
          ? (args.stages.map(String) as FlowStage[])
          : undefined;
        const skillsMode = (
          args.skillsMode ? String(args.skillsMode) : 'suggest'
        ) as SkillsEnsureMode;
        const workMode = args.workMode ? String(args.workMode) : 'all';
        const input =
          typeof args.input === 'object' && args.input
            ? (args.input as Record<string, unknown>)
            : {};

        const result = await runner.run({
          stages,
          skillsMode,
          work: { mode: workMode === 'next' ? 'next' : 'all' },
          input: {
            description: input.description ? String(input.description) : undefined,
            projectType: input.projectType ? String(input.projectType) : undefined,
            techStack: input.techStack ? String(input.techStack) : undefined,
            features: Array.isArray(input.features) ? input.features.map(String) : undefined,
            additionalRequirements: input.additionalRequirements
              ? String(input.additionalRequirements)
              : undefined,
          },
        });

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'axon.work_next': {
        if (options.llm !== 'auto') throw new Error('LLM is disabled for this server');
        const executor = new BeadsExecutor(config, projectRoot);
        const result = await executor.executeNext();
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }

      case 'axon.work_all': {
        if (options.llm !== 'auto') throw new Error('LLM is disabled for this server');
        const executor = new BeadsExecutor(config, projectRoot);
        const results = await executor.executeAll();
        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

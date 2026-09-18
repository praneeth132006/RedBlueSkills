#!/usr/bin/env node
/**
 * redblueskills-mcp — a Model Context Protocol server over the skill library.
 *
 * Lets any MCP-capable agent (Claude Desktop/Code, etc.) discover and load
 * skills directly, without the `init` copy step. Speaks MCP over stdio using
 * JSON-RPC 2.0. Zero runtime dependencies (Node stdlib only) — the same
 * discipline as the CLI.
 *
 * Tools exposed:
 *   list_skills   — list/filter skills (team, stage, app_type, text)
 *   get_skill     — return a skill's full SKILL.md body + metadata
 *   search_skills — free-text search across name + description
 *   get_catalog   — the machine-readable catalog (counts, coverage, all skills)
 *   coverage      — the surface × kill-chain coverage summary
 *
 * Register (Claude Code):  claude mcp add redblueskills -- npx --package redblueskills redblueskills-mcp
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const CATALOG = path.join(PKG_ROOT, 'catalog.json');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'redblueskills', version: readVersion() };

function readVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
}

// Resolve a skill's SKILL.md, refusing any path that escapes the skills tree.
// Defense in depth: catalog paths are trusted, but a tampered catalog must not
// let this server read arbitrary files.
function skillBodyPath(row) {
  const abs = fs.realpathSync(path.resolve(PKG_ROOT, row.path));
  const root = fs.realpathSync(SKILLS_DIR) + path.sep;
  if (abs !== SKILLS_DIR && !abs.startsWith(root)) return null;
  return abs;
}

// --- tool implementations ---------------------------------------------------

const TOOLS = {
  list_skills: {
    description:
      'List skills, optionally filtered by team (red/blue/purple), stage, app_type, or free text.',
    inputSchema: {
      type: 'object',
      properties: {
        team: { type: 'string', enum: ['red', 'blue', 'purple'] },
        stage: { type: 'string' },
        app_type: { type: 'string' },
        query: { type: 'string', description: 'free-text match on name/description' },
      },
    },
    run(args) {
      const cat = loadCatalog();
      let rows = cat.skills;
      if (args.team) rows = rows.filter((s) => s.team === args.team);
      if (args.stage) rows = rows.filter((s) => s.stage === args.stage);
      if (args.app_type) rows = rows.filter((s) => s.app_type === args.app_type);
      if (args.query) {
        const q = String(args.query).toLowerCase();
        rows = rows.filter(
          (s) => s.name.includes(q) || (s.description || '').toLowerCase().includes(q)
        );
      }
      return rows.map((s) => ({
        name: s.name,
        team: s.team,
        app_type: s.app_type,
        stage: s.stage,
        risk: s.risk,
        maturity: s.maturity,
        pairs_with: s.pairs_with,
        description: s.description,
      }));
    },
  },

  get_skill: {
    description: 'Return a skill\'s full SKILL.md body and its metadata, by name.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
    run(args) {
      const cat = loadCatalog();
      const row = cat.skills.find((s) => s.name === args.name);
      if (!row) throw new Error(`unknown skill: ${args.name}`);
      const bodyPath = skillBodyPath(row);
      if (!bodyPath || !fs.existsSync(bodyPath)) throw new Error(`skill file not found: ${args.name}`);
      return { metadata: row, body: fs.readFileSync(bodyPath, 'utf8') };
    },
  },

  search_skills: {
    description: 'Free-text search across skill names and descriptions.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    run(args) {
      const cat = loadCatalog();
      const q = String(args.query || '').toLowerCase();
      return cat.skills
        .filter((s) => s.name.includes(q) || (s.description || '').toLowerCase().includes(q))
        .map((s) => ({ name: s.name, team: s.team, stage: s.stage, description: s.description }));
    },
  },

  get_catalog: {
    description: 'The full machine-readable catalog (counts, coverage, every skill).',
    inputSchema: { type: 'object', properties: {} },
    run() {
      return loadCatalog();
    },
  },

  coverage: {
    description: 'Surface × kill-chain coverage summary (counts and validated totals).',
    inputSchema: { type: 'object', properties: {} },
    run() {
      return loadCatalog().coverage;
    },
  },
};

// --- JSON-RPC / MCP plumbing ------------------------------------------------

function toolList() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

function handle(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg) || msg.jsonrpc !== '2.0' ||
      typeof msg.method !== 'string' || (Object.hasOwnProperty.call(msg, 'id') &&
      !(typeof msg.id === 'string' || (typeof msg.id === 'number' && Number.isInteger(msg.id))))) {
    return error(null, -32600, 'invalid request');
  }
  const { id, method, params } = msg;
  // All notifications, including known methods, have no response.
  if (id === undefined) return null;
  if (params !== undefined && (!params || typeof params !== 'object' || Array.isArray(params))) {
    return error(id, -32602, 'params must be an object');
  }
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case 'tools/list':
      return reply(id, { tools: toolList() });
    case 'tools/call': {
      const name = params && params.name;
      const tool = typeof name === 'string' && Object.prototype.hasOwnProperty.call(TOOLS, name) ? TOOLS[name] : null;
      if (!tool) return error(id, -32602, `unknown tool: ${params && params.name}`);
      try {
        const args = params.arguments === undefined ? {} : params.arguments;
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
          return error(id, -32602, 'arguments must be an object');
        }
        for (const required of tool.inputSchema.required || []) {
          if (!Object.prototype.hasOwnProperty.call(args, required)) return error(id, -32602, `missing argument: ${required}`);
        }
        for (const [key, value] of Object.entries(args)) {
          const prop = tool.inputSchema.properties[key];
          if (!prop || typeof value !== prop.type || (prop.enum && !prop.enum.includes(value))) {
            return error(id, -32602, `invalid argument: ${key}`);
          }
        }
        const result = tool.run(args);
        return reply(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } catch (e) {
        return reply(id, {
          content: [{ type: 'text', text: `error: ${e.message}` }],
          isError: true,
        });
      }
    }
    case 'ping':
      return reply(id, {});
    default:
      // Notifications (no id) need no response.
      if (id === undefined || id === null) return null;
      return error(id, -32601, `method not found: ${method}`);
  }
}

function reply(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function error(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
function send(obj) {
  if (obj) process.stdout.write(JSON.stringify(obj) + '\n');
}

function main() {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        send(error(null, -32700, 'parse error'));
        continue;
      }
      send(handle(msg));
    }
  });
  // Let Node drain stdout naturally; process.exit() can truncate large catalogs.
  process.stdin.on('end', () => {
    if (buf.trim()) send(error(null, -32700, 'unterminated JSON-RPC line'));
  });
}

main();

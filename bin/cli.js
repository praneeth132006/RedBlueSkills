#!/usr/bin/env node
/**
 * redblueskills — install validated red/blue security skills into any coding LLM.
 *
 * Zero runtime dependencies (Node stdlib only). The published npm package bundles
 * the skills, orchestrators, and catalog, so `npx redblueskills init` gives an
 * agent the whole library without cloning the repo.
 *
 *   npx redblueskills init            install all skills + orchestrator locally
 *   npx redblueskills add <name...>   install specific skills (by name)
 *   npx redblueskills list [filter]   list skills (optional team/stage/text filter)
 *   npx redblueskills attack [target] print the attack-my-application playbook
 *   npx redblueskills path            print the default install directory
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');
const ORCH_DIR = path.join(PKG_ROOT, 'orchestrators');
const CATALOG = path.join(PKG_ROOT, 'catalog.json');
const DEST_SUBDIR = path.join('.claude', 'skills', 'redblueskills');

// --- tiny ANSI helpers (no deps) --------------------------------------------
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => c('38;5;203', s);
const blue = (s) => c('38;5;75', s);
const purple = (s) => c('38;5;177', s);
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);
const teamColor = (t) => (t === 'red' ? red : t === 'blue' ? blue : purple);

function loadCatalog() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  } catch (e) {
    fail(`could not read bundled catalog.json (${e.message})`);
  }
}

function fail(msg) {
  console.error(red('✗ ') + msg);
  process.exit(1);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// resolve a skill name -> absolute source directory (containing SKILL.md)
function skillDir(name, catalog) {
  const row = catalog.skills.find((s) => s.name === name);
  if (!row) return null;
  return path.join(PKG_ROOT, path.dirname(row.path));
}

// --- commands ---------------------------------------------------------------

function cmdList(args) {
  const catalog = loadCatalog();
  const filter = (args[0] || '').toLowerCase();
  let rows = catalog.skills;
  const TEAMS = new Set(['red', 'blue', 'purple']);
  const stages = new Set(catalog.skills.map((s) => s.stage));
  if (filter) {
    if (TEAMS.has(filter)) rows = rows.filter((s) => s.team === filter);
    else if (stages.has(filter)) rows = rows.filter((s) => s.stage === filter);
    else
      rows = rows.filter(
        (s) => s.name.includes(filter) || (s.description || '').toLowerCase().includes(filter)
      );
  }
  rows.sort((a, b) => (a.team + a.stage + a.name).localeCompare(b.team + b.stage + b.name));
  console.log('');
  console.log(bold(`  RedBlueSkills`) + dim(`  ·  ${rows.length}/${catalog.count} skills`));
  console.log('');
  for (const s of rows) {
    const tag = teamColor(s.team)('●') + ' ' + teamColor(s.team)(s.team.padEnd(6));
    console.log(`  ${tag} ${bold(s.name.padEnd(30))} ${dim(s.stage.padEnd(20))} ${dim('risk:' + s.risk)}`);
    console.log(`         ${dim('↔ ' + (s.pairs_with.join(', ') || 'unpaired'))}`);
  }
  console.log('');
  console.log(dim(`  install all:  npx redblueskills init`));
  console.log('');
}

function cmdInit(args) {
  const catalog = loadCatalog();
  const dest = path.resolve(process.cwd(), argValue(args, '--dest') || DEST_SUBDIR);
  console.log('');
  console.log(bold('  Installing RedBlueSkills → ') + dim(dest));

  // all skills
  copyDir(SKILLS_DIR, path.join(dest, 'skills'));
  // orchestrator(s)
  if (fs.existsSync(ORCH_DIR)) copyDir(ORCH_DIR, path.join(dest, 'orchestrators'));
  // catalog for the agent to reason over
  fs.copyFileSync(CATALOG, path.join(dest, 'catalog.json'));
  writeAgentReadme(dest, catalog);

  console.log(
    '  ' +
      red('●') +
      blue('●') +
      ` ${catalog.count} skills + attack-my-application orchestrator installed.`
  );
  console.log('');
  console.log('  Point your agent at ' + bold(path.join(dest, 'orchestrators/attack-my-application/SKILL.md')));
  console.log('  or just say: ' + bold('"attack my application"') + '.');
  console.log('');
}

function cmdAdd(args) {
  const names = positionals(args);
  if (names.length === 0) fail('usage: redblueskills add <skill-name> [more...]  (or use `init` for all)');
  const catalog = loadCatalog();
  const dest = path.resolve(process.cwd(), argValue(args, '--dest') || DEST_SUBDIR);
  let n = 0;
  for (const name of names) {
    const src = skillDir(name, catalog);
    if (!src) {
      console.error(red('✗ ') + `unknown skill: ${name}`);
      continue;
    }
    const row = catalog.skills.find((s) => s.name === name);
    const rel = path.relative(SKILLS_DIR, src);
    copyDir(src, path.join(dest, 'skills', rel));
    console.log(`  ${teamColor(row.team)('●')} added ${bold(name)}`);
    n++;
    // pull in paired skills too, so offense always ships with its defense
    for (const p of row.pairs_with || []) {
      const psrc = skillDir(p, catalog);
      if (psrc) {
        copyDir(psrc, path.join(dest, 'skills', path.relative(SKILLS_DIR, psrc)));
        console.log(`    ${dim('↳ paired ' + p)}`);
      }
    }
  }
  if (n === 0) {
    fail('no known skills matched. Try `redblueskills list` to see available names.');
  }
  fs.copyFileSync(CATALOG, path.join(dest, 'catalog.json'));
  console.log(dim(`\n  ${n} skill(s) → ${dest}\n`));
}

function cmdAttack(args) {
  const target = positionals(args)[0] || '<target-url>';
  const playbook = path.join(ORCH_DIR, 'attack-my-application', 'SKILL.md');
  if (args.includes('--print') || args.includes('-p')) {
    process.stdout.write(fs.readFileSync(playbook, 'utf8'));
    return;
  }
  console.log('');
  console.log(bold('  attack-my-application') + dim('  ·  authorized testing only'));
  console.log('');
  console.log('  Give your coding agent this instruction:');
  console.log('');
  console.log(dim('  ─────────────────────────────────────────────────────────'));
  console.log('    Load the RedBlueSkills orchestrator at');
  console.log('    ' + bold('orchestrators/attack-my-application/SKILL.md'));
  console.log('    and run a full assessment of ' + bold(target));
  console.log(dim('  ─────────────────────────────────────────────────────────'));
  console.log('');
  console.log('  The agent will: confirm authorization → fingerprint → select skills');
  console.log('  → run them in kill-chain order → verify detection → report.');
  console.log('');
  console.log(dim('  Full playbook:  npx redblueskills attack --print'));
  console.log('');
}

function cmdBanner() {
  console.log(
    '\n  ' +
      red('■') +
      blue('■') +
      ' ' +
      bold('RedBlueSkills') +
      dim('  paired offense + defense for AI agents')
  );
  console.log(dim('     try:  npx redblueskills list   ·   npx redblueskills init\n'));
}

function cmdPath() {
  console.log(path.resolve(process.cwd(), DEST_SUBDIR));
}

// --- helpers ----------------------------------------------------------------

const VALUE_FLAGS = ['--dest']; // flags that consume the next token as their value

function argValue(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

// positional args: drop flags and the values that value-flags consume
function positionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--') || a.startsWith('-')) {
      if (VALUE_FLAGS.includes(a)) i++; // skip its value too
      continue;
    }
    out.push(a);
  }
  return out;
}

function writeAgentReadme(dest, catalog) {
  const lines = [
    '# RedBlueSkills (installed)',
    '',
    `${catalog.count} validated, paired red/blue security skills for authorized testing.`,
    '',
    '## How an agent uses this',
    '',
    '1. To run a full assessment, load `orchestrators/attack-my-application/SKILL.md`',
    '   and follow it. It confirms authorization, fingerprints the target, selects',
    '   the applicable skills below, runs them in kill-chain order, and reports.',
    '2. To use one technique, load the relevant `skills/**/SKILL.md`. Its frontmatter',
    '   `description` says when to use it; the body is the procedure.',
    '3. `catalog.json` is the machine-readable index (team, stage, risk, pairings).',
    '',
    '## Skills',
    '',
    ...catalog.skills
      .slice()
      .sort((a, b) => (a.team + a.stage).localeCompare(b.team + b.stage))
      .map((s) => `- \`${s.name}\` (${s.team}/${s.stage}, risk:${s.risk}) — pairs with ${s.pairs_with.join(', ') || '—'}`),
    '',
    '> Authorized use only. See ETHICS.md. You are responsible for staying in scope.',
    '',
  ];
  fs.writeFileSync(path.join(dest, 'README.md'), lines.join('\n'));
}

function usage() {
  console.log(`
  ${bold('redblueskills')} ${dim('— red/blue security skills for coding agents')}

  ${bold('Commands')}
    init [--dest DIR]         install ALL skills + orchestrator (default ./.claude/skills)
    add <name...> [--dest DIR] install specific skills (paired skill comes along)
    list [filter]            list skills (filter by team/stage/text)
    attack [target] [--print] print the "attack my application" playbook
    path                     print the default install directory

  ${bold('Examples')}
    npx redblueskills init
    npx redblueskills add web-sql-injection
    npx redblueskills list red
    npx redblueskills attack https://staging.example.com
`);
}

function main() {
  const [, , cmd, ...args] = process.argv;
  switch (cmd) {
    case 'init': return cmdInit(args);
    case 'add': return cmdAdd(args);
    case 'list': case 'ls': return cmdList(args);
    case 'attack': return cmdAttack(args);
    case 'path': return cmdPath();
    case 'banner': return cmdBanner();
    case 'help': case '--help': case '-h': case undefined: return usage();
    default:
      console.error(red('✗ ') + `unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
}

main();

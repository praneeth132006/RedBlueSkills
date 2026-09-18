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
 *   npx redblueskills attack [target] print the attack-my-application instruction
 *                                     (target = a code path — default: this project — or a running URL)
 *   npx redblueskills quickstart      print the 5-minute getting-started guide
 *   npx redblueskills path            print the default install directory
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PKG_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(PKG_ROOT, 'skills');
const ORCH_DIR = path.join(PKG_ROOT, 'orchestrators');
const CATALOG = path.join(PKG_ROOT, 'catalog.json');
const QUICKSTART = path.join(PKG_ROOT, 'QUICKSTART.md');
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

// True iff normalized child is root or below it. This comparison is lexical;
// callers canonicalize source paths and reject destination symlinks separately.
function isInside(root, child) {
  const r = path.resolve(root);
  const c = path.resolve(child);
  return c === r || c.startsWith(r + path.sep);
}

function rejectSymlink(file) {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) fail(`refusing symbolic link in install path: ${file}`);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function installDestination(args) {
  const dest = path.resolve(process.cwd(), argValue(args, '--dest') || DEST_SUBDIR);
  rejectSymlink(dest);
  // Canonicalize existing parents so aliased paths cannot recurse into sources.
  let parent = dest;
  const missing = [];
  while (!fs.existsSync(parent)) { missing.unshift(path.basename(parent)); parent = path.dirname(parent); }
  const real = path.join(fs.realpathSync(parent), ...missing);
  if (real === fs.realpathSync(PKG_ROOT) || isInside(fs.realpathSync(SKILLS_DIR), real) ||
      isInside(fs.realpathSync(ORCH_DIR), real)) fail('install destination overlaps bundled source');
  function inspect(dir) {
    rejectSymlink(dir);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      for (const entry of fs.readdirSync(dir)) inspect(path.join(dir, entry));
    }
  }
  inspect(dest);
  return dest;
}

function copyDir(src, dest, destRoot) {
  // Never write outside the intended destination root, even if a name is hostile.
  if (destRoot && !isInside(destRoot, dest)) {
    fail(`refusing to write outside the install directory: ${dest}`);
  }
  rejectSymlink(dest);
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) fail(`refusing symbolic link in bundled source: ${s}`);
    rejectSymlink(d);
    if (entry.isDirectory()) copyDir(s, d, destRoot);
    else fs.copyFileSync(s, d);
  }
}

// resolve a skill name -> absolute source directory (containing SKILL.md).
// Rejects any catalog path that escapes the bundled skills tree — the catalog is
// trusted, but a tampered catalog.json must not turn `add` into an arbitrary copy.
function skillDir(name, catalog) {
  const row = catalog.skills.find((s) => s.name === name);
  if (!row) return null;
  const dir = fs.realpathSync(path.resolve(PKG_ROOT, path.dirname(row.path)));
  if (!isInside(fs.realpathSync(SKILLS_DIR), dir)) {
    fail(`catalog entry '${name}' points outside the skills tree (${row.path})`);
  }
  return dir;
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
  const dest = installDestination(args);
  console.log('');
  console.log(bold('  Installing RedBlueSkills → ') + dim(dest));

  // all skills
  copyDir(SKILLS_DIR, path.join(dest, 'skills'), dest);
  // orchestrator(s)
  if (fs.existsSync(ORCH_DIR)) copyDir(ORCH_DIR, path.join(dest, 'orchestrators'), dest);
  // catalog for the agent to reason over
  fs.copyFileSync(CATALOG, path.join(dest, 'catalog.json'));
  fs.copyFileSync(path.join(PKG_ROOT, 'ETHICS.md'), path.join(dest, 'ETHICS.md'));
  writeAgentReadme(dest, catalog);

  console.log(
    '  ' +
      red('●') +
      blue('●') +
      ` ${catalog.count} skills + attack-my-application orchestrator installed.`
  );
  console.log('');
  console.log('  Point your agent at ' + bold(path.join(dest, 'orchestrators/attack-my-application/SKILL.md')));
  console.log('  or just say: ' + bold('"attack my application"') + dim('  — it reviews the code in this project.'));
  console.log('  Testing a running app instead?  ' + bold('"attack my application at http://localhost:3000"'));
  console.log('');
  console.log('  New here?  ' + bold('npx redblueskills quickstart') + dim('  — 5-minute guide'));
  console.log('');
}

function cmdQuickstart() {
  try {
    process.stdout.write(fs.readFileSync(QUICKSTART, 'utf8'));
  } catch (e) {
    console.log('');
    console.log('  ' + bold('RedBlueSkills quickstart'));
    console.log('  1. ' + bold('npx redblueskills init') + '   — install skills + orchestrator');
    console.log('  2. Tell your agent: ' + bold('"attack my application"') + dim('  (it reviews the code in your project)'));
    console.log('     or point it at a running app: ' + bold('"attack my application at <url>"'));
    console.log('  3. Answer the authorization gate, then read the report.');
    console.log('');
    console.log(dim('  Full guide: https://github.com/praneeth132006/RedBlueSkills/blob/main/QUICKSTART.md'));
    console.log('');
  }
}

function cmdAdd(args) {
  const names = positionals(args);
  if (names.length === 0) fail('usage: redblueskills add <skill-name> [more...]  (or use `init` for all)');
  const catalog = loadCatalog();
  const dest = installDestination(args);
  const unknown = names.filter((name) => !skillDir(name, catalog));
  if (unknown.length) fail(`unknown skill(s): ${unknown.join(', ')}`);
  let n = 0;
  for (const name of names) {
    const src = skillDir(name, catalog);
    if (!src) {
      console.error(red('✗ ') + `unknown skill: ${name}`);
      continue;
    }
    const row = catalog.skills.find((s) => s.name === name);
    const rel = path.relative(SKILLS_DIR, src);
    copyDir(src, path.join(dest, 'skills', rel), dest);
    console.log(`  ${teamColor(row.team)('●')} added ${bold(name)}`);
    n++;
    // pull in paired skills too, so offense always ships with its defense
    for (const p of row.pairs_with || []) {
      const psrc = skillDir(p, catalog);
      if (psrc) {
        copyDir(psrc, path.join(dest, 'skills', path.relative(SKILLS_DIR, psrc)), dest);
        console.log(`    ${dim('↳ paired ' + p)}`);
      }
    }
  }
  if (n === 0) {
    fail('no known skills matched. Try `redblueskills list` to see available names.');
  }
  fs.copyFileSync(path.join(PKG_ROOT, 'ETHICS.md'), path.join(dest, 'ETHICS.md'));
  const installed = catalog.skills.filter((s) => fs.existsSync(path.join(dest, s.path)));
  const localCatalog = { ...catalog, skills: installed, count: installed.length };
  delete localCatalog.coverage; // Full-library coverage would misrepresent this subset.
  fs.writeFileSync(path.join(dest, 'catalog.json'), JSON.stringify(localCatalog, null, 2) + '\n');
  console.log(dim(`\n  ${n} skill(s) → ${dest}\n`));
}

// Decide whether the operator pointed us at a running app (URL) or at source
// code on disk (a path). Default, when nothing is given, is the current
// project directory — i.e. "the code I have right here".
function classifyTarget(raw) {
  if (!raw) {
    return { kind: 'code', value: '.', display: 'this project (' + process.cwd() + ')' };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) || /^localhost(:\d+)?(\/|$)/i.test(raw)) {
    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : 'http://' + raw;
    return { kind: 'url', value: url, display: url };
  }
  const resolved = path.resolve(process.cwd(), raw);
  if (fs.existsSync(resolved)) {
    return { kind: 'code', value: raw, display: 'the code at ' + resolved };
  }
  // Not a URL and not an existing path — treat as a code path the operator
  // intends (e.g. a relative dir), rather than silently assuming a URL.
  return { kind: 'code', value: raw, display: 'the code at ' + resolved };
}

function cmdAttack(args) {
  const playbook = path.join(ORCH_DIR, 'attack-my-application', 'SKILL.md');
  if (args.includes('--print') || args.includes('-p')) {
    process.stdout.write(fs.readFileSync(playbook, 'utf8'));
    return;
  }
  const t = classifyTarget(positionals(args)[0]);
  console.log('');
  console.log(bold('  attack-my-application') + dim('  ·  authorized testing only'));
  console.log('');
  if (t.kind === 'code') {
    console.log(dim('  Target: source code on disk — a full security review of the app you built.'));
  } else {
    console.log(dim('  Target: a running app — live probing of the deployed surface.'));
  }
  console.log('');
  console.log('  Give your coding agent this instruction:');
  console.log('');
  console.log(dim('  ─────────────────────────────────────────────────────────'));
  console.log('    Load the RedBlueSkills orchestrator at');
  console.log('    ' + bold(playbook));
  if (t.kind === 'code') {
    console.log('    and run a full security review of ' + bold(t.display) + '.');
    console.log('    It\'s my own code and I authorize testing it.');
  } else {
    console.log('    and run a full assessment of ' + bold(t.display) + '.');
    console.log('    It\'s my own app and I authorize testing it.');
  }
  console.log(dim('  ─────────────────────────────────────────────────────────'));
  console.log('');
  console.log('  The agent will: confirm authorization → map the surface → select skills');
  console.log('  → run them in kill-chain order → verify detection → report.');
  console.log('');
  console.log('  Point at a running app instead:  ' + dim('npx redblueskills attack http://localhost:3000'));
  console.log('  Full playbook:                   ' + dim('npx redblueskills attack --print'));
  console.log('');
}

function cmdLab(args) {
  const labs = {
    'security-controls': ['python3', '_lab/security-controls/validate.py'],
    'llm-local': ['python3', '_lab/llm-local/validate.py'],
    'ci-local': ['bash', '_lab/ci-local/validate.sh'],
  };
  if (!args.length || args[0] === '--list') {
    console.log('Offline labs: ' + Object.keys(labs).join(', '));
    console.log('Python labs require Python 3.10+; ci-local requires bash and git.');
    return;
  }
  const spec = labs[args[0]];
  if (!spec || args.length !== 1) fail('usage: redblueskills lab [--list|security-controls|llm-local|ci-local]');
  const result = spawnSync(spec[0], [path.join(PKG_ROOT, spec[1])], { stdio: 'inherit' });
  if (result.error) fail(`could not run ${spec[0]}: ${result.error.message}`);
  process.exitCode = result.status === 0 ? 0 : 1;
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
  if (i >= 0 && (!args[i + 1] || args[i + 1].startsWith('-'))) fail(`${flag} requires a directory`);
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
    `${catalog.count} paired red/blue security skills for authorized testing; check each skill’s maturity and validation target.`,
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
    attack [target] [--print] print the "attack my application" instruction
                             target = a code path (default: this project) or a running URL
    verify                   verify installed skill hashes, pairings, and metadata
    lab [name|--list]         run or list bundled offline labs
    --version                print the package version
    quickstart               print the 5-minute getting-started guide
    path                     print the default install directory

  ${bold('Examples')}
    npx redblueskills init
    npx redblueskills add web-sql-injection
    npx redblueskills list red
    npx redblueskills attack                         ${dim('# review the code in the current project')}
    npx redblueskills attack ./src                   ${dim('# review a specific code path')}
    npx redblueskills attack http://localhost:3000   ${dim('# probe a running app')}
`);
}

function main() {
  const [, , cmd, ...args] = process.argv;
  switch (cmd) {
    case '--version': case '-v': return console.log(require('../package.json').version);
    case 'verify': {
      const result = require('./verify').verify();
      return console.log(`Verified v${result.version}: ${result.skills} skill files, hashes, and pairings. This does not validate live targets.`);
    }
    case 'lab': return cmdLab(args);
    case 'init': return cmdInit(args);
    case 'add': return cmdAdd(args);
    case 'list': case 'ls': return cmdList(args);
    case 'attack': return cmdAttack(args);
    case 'quickstart': case 'start': return cmdQuickstart();
    case 'path': return cmdPath();
    case 'banner': return cmdBanner();
    case 'help': case '--help': case '-h': case undefined: return usage();
    default:
      console.error(red('✗ ') + `unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
}

try { main(); } catch (err) { fail(err.message); }

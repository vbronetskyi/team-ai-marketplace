#!/usr/bin/env node
// CI gate for the marketplace: structure, versions, dependencies, namespaced references,
// agent permissions, secrets. No dependencies; Node 20+. Exit 0 = ok, 1 = problems.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const problems = [];
const fail = (where, what) => problems.push(`${where}: ${what}`);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Frontmatter as a flat map of top-level keys (enough for name/description/tools/skills). */
export function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      out[key] = kv[2].replace(/^["']|["']$/g, '');
    } else if (key && /^\s+-\s+/.test(line)) {
      out[key] = [...(Array.isArray(out[key]) ? out[key] : []), line.replace(/^\s+-\s+/, '').trim()];
    }
  }
  return out;
}

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
/** Does `version` satisfy `range`? Supports ^, ~, =, >=, and an exact version. */
export function satisfies(version, range) {
  const v = version.match(SEMVER)?.slice(1).map(Number);
  const r = range.trim().match(/^(\^|~|=|>=)?(\d+)\.(\d+)\.(\d+)$/);
  if (!v || !r) return false;
  const [, op = '='] = r;
  const b = r.slice(2).map(Number);
  const cmp = v[0] - b[0] || v[1] - b[1] || v[2] - b[2];
  if (op === '=') return cmp === 0;
  if (op === '>=') return cmp >= 0;
  if (op === '~') return v[0] === b[0] && v[1] === b[1] && cmp >= 0;
  return cmp >= 0 && (b[0] > 0 ? v[0] === b[0] : b[1] > 0 ? v[0] === 0 && v[1] === b[1] : cmp === 0);
}

const SECRETS = [
  [/ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50,}/, 'GitHub token'],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic key'],
  [/sk-(proj-)?[A-Za-z0-9]{32,}/, 'OpenAI key'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
];

export function validate() {
  const mkPath = join(root, '.claude-plugin/marketplace.json');
  if (!existsSync(mkPath)) {
    fail('.claude-plugin/marketplace.json', 'missing');
    return problems;
  }
  const mk = readJson(mkPath);
  if (!mk.name || !mk.owner?.name || !Array.isArray(mk.plugins)) fail('marketplace.json', 'needs name, owner.name and plugins[]');

  const plugins = new Map();
  for (const entry of mk.plugins ?? []) {
    const where = `marketplace.json plugins[${entry.name}]`;
    if (typeof entry.source !== 'string' || !entry.source.startsWith('./plugins/')) {
      fail(where, 'source must be ./plugins/<name>');
      continue;
    }
    const dir = join(root, entry.source);
    const manPath = join(dir, '.claude-plugin/plugin.json');
    if (!existsSync(manPath)) {
      fail(where, `${entry.source}/.claude-plugin/plugin.json missing`);
      continue;
    }
    const man = readJson(manPath);
    const rel = relative(root, dir);
    if (man.name !== entry.name || dir.replace(/\/$/, '').split('/').pop() !== entry.name) fail(rel, `name "${man.name}" must equal the entry and the folder`);
    if (!SEMVER.test(man.version ?? '')) fail(rel, `version "${man.version}" is not SemVer`);
    if (man.version !== entry.version) fail(rel, `plugin.json version ${man.version} != marketplace entry ${entry.version}`);
    for (const k of ['description', 'license']) if (!man[k]) fail(rel, `plugin.json has no ${k}`);
    if (!man.author?.name) fail(rel, 'plugin.json has no author.name');
    const readme = join(dir, 'README.md');
    if (!existsSync(readme) || readFileSync(readme, 'utf8').split(/\s+/).length < 40) fail(rel, 'README.md missing or under 40 words');
    const changelog = join(dir, 'CHANGELOG.md');
    if (!existsSync(changelog) || !readFileSync(changelog, 'utf8').includes(`## ${man.version}`)) fail(rel, `CHANGELOG.md has no "## ${man.version}" entry`);
    plugins.set(entry.name, { dir, man, files: walk(dir) });
  }

  // Dependencies: known, satisfied by the current version, no cycles.
  for (const [name, p] of plugins) {
    for (const dep of p.man.dependencies ?? []) {
      const d = typeof dep === 'string' ? { name: dep.split('@')[0] } : dep;
      const target = plugins.get(d.name);
      if (!target) fail(name, `depends on unknown plugin "${d.name}"`);
      else if (d.version && !satisfies(target.man.version, d.version)) fail(name, `needs ${d.name} ${d.version}, marketplace has ${target.man.version}`);
    }
  }
  const visiting = new Set();
  const done = new Set();
  const visit = (n, path) => {
    if (done.has(n)) return;
    if (visiting.has(n)) return fail(n, `dependency cycle: ${[...path, n].join(' -> ')}`);
    visiting.add(n);
    for (const dep of plugins.get(n)?.man.dependencies ?? []) visit(typeof dep === 'string' ? dep.split('@')[0] : dep.name, [...path, n]);
    visiting.delete(n);
    done.add(n);
  };
  for (const n of plugins.keys()) visit(n, []);

  // Components: agents' frontmatter and permissions, skills' frontmatter.
  const components = new Map(); // "plugin:name" -> kind
  for (const [name, p] of plugins) {
    for (const f of p.files) {
      const rel = relative(root, f);
      if (/\/agents\/[^/]+\.md$/.test(f)) {
        const fm = frontmatter(readFileSync(f, 'utf8'));
        if (!fm?.name || !fm.description) { fail(rel, 'agent needs name and description'); continue; }
        if (!fm.tools) fail(rel, 'agent must list its tools (omitting them inherits everything)');
        const tools = String(fm.tools).split(',').map((t) => t.trim());
        if (tools.includes('Bash') && !tools.includes('Write') && !tools.includes('Edit')) fail(rel, 'a read-only agent must not have Bash');
        for (const k of ['hooks', 'mcpServers', 'permissionMode']) if (k in fm) fail(rel, `"${k}" is ignored in plugin agents; remove it`);
        components.set(`${name}:${fm.name}`, 'agent');
      }
      if (/\/skills\/[^/]+\/SKILL\.md$/.test(f)) {
        const fm = frontmatter(readFileSync(f, 'utf8'));
        const skill = f.split('/').at(-2);
        if (!fm?.description) fail(rel, 'skill needs a description');
        if (fm?.name && fm.name !== skill) fail(rel, `skill name "${fm.name}" differs from its folder "${skill}"`);
        components.set(`${name}:${skill}`, 'skill');
        if (readFileSync(f, 'utf8').split('\n').length > 500) fail(rel, 'SKILL.md over 500 lines; move material to references/');
      }
    }
  }

  // References, paths, secrets, scripts.
  const names = [...plugins.keys()].join('|');
  const refRe = new RegExp(`\\b(${names}):([a-z0-9][a-z0-9-]*)\\b`, 'g');
  for (const [, p] of plugins) {
    for (const f of p.files) {
      const rel = relative(root, f);
      const text = readFileSync(f, 'utf8');
      if (/\.(md|mjs|js|sh|json)$/.test(f)) {
        for (const m of text.matchAll(refRe)) if (!components.has(`${m[1]}:${m[2]}`)) fail(rel, `references ${m[0]}, which no plugin provides`);
        if (/\.claude\/skills\//.test(text) && !rel.endsWith('README.md')) fail(rel, 'refers to .claude/skills/; use ${CLAUDE_SKILL_DIR} or ${CLAUDE_PLUGIN_ROOT}');
        if (/\/Users\/|\/home\/[a-z]/.test(text)) fail(rel, 'absolute home path');
      }
      for (const [re, label] of SECRETS) if (re.test(text)) fail(rel, `looks like a ${label}`);
      if (/\.env(\.|$)/.test(f.split('/').pop())) fail(rel, '.env file in a plugin');
      if (/\/scripts\/[^/]+\.(sh|mjs|js|py)$/.test(f)) {
        if (!(statSync(f).mode & 0o111)) fail(rel, 'script is not executable');
        if (!/usage/i.test(text)) fail(rel, 'script has no usage line');
        if (/curl[^\n|]*\|\s*(ba)?sh|wget[^\n|]*\|\s*(ba)?sh/.test(text)) fail(rel, 'pipes a download into a shell');
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = validate();
  if (out.length) {
    console.log(`validate: ${out.length} problem(s)`);
    for (const p of out) console.log(`- ${p}`);
    process.exit(1);
  }
  console.log('validate: ok');
}

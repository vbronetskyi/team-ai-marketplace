#!/usr/bin/env node
// Builds site/catalog-index.json from the marketplace: manifests, READMEs, CHANGELOGs,
// and the frontmatter and body of every skill, agent and command. The static catalog
// (site/) reads only this file — no backend, no database.
// usage: node scripts/build-catalog.mjs [--out site/catalog-index.json]
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { frontmatter } from './validate.mjs';

const root = new URL('..', import.meta.url).pathname;
const outArg = process.argv.indexOf('--out');
const out = join(root, outArg > -1 ? process.argv[outArg + 1] : 'site/catalog-index.json');
const REPO = process.env.CATALOG_REPO ?? 'vbronetskyi/team-ai-marketplace';
const BRANCH = process.env.CATALOG_BRANCH ?? 'main';

const read = (p) => readFileSync(p, 'utf8');
const body = (text) => text.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
const git = (...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const lastChange = (path) => git('log', '-1', '--format=%cs', '--', path) || null;

/** "## 1.1.0 - 2026-10-22" sections → [{ version, date, items }] */
function changelog(text) {
  const entries = [];
  for (const block of text.split(/^## /m).slice(1)) {
    const [head, ...rest] = block.split('\n');
    const m = head.match(/^(\d+\.\d+\.\d+)\s*[-–—]\s*(\d{4}-\d{2}-\d{2})/);
    if (!m) continue;
    const items = rest.filter((l) => /^\s*[-*] /.test(l)).map((l) => l.replace(/^\s*[-*] /, '').trim());
    entries.push({ version: m[1], date: m[2], items });
  }
  return entries;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const mk = JSON.parse(read(join(root, '.claude-plugin/marketplace.json')));
const plugins = [];
const items = [];

for (const entry of mk.plugins) {
  const dir = join(root, entry.source);
  const man = JSON.parse(read(join(dir, '.claude-plugin/plugin.json')));
  const rel = relative(root, dir);
  const readme = existsSync(join(dir, 'README.md')) ? read(join(dir, 'README.md')) : '';
  const changes = existsSync(join(dir, 'CHANGELOG.md')) ? changelog(read(join(dir, 'CHANGELOG.md'))) : [];
  const components = [];

  for (const f of walk(join(dir, 'skills')).filter((f) => f.endsWith('/SKILL.md'))) {
    const text = read(f);
    const fm = frontmatter(text) ?? {};
    const name = dirname(f).split('/').pop();
    const files = walk(dirname(f)).map((x) => relative(dirname(f), x)).filter((x) => x !== 'SKILL.md');
    components.push({ kind: 'skill', name, description: fm.description ?? '', invocation: `/${man.name}:${name}`, tools: fm['allowed-tools'] ? String(fm['allowed-tools']).split(/,\s*/) : [], files, body: body(text), path: relative(root, f) });
  }
  for (const f of walk(join(dir, 'agents')).filter((f) => f.endsWith('.md'))) {
    const text = read(f);
    const fm = frontmatter(text) ?? {};
    components.push({ kind: 'agent', name: fm.name, description: fm.description ?? '', invocation: `@agent-${man.name}:${fm.name}`, tools: fm.tools ? String(fm.tools).split(/,\s*/) : [], model: fm.model ?? null, skills: Array.isArray(fm.skills) ? fm.skills : [], body: body(text), path: relative(root, f) });
  }
  for (const f of walk(join(dir, 'commands')).filter((f) => f.endsWith('.md'))) {
    const text = read(f);
    const fm = frontmatter(text) ?? {};
    const name = f.split('/').pop().replace(/\.md$/, '');
    components.push({ kind: 'command', name, description: fm.description ?? '', invocation: `/${man.name}:${name}`, tools: [], body: body(text), path: relative(root, f) });
  }
  if (existsSync(join(dir, 'hooks/hooks.json'))) components.push({ kind: 'hook', name: 'hooks', description: 'Hooks shipped with the plugin', invocation: '', tools: [], body: read(join(dir, 'hooks/hooks.json')), path: relative(root, join(dir, 'hooks/hooks.json')) });

  const deps = (man.dependencies ?? []).map((d) => (typeof d === 'string' ? { name: d.split('@')[0], range: '*' } : { name: d.name, range: d.version ?? '*' }));
  const evalCases = existsSync(join(dir, 'evals')) ? readdirSync(join(dir, 'evals')).filter((n) => existsSync(join(dir, 'evals', n, 'prompt.md'))) : [];
  plugins.push({
    name: man.name,
    displayName: man.displayName ?? man.name,
    version: man.version,
    description: man.description,
    author: man.author?.name ?? mk.owner.name,
    license: man.license ?? null,
    keywords: man.keywords ?? entry.tags ?? [],
    category: entry.category ?? null,
    deps,
    dependents: [],
    readme,
    changelog: changes,
    updated: lastChange(rel) ?? changes[0]?.date ?? null,
    install: `claude plugin install ${man.name}@${mk.name}`,
    githubUrl: `https://github.com/${REPO}/tree/${BRANCH}/${rel}`,
    tag: `${man.name}--v${man.version}`,
    evals: evalCases,
    components: components.map(({ kind, name }) => ({ kind, name })),
  });
  for (const c of components) {
    // A component carries only the plugin keywords its own text is about.
    const own = `${c.name} ${c.description} ${c.body}`.toLowerCase();
    const keywords = (man.keywords ?? []).filter((k) => own.includes(k.toLowerCase().replace(/js$/, '')));
    items.push({ ...c, id: `${man.name}:${c.name}`, plugin: man.name, version: man.version, keywords, author: man.author?.name ?? mk.owner.name, updated: lastChange(c.path) ?? null, githubUrl: `https://github.com/${REPO}/blob/${BRANCH}/${c.path}` });
  }
}
for (const p of plugins) for (const d of p.deps) plugins.find((x) => x.name === d.name)?.dependents.push(p.name);

const index = {
  marketplace: { name: mk.name, description: mk.description, owner: mk.owner, repo: `https://github.com/${REPO}`, addCommand: `claude plugin marketplace add ${REPO}` },
  builtAt: new Date().toISOString(),
  commit: git('rev-parse', '--short', 'HEAD') || null,
  plugins,
  items,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(index, null, 1) + '\n');
console.log(`catalog: ${plugins.length} plugins, ${items.length} components -> ${relative(root, out)}`);

#!/usr/bin/env node
// Checks spec ↔ plan traceability for one feature folder: every AC has a task, every
// task points at a real AC (or says plumbing) and names a test; with --require-commits,
// every done task has a commit SHA in the matrix. Exit 0 = ok, 1 = gaps, 2 = bad input.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const requireCommits = args.includes('--require-commits');
if (!dir) {
  console.error('usage: check-trace.mjs <specs/feature> [--require-commits]');
  process.exit(2);
}

let spec, plan;
try {
  spec = readFileSync(join(dir, 'spec.md'), 'utf8');
  plan = readFileSync(join(dir, 'plan.md'), 'utf8');
} catch (err) {
  console.error(`cannot read spec.md / plan.md in ${dir}: ${err.message}`);
  process.exit(2);
}

const specAcs = new Set([...spec.matchAll(/\bAC-(\d+)\b/g)].map((m) => `AC-${m[1]}`));
const tasks = [...plan.matchAll(/^\s*- \[( |x)\] (T\d+)\b(.*)$/gim)].map((m) => ({
  done: m[1].toLowerCase() === 'x',
  id: m[2],
  rest: m[3],
}));
const problems = [];

if (specAcs.size === 0) problems.push('spec.md has no AC-n criteria');
if (tasks.length === 0) problems.push('plan.md has no "- [ ] T<n> …" tasks');

const covered = new Set();
for (const t of tasks) {
  const parts = t.rest.split('→').map((p) => p.trim());
  const target = parts[1] ?? '';
  const test = parts[2] ?? '';
  const acs = [...target.matchAll(/\bAC-(\d+)\b/g)].map((m) => `AC-${m[1]}`);
  if (acs.length === 0 && !/^plumbing\b/i.test(target)) problems.push(`${t.id}: no AC and not marked plumbing`);
  for (const ac of acs) {
    if (!specAcs.has(ac)) problems.push(`${t.id}: points at ${ac}, which the spec does not have`);
    covered.add(ac);
  }
  if (!test) problems.push(`${t.id}: names no test`);
}
for (const ac of specAcs) if (!covered.has(ac)) problems.push(`${ac}: no task covers it`);

if (requireCommits) {
  for (const t of tasks.filter((x) => x.done)) {
    const row = plan.split('\n').find((l) => l.startsWith('|') && new RegExp(`\\b${t.id}\\b`).test(l));
    if (!row || !/\b[0-9a-f]{7,40}\b/.test(row)) problems.push(`${t.id}: done, but no commit SHA in the matrix`);
  }
}

if (problems.length > 0) {
  console.log(`traceability: ${problems.length} gap(s) in ${dir}`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log(`traceability: ok — ${specAcs.size} criteria, ${tasks.length} tasks${requireCommits ? ', commits recorded' : ''}`);

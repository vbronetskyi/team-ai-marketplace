#!/usr/bin/env node
// Prints the first open task of specs/<feature>/plan.md ("- [ ] T<n> …"), or "done".
// Exit 0 either way; exit 2 when the plan cannot be read.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) {
  console.error('usage: next-task.mjs <specs/feature>');
  process.exit(2);
}
let plan;
try {
  plan = readFileSync(join(dir, 'plan.md'), 'utf8');
} catch (err) {
  console.error(`cannot read ${join(dir, 'plan.md')}: ${err.message}`);
  process.exit(2);
}
const lines = plan.split('\n');
const open = lines.find((l) => /^\s*- \[ \] T\d+\b/.test(l));
const total = lines.filter((l) => /^\s*- \[( |x)\] T\d+\b/i.test(l)).length;
const done = lines.filter((l) => /^\s*- \[x\] T\d+\b/i.test(l)).length;
console.log(open ? `${open.replace(/^\s*- \[ \] /, '')}  (${done}/${total} done)` : `done (${done}/${total})`);

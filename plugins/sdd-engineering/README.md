# sdd-engineering

Spec-driven development as a Claude Code workflow: **spec → plan → implement → review →
verify → retro**, each step by its own agent or skill, with acceptance criteria traced to
tasks, tests and commits.

## What is inside

| Kind | Name | Does |
|---|---|---|
| agent | `sdd-engineering:spec-creator` | writes `specs/<feature>/spec.md` with EARS criteria |
| agent | `sdd-engineering:implementation-planner` | writes `plan.md`: tasks → AC → test |
| agent | `sdd-engineering:implementer` | one task: code, test, checks, commit, tick |
| agent | `sdd-engineering:plan-verifier` | read-only: every AC proven by a test, nothing extra |
| skill | `/sdd-engineering:run-plan specs/<feature>` | runs an approved plan task by task, then review and verification |
| skill | `/sdd-engineering:workflow-retro specs/<feature>` | writes `retro.md` from the files and git |
| skill | `sdd-engineering:sdd-method` | the method: `rules/`, `references/` templates, `scripts/check-trace.mjs` |

Scripts are referenced through `${CLAUDE_SKILL_DIR}`, so they work wherever the plugin is
installed. Evals live in `evals/` and run with `claude plugin eval`.

## Dependencies

`engineering-paved-path`, `research-tools` and `architecture-review`, each `^1.0.0`.
Install only this plugin; Claude Code installs the three dependencies with it.

```bash
claude plugin marketplace add vbronetskyi/team-ai-marketplace
claude plugin install sdd-engineering@team-ai-marketplace
```

## A short run

1. `@agent-sdd-engineering:spec-creator spec a link shortener: create, resolve, reject non-http URLs`
2. Answer its open questions, then `@agent-sdd-engineering:implementation-planner plan specs/link-shortener`
3. `/sdd-engineering:run-plan specs/link-shortener`
4. `/sdd-engineering:workflow-retro specs/link-shortener`

The agents write only under `specs/` (spec and plan) or the files a task names
(implementer). Plugin agents cannot carry hooks, so these limits are in their instructions
and in the review, not enforced by a hook; see `docs/SECURITY.md` of the marketplace.

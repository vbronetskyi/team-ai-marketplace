---
name: sdd-method
description: The spec-driven development method behind the sdd-engineering agents — the spec and plan templates, EARS acceptance criteria, traceability from criterion to task to test to commit, and a script that checks a plan. Use when writing or reviewing specs/<feature>/spec.md or plan.md, or when someone asks how the SDD workflow in this team works.
---

# Spec-driven development

The workflow: **spec → plan → implement → review → verify**, each step by its own agent:

| Step | Agent | Writes |
|---|---|---|
| spec | `sdd-engineering:spec-creator` | `specs/<feature>/spec.md` |
| research (optional) | `research-tools:researcher` | nothing, returns a cited summary |
| plan | `sdd-engineering:implementation-planner` | `specs/<feature>/plan.md` |
| implement | `sdd-engineering:implementer`, driven by `/sdd-engineering:run-plan` | code, tests, one commit per task |
| review | `architecture-review:architecture-reviewer` | nothing, returns findings |
| verify | `sdd-engineering:plan-verifier` | nothing, returns a report saved as `verification.md` |
| retro | `/sdd-engineering:workflow-retro` | `specs/<feature>/retro.md` |

The spec is committed before the code, so `git log` shows the decision came first.

## Files in this skill

- [rules/ears.md](rules/ears.md) — how to write acceptance criteria.
- [rules/traceability.md](rules/traceability.md) — what links a criterion to a test and a commit.
- [references/spec-template.md](references/spec-template.md) — the spec skeleton.
- [references/plan-template.md](references/plan-template.md) — the plan skeleton.

## Checking a plan

Before a plan is handed to the implementer, and again before verification, run:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/check-trace.mjs specs/<feature>
```

It reads `spec.md` and `plan.md` and fails (exit 1) when an `AC-n` from the spec has no
task, a task points at an AC the spec does not have, or a task names no test. With
`--require-commits` it also fails when a done task (`- [x]`) has no commit in the
traceability matrix — use that one before verification.

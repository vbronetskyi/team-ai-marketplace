---
name: run-plan
description: Executes an approved SDD plan (specs/<feature>/plan.md) task by task — each open task goes to the implementer agent, gets its test, checks and a commit, and is ticked in the plan — then runs the architecture review and the plan verifier. Use when a plan is approved and the user says "run the plan", "implement the plan" or "execute specs/<feature>".
argument-hint: specs/<feature>
---

# Run an approved plan

Feature folder: `$ARGUMENTS` (for example `specs/link-shortener`). It must contain an
approved `spec.md` (no open `[NEEDS CLARIFICATION]`) and a `plan.md`.

## 1. Gate

```bash
node ${CLAUDE_SKILL_DIR}/../sdd-method/scripts/check-trace.mjs $ARGUMENTS
```

If it fails, stop and show the gaps: the plan goes back to
`sdd-engineering:implementation-planner`. Do not "fix" a plan while running it.

## 2. Tasks, in order

```bash
node ${CLAUDE_SKILL_DIR}/scripts/next-task.mjs $ARGUMENTS
```

prints the first open task (`T<n> <what> → AC → test`) or `done`. For each open task:

1. Hand exactly that task to the `sdd-engineering:implementer` agent, with the paths of the
   spec and plan. One task per call; do not batch.
2. When it returns, check that `plan.md` has the task ticked and its commit SHA in the
   matrix, and that `git log -1` is that commit.
3. Stop on any condition in [references/stop-conditions.md](references/stop-conditions.md)
   and report it instead of continuing.

## 3. Review and verify

When `next-task.mjs` prints `done`:

1. Run `check-trace.mjs $ARGUMENTS --require-commits` (path as in step 1).
2. In parallel: `architecture-review:architecture-reviewer` on the branch diff, and
   `sdd-engineering:plan-verifier` with the spec, the plan and the diff.
3. Save the verifier's report as `$ARGUMENTS/verification.md` and commit it.
4. Report: tasks done with their commits, the reviewer's findings, the verifier's verdict.
   Suggest `/sdd-engineering:workflow-retro $ARGUMENTS` as the last step.

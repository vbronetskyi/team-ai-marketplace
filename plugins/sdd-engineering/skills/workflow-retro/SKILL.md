---
name: workflow-retro
description: Looks back at a finished SDD run for one feature — what the spec promised, what the plan and the commits delivered, where the spec changed mid-way, what the verifier found, how long it took — and writes specs/<feature>/retro.md with lessons worth keeping. Use after run-plan and verification, or when asked "how did this feature go".
argument-hint: specs/<feature>
---

# Retrospective of an SDD run

Feature folder: `$ARGUMENTS`.

1. Collect the facts (no model needed for these):

   ```bash
   bash ${CLAUDE_SKILL_DIR}/scripts/collect-run.sh $ARGUMENTS
   ```

   It prints: criteria and tasks counts, tasks done, the commits from the traceability
   matrix with their dates and subjects, spec Changelog lines, the verifier's verdict and
   its Extra / Untested sections, and the time from the spec commit to the last commit.

2. Read `spec.md`, `plan.md` and `verification.md` where the facts point at something.

3. Write `$ARGUMENTS/retro.md` from
   [references/retro-template.md](references/retro-template.md). Every claim cites a file,
   a commit or a line of the collected facts. No praise, no blame: what happened, why, and
   what to do differently.

4. Lessons that would help the next feature go to the project's notes (an `INSIGHTS.md`
   or similar) only if the project has such a file; list them in the retro either way.

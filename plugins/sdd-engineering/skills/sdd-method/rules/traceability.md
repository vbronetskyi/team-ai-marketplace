# Traceability

Every acceptance criterion is reachable from a task, every task from a test, every done
task from a commit:

```
AC-n  →  T-m (plan.md)  →  test file / test name  →  commit SHA
```

- A task line in `plan.md` is `- [ ] T<m> <what> → AC-<n>[, AC-<k>] → <test>`.
- A task with no AC is plumbing and must say so: `→ plumbing (<why>)`.
- The matrix in `plan.md` has one row per AC: `| AC-n | T-m | <test> | <sha> |`.
- The implementer fills the SHA when the task is committed; the verifier checks it exists.
- A spec change after planning gets a Changelog line in the spec and a re-check of the plan.

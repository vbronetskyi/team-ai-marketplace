# When run-plan stops

Stop the run and report — never work around these:

- The implementer reports that the plan or spec is wrong (a missing function, a wrong
  assumption, behaviour the spec did not foresee). The spec gets a Changelog line and the
  plan is re-checked before anything else is built.
- A task's checks fail twice. Report the failing command and its output.
- The task is not ticked, or no commit was made, after the implementer returns.
- A change touches files outside what the task names, a generated migration, a lockfile
  or secrets.
- The next task depends on a decision listed under Open questions.

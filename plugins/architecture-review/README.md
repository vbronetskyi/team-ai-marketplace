# architecture-review

One agent, `architecture-review:architecture-reviewer`: it reviews a diff for architecture,
not style — layering and the dependency rule, module boundaries, shared contracts copied
everywhere, frontend file layout — and reports `SEVERITY path:line — rule, smallest fix`.
The project's own `CLAUDE.md` / `AGENTS.md` wins over the defaults. Read-only (Read, Grep,
Glob).

It preloads `engineering-paved-path:onion-architecture` and
`engineering-paved-path:frontend-architecture`, so it depends on
`engineering-paved-path` `^1.0.0`; installing it installs that dependency too.

```bash
claude plugin marketplace add vbronetskyi/team-ai-marketplace
claude plugin install architecture-review@team-ai-marketplace
```

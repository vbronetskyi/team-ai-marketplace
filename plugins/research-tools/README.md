# research-tools

One agent, `research-tools:researcher`: it finds facts before anything is planned or
changed — where something lives in the repository, how a library or API behaves, what a
document says — and returns a short answer with `path:line` and URL evidence and a list of
what it could not confirm. It has Read, Grep, Glob, WebFetch and WebSearch only: no
Edit, no Write, no Bash, so it cannot change anything whatever it reads.

Use it when a question needs many files or the web and only the conclusion matters:
`@agent-research-tools:researcher where is the session timeout configured?`

```bash
claude plugin marketplace add vbronetskyi/team-ai-marketplace
claude plugin install research-tools@team-ai-marketplace
```

`sdd-engineering` depends on it with `^1.0.0` and calls it between the spec and the plan.

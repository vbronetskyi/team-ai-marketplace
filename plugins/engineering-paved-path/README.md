# engineering-paved-path

The team's paved road for TypeScript web work: the skills an agent should load when it
writes or reviews React, Next.js and Fastify code, places code in layers, writes component
tests or touches anything security-sensitive. Skills load on demand; nothing runs by itself.

## Skills

| Skill | Use it for |
|---|---|
| `engineering-paved-path:react-best-practices` | React components, hooks rules, state, anti-patterns |
| `engineering-paved-path:next-app-router` | Next.js App Router: server/client boundary, data, routes, hydration |
| `engineering-paved-path:fastify-best-practices` | Fastify routes, plugins, schemas, errors, hooks, deployment |
| `engineering-paved-path:onion-architecture` | backend layering with a dependency-cruiser gate |
| `engineering-paved-path:frontend-architecture` | frontend folder layout and component organization |
| `engineering-paved-path:react-testing-library` | component tests with Testing Library and Vitest |
| `engineering-paved-path:security` | OWASP Top 10, auth, injection, uploads, secrets |

## Install

```bash
claude plugin marketplace add vbronetskyi/team-ai-marketplace
claude plugin install engineering-paved-path@team-ai-marketplace
```

No settings, secrets or network access. Other plugins in this marketplace
(`architecture-review`, `sdd-engineering`) depend on it with `^1.0.0`.

Sources and licenses of the skills that started outside this team: [NOTICE.md](NOTICE.md).

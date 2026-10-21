---
name: onion-architecture
description: "Onion / ports-and-adapters layering for a TypeScript backend (Fastify or similar). Use when adding or reviewing a backend module — placing routes, services, repositories and adapters, deciding where a DB query or an external SDK call (LLM, GitHub, git, a CLI) may live, wiring dependency injection in the composition root, defining a new port, or keeping the domain core pure. Enforces the dependency rule (imports point inward) with a dependency-cruiser gate. NOT for frontend code (use frontend-architecture)."
---

# Onion architecture for a TypeScript backend

Use it whenever you add or review backend code. It names the layers, says where each kind
of code lives and gives a `dependency-cruiser` gate that fails the build when an import
points outward. Paths below are the default layout; if the project uses other folder
names, map them once in `layer-map.md` terms and keep the rule.

## The one rule

**All imports point inward.** A file may depend on layers more central than itself, never
on a layer further out. Inner layers declare interfaces (ports), outer layers implement
them (adapters), and the composition root binds the two.

```
Transport      src/modules/<feature>/routes.ts          ← outermost
Infrastructure src/adapters/<kind>/*, src/db/*, modules/<feature>/repository.ts
Application    src/modules/<feature>/service.ts
Ports          src/ports/*.ts            (interfaces only, no vendor names)
Core           src/core/**               (pure domain logic, no I/O)
               composition root: src/platform/container.ts (knows ports and adapters)
```

## Layer map

| Layer | Path | May import | Must NOT import |
|-------|------|-----------|-----------------|
| Core | `src/core/**` | itself, port **types** | any I/O: HTTP framework, ORM, DB driver, SDKs, `src/adapters/**`, `src/db/**` |
| Ports | `src/ports/**` | other port types | anything concrete |
| Application | `src/modules/*/service.ts` | ports, the container, its own repository and helpers | `src/adapters/**` |
| Infrastructure | `src/adapters/**`, `src/db/**`, `src/modules/*/repository*.ts` | ports, drivers and SDKs, the DB schema | another feature's module |
| Composition root | `src/platform/container.ts` | everything | — |
| Transport | `src/modules/*/routes.ts` | its own service, shared helpers, contracts | `src/adapters/**`, the DB schema |

Details with examples of each allowed and forbidden edge: [layer-map.md](layer-map.md).

## Placing a change (apply in order)

1. **An external call** (HTTP, DB, git, an LLM, a CLI)? Behind a **port** in `src/ports/`,
   implemented by an **adapter** in `src/adapters/<kind>/`. Never call an SDK from a
   service or a route.
2. **A DB query?** In `src/modules/<feature>/repository.ts`, the only place that touches the
   schema and the ORM. Repositories return domain rows, not query builders.
3. **Orchestration?** In `src/modules/<feature>/service.ts`. The service depends on
   interfaces through the container, never on an adapter class.
4. **HTTP wiring?** `routes.ts` only: validate the request, call the service, map the
   result. No logic, no DB, no SDK.
5. **Pure domain logic** (parsing, scoring, rules)? In `src/core/`, pure; its only contact
   with the outside is an injected port.
6. **Another feature's capability?** Through the container, never by importing a file from
   another `src/modules/<other>/`.

## Adding an external dependency

1. Define the port first: an interface in `src/ports/` in the application's language
   ("post a review comment"), with no vendor name in it.
2. Implement the adapter in `src/adapters/<kind>/<impl>.ts` around the SDK.
3. Add a mock adapter next to the others, for tests.
4. Bind it in the composition root as a lazy getter, with an override hook for tests.
5. Services use `container.<port>` and never see the SDK.

## Enforcement

The rule is a gate, not a habit. [enforcement.md](enforcement.md) has a ready
`.dependency-cruiser.cjs` and the npm script. Before calling a backend change done, run:

```bash
npm run depcruise
```

Severities are a ratchet: a rule with known violations starts as `warn`, the violations are
listed in the config comment as drift to burn down, and the rule becomes `error` once the
list is empty. Never add a new violation to a `warn` rule, and never relax an `error`.

## Exceptions

An exception lives in the config as a `pathNot` with a one-line reason, for example an
indexer subsystem that is infrastructure by nature and is reached only through a facade.
An exception without a reason is a violation.

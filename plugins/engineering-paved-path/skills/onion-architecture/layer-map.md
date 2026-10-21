# Layer map

Each onion ring mapped onto the default layout, with what lives there and the allowed and
forbidden imports. Read it when you are not sure where a piece of code belongs.

## 1. Core — `src/core/**`

Pure functions: parsing, rules, scoring, prompt assembly. No I/O at all: no DB, file
system, network, git or persistence. The only outside contact is an injected port (for
example an `LlmProvider`), so the same code can run in the server, a CLI or CI.

- **May import:** itself; port and contract **types**.
- **Must NOT import:** the HTTP framework, the ORM, DB drivers, HTTP/SDK clients, `node:fs`,
  `src/adapters/**`, `src/db/**`.

## 2. Ports — `src/ports/**`

Interfaces the inner layers depend on and the outer layers implement.

- Ports name what the application needs, never a vendor: `CodeHost`, not `Octokit`. A port
  whose shape mentions a vendor is a leak.
- Contracts (DTOs, Zod schemas) that the client also uses belong here or in a shared package.

## 3. Application — `src/modules/<feature>/service.ts`

Orchestration: resolve inputs, call ports, persist through the feature's repository.

- **May import:** ports, the container type, its own repository and helpers, shared helpers.
- **Must NOT import:** `src/adapters/**` (a concrete SDK wrapper), the DB schema.

## 4. Infrastructure — `src/adapters/**`, `src/db/**`, `src/modules/*/repository*.ts`

Adapters wrap SDKs and CLIs behind ports. Repositories are the only code that touches the
schema and the ORM.

- **May import:** ports, drivers and SDKs, the schema.
- **Must NOT import:** a feature module (an adapter that needs a feature constant means the
  constant belongs in a shared place).

## 5. Composition root — `src/platform/container.ts`

The only file that knows both a port and its adapter. Lazy getters create adapters on first
use; an overrides object lets tests inject mocks.

## 6. Transport — `src/modules/<feature>/routes.ts`

Request validation, a call to the service, the response. Nothing else.

- **May import:** its own service, shared helpers, contracts.
- **Must NOT import:** adapters, the schema, another feature's service.

## Edges that look harmless and are not

| Edge | Why it breaks the rule | Fix |
|---|---|---|
| route → repository | skips the service: no transaction or authorization in one place | call the service |
| service → `new SomeSdk()` | the service now knows a vendor and cannot be tested without it | add a port and an adapter |
| feature A → `modules/b/helpers.ts` | couples two features' internals | move the helper to a shared place, or call B through the container |
| core → `node:fs` | the core stops being pure | pass the content in |

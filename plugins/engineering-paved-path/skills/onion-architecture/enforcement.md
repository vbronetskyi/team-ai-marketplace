# Enforcement: the dependency-cruiser gate

This turns the dependency rule from "remember to" into "the build fails otherwise".
`dependency-cruiser` is a test runner for the import graph: `forbidden` rules over
`from -> to` path patterns, and every edge that matches is reported. It uses RE2, so there is
no look-ahead; exclusions go into `pathNot`, and `$1` in `to.path` refers to the capture
group in `from.path`.

## 1. Install and add the config

```bash
npm i -D dependency-cruiser
```

`.dependency-cruiser.cjs` (CommonJS on purpose: in a `"type": "module"` package a `.js`
config would be parsed as ESM):

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      comment: 'The domain core does no I/O; its only outside contact is an injected port.',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: ['^fastify', 'drizzle-orm', '^postgres', '^pg$', 'octokit', 'simple-git', '^node:fs', '^src/adapters/', '^src/db/'] },
    },
    {
      name: 'services-depend-on-ports',
      comment: 'A service orchestrates through ports, never a concrete adapter.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/service[^/]*\\.ts$' },
      to: { path: '^src/adapters/' },
    },
    {
      name: 'routes-are-thin',
      comment: 'Transport calls the service; it never reaches adapters or the schema.',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: ['^src/adapters/', '^src/db/'] },
    },
    {
      name: 'db-confined-to-repositories',
      comment: 'Only repositories touch the schema and the ORM.',
      severity: 'error',
      from: { path: '^src/modules/', pathNot: '^src/modules/[^/]+/repository' },
      to: { path: ['^src/db/schema', '^drizzle-orm'] },
    },
    {
      name: 'no-cross-module-internals',
      comment: 'One feature reaches another through the container, never through its files.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/([^/]+)/', pathNot: ['^src/modules/$1/', '^src/modules/_shared/'] },
    },
    {
      name: 'adapters-dont-know-modules',
      comment: 'Infrastructure does not depend on a feature.',
      severity: 'error',
      from: { path: '^src/adapters/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'no-circular',
      severity: 'warn',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['node_modules', '/dist/', '\\.test\\.ts$'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
```

## 2. Add the script

```json
{ "scripts": { "depcruise": "depcruise src --config .dependency-cruiser.cjs" } }
```

## 3. Adopting it in an existing codebase

Run it once. Rules that are already clean stay `error`. A rule with existing violations
starts as `warn`, and its comment lists the violations as drift to burn down; once the list
is empty, the rule becomes `error`. That ratchet is the point: a new violation never lands,
and an old one never becomes normal.

dependency-cruiser exits non-zero only on an `error`, so add `npm run depcruise` to CI next to
the type check and tests.

## 4. Exceptions

An exception is a `pathNot` on one rule with a reason in the comment. When the cause goes
away, delete the `pathNot` in the same change.

## 5. Checking the config itself

```bash
npx depcruise src --config .dependency-cruiser.cjs --output-type err-long
npx depcruise src --config .dependency-cruiser.cjs --output-type dot | dot -T svg > graph.svg
```

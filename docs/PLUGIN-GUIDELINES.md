# Plugin guidelines

## Layout

```
plugins/<name>/
  .claude-plugin/plugin.json      manifest (required)
  README.md                       what it does, how to use it (required)
  CHANGELOG.md                    one entry per released version (required)
  skills/<skill>/SKILL.md         plus rules/, references/, scripts/ next to it
  agents/<agent>.md
  evals/<case>/prompt.md, graders/*.md   (required for workflow plugins)
```

Only `plugin.json` lives in `.claude-plugin/`; everything else is at the plugin root.

## Manifest

Required by this marketplace (Claude Code itself needs only `name`): `name` (kebab-case,
the same as the folder), `version` (SemVer), `description`, `author`, `license`,
`keywords`. The `version` must equal the plugin's entry in `marketplace.json`.

## Dependencies

- Declared in `plugin.json` as objects with a SemVer range:
  `{ "name": "engineering-paved-path", "version": "^1.0.0" }`.
- Only plugins of this marketplace. A cross-marketplace dependency needs the target in
  `allowCrossMarketplaceDependenciesOn` and a platform review.
- A range resolves against the git tags `<name>--v<version>` of this repository, so a
  dependency must be released (tagged) before the plugin that needs it.
- No cycles. `scripts/validate.mjs` fails on an unknown dependency, a range the current
  version does not satisfy, or a cycle.

## References between plugins

- Skills and agents of another plugin are referred to by namespace:
  `engineering-paved-path:onion-architecture`, `research-tools:researcher`. A bare name
  could resolve to a project skill with the same name.
- An agent preloads the skills it needs with `skills:` in its frontmatter.
- Supporting files are reached through `${CLAUDE_SKILL_DIR}` (inside the skill) or
  `${CLAUDE_PLUGIN_ROOT}`, never through `.claude/skills/...` or an absolute path: the
  plugin is installed into a cache directory, not into the project.

## Generic, not project-specific

A plugin must work in a repository that is not the one it came from:
- no project paths (`server/src/...`), product names or package names in instructions;
  say "the project's `CLAUDE.md` / `AGENTS.md`" and let the project's instructions win;
- no product specs, no project data, no caches, no secrets, no `.env`.

## Agents

- `name`, `description` (when to use it), `tools` (the smallest set), `model`.
- Read-only agents get `Read, Grep, Glob` (plus web tools if they research). A reviewer of
  untrusted code never gets Bash.
- Plugin agents cannot carry `hooks`, `mcpServers` or `permissionMode`; Claude Code
  ignores them. Limits that need a hook are documented in the README and checked in review.

## Skills

`SKILL.md` under 500 lines, a `description` that says when to use it; long material goes
to `references/`, rules to `rules/`, executable helpers to `scripts/` (with a usage line
and an exit code contract).

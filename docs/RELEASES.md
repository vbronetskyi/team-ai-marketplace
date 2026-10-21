# Releases

## Versions

SemVer per plugin:
- **patch** — wording fixes, a new example; behaviour the same.
- **minor** — backward-compatible additions: a new section in a template, a new eval, a new
  optional step, a new skill.
- **major** — anything that can break a project or a dependent plugin: a removed or renamed
  skill/agent, a changed output file or format, a narrower tool list that a workflow relies
  on, a dependency bumped to a new major.

For AI components a one-line change in a `description` can change when a skill activates;
treat a description rewrite as minor at least, and cover it with an eval.

## Tags

`<plugin>--v<version>`, for example `sdd-engineering--v1.1.0`, on this repository. Claude
Code resolves dependency ranges against these tags, so:
1. a dependency is tagged before the plugin that depends on it;
2. the `version` in `plugin.json` at the tagged commit must equal the tag;
3. tags are immutable: a mistake is fixed by a new version, never by moving a tag.

`claude plugin tag plugins/<name> --push` creates the tag from the manifest after checking
the version against `marketplace.json` and a clean tree.

## Release steps

1. Merge the change with the version bump and the CHANGELOG entry.
2. `node scripts/validate.mjs` and `claude plugin eval plugins/<name>` on the merge commit.
3. Tag (`claude plugin tag ... --push`), dependencies first.
4. Write `releases/<plugin>-<version>.md`: version, tag, commit SHA, validation and eval
   results with their numbers.

## Updating

- `claude plugin marketplace update team-ai-marketplace` — refreshes the catalog: which
  plugins and versions exist.
- `claude plugin update <plugin>@team-ai-marketplace` — moves an installed plugin to the
  newest version its constraints allow.
- A new session then loads the new version; `claude plugin list` shows it.

## Rollback

- A bad release is replaced by a new **patch** that reverts it (`1.1.1` = `1.1.0` minus the
  bad change). Tags are never deleted or moved.
- To stay on the previous version until then, a project pins the marketplace in its
  `.claude/settings.json` to the last good tag (`"source": { "source": "github", "repo":
  "vbronetskyi/team-ai-marketplace", "ref": "sdd-engineering--v1.0.0" }`) and runs
  `claude plugin marketplace update` and `claude plugin update`; the release note says so.
- A security problem is also announced in the README until a fixed version is out.

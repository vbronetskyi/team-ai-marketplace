# team-ai-marketplace

The team's Claude Code plugins in one versioned place: the skills and agents that started
in the DevDigest repository, generalized so another project can install them with one
command instead of copying `.claude/` folders around.

**Catalog with search:** https://vbronetskyi.github.io/team-ai-marketplace/

| Plugin | What it gives | Depends on |
|---|---|---|
| [engineering-paved-path](plugins/engineering-paved-path) | React, Next.js, Fastify, architecture, testing and security skills | - |
| [research-tools](plugins/research-tools) | a read-only `researcher` agent | - |
| [architecture-review](plugins/architecture-review) | a read-only `architecture-reviewer` agent | engineering-paved-path `^1.0.0` |
| [sdd-engineering](plugins/sdd-engineering) | the spec-driven workflow: 4 agents, `run-plan`, `workflow-retro`, method and evals | all three above, `^1.0.0` |

## Use it in a project

```bash
claude plugin marketplace add vbronetskyi/team-ai-marketplace
claude plugin install sdd-engineering@team-ai-marketplace --scope project
```

The second command also installs the three dependencies. To make a repository ask every
teammate for the marketplace and plugins, commit `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "team-ai-marketplace": { "source": { "source": "github", "repo": "vbronetskyi/team-ai-marketplace" } }
  },
  "enabledPlugins": {
    "engineering-paved-path@team-ai-marketplace": true,
    "research-tools@team-ai-marketplace": true,
    "architecture-review@team-ai-marketplace": true,
    "sdd-engineering@team-ai-marketplace": true
  }
}
```

Updates: `claude plugin marketplace update team-ai-marketplace` refreshes the catalog (which
plugins and versions exist), `claude plugin update sdd-engineering@team-ai-marketplace`
updates the installed plugin.

## Layout

```
.claude-plugin/marketplace.json   the catalog Claude Code reads
plugins/<name>/                   one plugin each: .claude-plugin/plugin.json, skills/, agents/, README, CHANGELOG
docs/                             PLUGIN-GUIDELINES, SECURITY, RELEASES
scripts/                          validate.mjs (CI gate), build-catalog.mjs (catalog index)
site/                             the static catalog (GitHub Pages)
releases/                         release evidence: version, tag, commit, eval results
```

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Owners per plugin: [CODEOWNERS](CODEOWNERS).

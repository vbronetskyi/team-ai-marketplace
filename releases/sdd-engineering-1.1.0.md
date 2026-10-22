# Release sdd-engineering 1.1.0 - 2026-10-22

**Tag:** `sdd-engineering--v1.1.0` · **Commit:** `2bdb42cfaf8605a4adcf46d8814b31f87eafb0ad`
Dependencies unchanged: engineering-paved-path, research-tools, architecture-review 1.0.0
(`^1.0.0`).

## Change (minor, backward-compatible)

spec-creator tags every acceptance criterion with its EARS pattern
(`AC-3 [unwanted] IF …`). Specs written by 1.0.0, without tags, still pass
`check-trace.mjs`: it reads `AC-n` either way (checked on both formats before release).

## Evals

| Case | Runs | Mean score | Cost |
|---|---|---|---|
| `namespaces` | 2 | 1.00 | $0.12 |
| `spec-from-request` | 2 | 1.00 | $0.96 |
| `ears-tags` | 2 | 1.00 | $1.01 |

Total $2.09. `ears-tags` is new in this release: the spec for a rate limit must
have at least three tagged criteria and an `[unwanted]` one for going over the limit. Its
grader was corrected once (it first demanded exactly three tags, the specs had 12-13);
`namespaces` and `spec-from-request` ran on the release change commit, `ears-tags` on the
tagged commit, with the same plugin content.

## Update check

In the clean config used for the 1.0.0 install check, marketplace first, then the plugin:

```
$ claude plugin marketplace update team-ai-marketplace
✔ Successfully updated marketplace: team-ai-marketplace
$ claude plugin update sdd-engineering@team-ai-marketplace
✔ Plugin "sdd-engineering" updated from 1.0.0 to 1.1.0 for scope user. Restart to apply changes.
```

A new session (`claude -p … --output-format stream-json --verbose`) reports in its init
event:

```
plugins: sdd-engineering 1.1.0, engineering-paved-path 1.0.0, research-tools 1.0.0, architecture-review 1.0.0
agents:  sdd-engineering:spec-creator, sdd-engineering:implementation-planner,
         sdd-engineering:implementer, sdd-engineering:plan-verifier,
         research-tools:researcher, architecture-review:architecture-reviewer
```


# Changelog

All notable changes to `sdd-engineering`. Versions follow SemVer; tags are `sdd-engineering--v<version>`.

## 1.1.0 - 2026-10-22

- spec-creator tags every acceptance criterion with its EARS pattern (`AC-3 [unwanted] …`),
  so a missing unwanted-behaviour criterion is visible at a glance. Backward-compatible:
  untagged 1.0.0 specs still pass `check-trace.mjs`.
- `rules/ears.md` and the spec template describe the tags.
- New eval `ears-tags`.

## 1.0.0 - 2026-10-22

- First release in team-ai-marketplace.

---
name: ears-tags
tags: [workflow, spec, "1.1.0"]
runs: 1
max_turns: 25
timeout_seconds: 600
plugins: [../../.eval-deps/sdd-engineering, ../../.eval-deps/engineering-paved-path, ../../.eval-deps/research-tools, ../../.eval-deps/architecture-review]
allowed_tools: [Agent, Read, Glob, Grep, Write, Edit, Skill]
---
Our public API needs a rate limit: each API key may make at most 100 requests per minute,
and requests over the limit are refused until the minute passes. Have the spec-creator
agent write the spec to specs/rate-limit/spec.md. Do not plan or implement yet. When it is
done, reply with the full text of the spec file.

---
name: spec-from-request
tags: [workflow, spec]
runs: 1
max_turns: 25
timeout_seconds: 600
plugins: [../../.eval-deps/sdd-engineering, ../../.eval-deps/engineering-paved-path, ../../.eval-deps/research-tools, ../../.eval-deps/architecture-review]
allowed_tools: [Agent, Read, Glob, Grep, Write, Edit, Skill]
---
We want a small link shortener in this repository: POST /links with a URL returns a short
code, GET /<code> redirects to the URL, and anything that is not an http or https URL is
rejected. Start the SDD workflow: have the spec-creator agent write the spec to
specs/link-shortener/spec.md. Do not plan or implement yet. When it is done, reply with the
full text of the spec file and the open questions the agent returned.

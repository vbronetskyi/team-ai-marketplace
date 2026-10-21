---
name: namespaces
tags: [smoke, namespaces]
runs: 1
max_turns: 2
plugins: [../../.eval-deps/sdd-engineering, ../../.eval-deps/engineering-paved-path, ../../.eval-deps/research-tools, ../../.eval-deps/architecture-review]
allowed_tools: []
---
Without calling any tool, list every agent and every skill that the sdd-engineering plugin
gives you in this session, each by the exact name you would use to call it, one per line.

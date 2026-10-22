---
type: regex
pattern: "AC-\\d+\\s*\\[(ubiquitous|event|state|unwanted|optional)\\]"
match: count:3
target: { source: file, path: specs/rate-limit/spec.md }
---
Criteria carry their EARS pattern tag (new in 1.1.0); at least three are tagged.

---
type: regex
pattern: "AC-\\d+\\s*\\[unwanted\\]"
match: contains
target: { source: file, path: specs/rate-limit/spec.md }
---
Going over the limit is an unwanted-behaviour criterion, tagged as such.

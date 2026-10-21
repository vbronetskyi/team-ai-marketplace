---
type: regex
pattern: "AC-1[\\s\\S]*\\b(WHEN|IF)\\b"
match: contains
target: { source: file, path: specs/link-shortener/spec.md }
---
The spec has numbered acceptance criteria written in EARS (an event or unwanted pattern).

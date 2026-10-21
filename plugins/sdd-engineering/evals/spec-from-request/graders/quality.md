---
type: llm
focus: last_message
---
Judge the spec at specs/link-shortener/spec.md as described in the final answer. Pass when:
the criteria are numbered AC-1, AC-2…; each describes one testable behaviour with a
trigger and a reaction; there is a criterion for rejecting non-http(s) URLs; non-goals are
listed; the URL from the request is named as an untrusted input; open questions are
returned instead of invented answers. Fail if the spec describes implementation
(frameworks, tables) instead of behaviour.

---
type: llm
focus: last_message
---
The final answer quotes the spec written to specs/link-shortener/spec.md. Check each item
and PASS only if all of them hold; otherwise FAIL and name the missing item.

1. Acceptance criteria are numbered AC-1, AC-2, … and written as EARS sentences
   (The system shall / WHEN … / IF … THEN … / WHILE … / WHERE …).
2. At least one criterion says that a URL whose scheme is not http or https is rejected.
3. There is a criterion for creating a code and one for redirecting a known code.
4. A Non-goals list exists and is not empty.
5. The submitted URL is named under an Untrusted inputs (or equivalent) section.
6. Undecided points are listed as open questions rather than settled silently.

Naming a status-code range, a URL standard or a code length as an open question or a
testable limit is fine and is not "implementation".

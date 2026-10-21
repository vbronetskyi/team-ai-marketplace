# EARS acceptance criteria

One behaviour per criterion, numbered `AC-1`, `AC-2`… in the order they appear. Each has a
trigger (or a state) and a reaction a test can observe.

| Pattern | Shape | Example |
|---|---|---|
| Ubiquitous | The system shall … | The system shall store every link with its creation time. |
| Event | WHEN <trigger>, the system shall … | WHEN a link is created, the system shall return its short code. |
| State | WHILE <state>, the system shall … | WHILE the store is read-only, the system shall reject writes with 503. |
| Unwanted | IF <condition>, THEN the system shall … | IF the URL is not http(s), THEN the system shall reject it with 400. |
| Optional | WHERE <feature is present>, the system shall … | WHERE a custom alias is given, the system shall use it as the code. |

Rules:
- No vague words: "fast", "big", "user-friendly", "robust". Say the number, the limit, the
  message.
- No implementation: "uses Redis" is a plan decision, not a criterion.
- A criterion that needs two tests to prove is two criteria.
- An "unwanted" criterion for every input that comes from outside the system.
- Open decisions go to Open questions as `[NEEDS CLARIFICATION: …]`, not into a criterion.

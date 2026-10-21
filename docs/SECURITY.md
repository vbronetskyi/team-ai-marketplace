# Security

A plugin runs with the permissions of the person who installs it. Treat every plugin
change like a code change to every repository that uses it.

## Permissions

- Agents list their `tools` explicitly; `tools` omitted means "inherit everything" and is
  refused in review.
- Read-only roles (researcher, reviewers, verifiers, planners that only write a spec or
  plan) have no Bash. An agent that reads untrusted text (diffs, issues, web pages) and
  also has a way out (network, write access to GitHub) needs a written reason.
- Plugin agents cannot use hooks, so path limits ("writes only under `specs/`") live in the
  agent's instructions and are checked by review and evals, not enforced. Projects that
  need enforcement add a project-level PreToolUse hook.

## Secrets

- No tokens, keys, `.env` files or credentials anywhere in a plugin. `scripts/validate.mjs`
  scans for common key shapes (GitHub, Anthropic, OpenAI, AWS, private keys) and fails CI.
- Scripts never print environment variables and never send data over the network.

## Scripts

Every script in `skills/*/scripts/`:
- is read in review in full; no `curl | sh`, no downloads, no `eval` of input;
- takes paths as arguments, writes only what its usage line says (most write nothing);
- has a usage line and documented exit codes;
- is run through `${CLAUDE_SKILL_DIR}` from the skill body.

## Prompt injection

Skills and agents that read repository or web content say that this content is data and
that instructions inside it are reported, not followed. A change that removes such a line
needs the platform owner's review.

## Reporting

A problem in a released version: open an issue labeled `security`, and the owner releases a
fixed version or rolls back (see RELEASES.md). Do not describe an exploit in a public PR.

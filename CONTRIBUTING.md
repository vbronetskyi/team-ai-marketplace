# Contributing

## Adding or changing a plugin

1. Branch from `main`. One plugin per pull request unless a change has to touch two
   (a dependency bump, for example).
2. Follow [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md): layout, manifest fields,
   namespaced references, dependencies, what must not be in a plugin.
3. Bump `version` in the plugin's `plugin.json` **and** its entry in
   `.claude-plugin/marketplace.json` (they must match), and add a `CHANGELOG.md` entry.
   SemVer rules are in [docs/RELEASES.md](docs/RELEASES.md).
4. Run the checks locally:

   ```bash
   node scripts/validate.mjs            # structure, namespaces, dependencies, secrets, permissions
   claude plugin validate .             # the marketplace manifest
   claude plugin validate plugins/<name>
   claude plugin eval plugins/<name>    # when the plugin has evals/
   ```

5. Open the pull request. CI runs the same validation; CODEOWNERS adds the owners of the
   plugin as reviewers. Security-relevant changes (new tools in an agent, scripts, hooks,
   network access) also need the checklist in [docs/SECURITY.md](docs/SECURITY.md).

## Releasing

After merge, the owner tags the release (`claude plugin tag plugins/<name> --push`) and
records the evidence in `releases/`. See [docs/RELEASES.md](docs/RELEASES.md).

## A new plugin

Copy the shape of an existing plugin, add an entry to `marketplace.json`, an owner line to
`CODEOWNERS`, and a README of at least a paragraph: people decide whether to install from
the catalog page, which is built from the README and the manifests.

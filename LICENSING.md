# Licensing

This page explains how Grimoire is licensed. It is a practical project policy, not legal advice.

Grimoire is an agent-of-agents workspace, a journal, a personal diary, a dream catcher, and a notes app. The license posture follows that shape: the software stays open and inspectable, the human's private vault content stays theirs, and the Grimoire brand cannot be used to confuse people about what is official.

## Software

The Grimoire source code is licensed under the GNU Affero General Public License v3.0 or later: `AGPL-3.0-or-later`.

This includes, unless a file says otherwise:

- the desktop app code
- the Tauri/Rust code
- the TypeScript/React code
- the Markdown editor packages
- the MCP server
- build, test, and release scripts

The AGPL license text is in [LICENSE](LICENSE). The SPDX identifier for package metadata is:

```text
AGPL-3.0-or-later
```

The AGPL is intentional here. If someone modifies Grimoire and offers it over a network, the source for that modified version should remain available to the people using it.

## User Vaults

The Grimoire project license does not apply to a user's own notes, journals, dreams, attachments, imported files, local vaults, or synced vaults.

Those files belong to the user who created or imported them. Opening, editing, syncing, exporting, or analyzing a vault with Grimoire does not grant this project or downstream redistributors any license to that personal content.

## Documentation

Documentation prose in this repository is dual-licensed under:

- `AGPL-3.0-or-later`
- Creative Commons Attribution-ShareAlike 4.0 International (`CC BY-SA 4.0`)

Code blocks and executable snippets in documentation may be used under `AGPL-3.0-or-later`.

## Demo Content

Sample vault content in `demo-vault-v2/` is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (`CC BY-NC-SA 4.0`) unless a file says otherwise.

This keeps the demo useful for learning, screenshots, QA, and non-commercial remixing without turning personal-style sample journals, people notes, and dream-like material into free commercial filler for clones.

## Brand And Assets

The Grimoire name, app icon, logo, wordmark, and related brand assets are not granted under the AGPL, Creative Commons, or demo-content licenses.

See [TRADEMARKS.md](TRADEMARKS.md) for permitted and restricted uses.

Third-party assets keep their own licenses. For example, the bundled Caveat font is licensed under the SIL Open Font License in [assets/fonts/Caveat-OFL.txt](assets/fonts/Caveat-OFL.txt).

## Contributions

Unless agreed otherwise in writing, contributions are accepted under the license that applies to the files being changed:

- code contributions: `AGPL-3.0-or-later`
- documentation prose: `AGPL-3.0-or-later` and `CC BY-SA 4.0`
- demo vault content: `CC BY-NC-SA 4.0`

Contributors must certify that they have the right to submit their work by signing off commits under the Developer Certificate of Origin 1.1:

```text
Signed-off-by: Name <email@example.com>
```

Use `git commit -s` to add the sign-off automatically.

If Grimoire later offers a separate commercial license or closed-source exception, contributions that need to participate in that path may require a separate contributor license agreement before they are accepted.

## References

- AGPLv3: <https://www.gnu.org/licenses/agpl-3.0.html>
- CC BY-SA 4.0: <https://creativecommons.org/licenses/by-sa/4.0/>
- CC BY-NC-SA 4.0: <https://creativecommons.org/licenses/by-nc-sa/4.0/>
- Developer Certificate of Origin: <https://developercertificate.org/>

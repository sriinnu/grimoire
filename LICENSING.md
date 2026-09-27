# Licensing

This page explains how Grimoire is licensed. It is a practical project policy, not legal advice.

Grimoire is a local-first notebook: a journal, a personal diary, a dream catcher, a notes app, and a workspace that agents can read from and propose changes to. The license posture follows that shape: the software is free to use, study, change and ship; the human's private vault content stays theirs; and the Grimoire brand cannot be used to confuse people about what is official.

## Software

The Grimoire source code is licensed under the MIT License. The SPDX identifier for package metadata is:

```text
MIT
```

This includes, unless a file says otherwise:

- the desktop app code
- the Tauri/Rust code
- the TypeScript/React code
- the Markdown editor packages
- the MCP server
- the agent skills
- build, test, and release scripts

The license text is in [LICENSE](LICENSE).

MIT is deliberate. Grimoire runs on your machine against your files; there is no hosted service to protect with a network copyleft. A permissive license lets people embed the editor, the vault model or the MCP server in their own tools without asking, which is the point of building a personal knowledge tool in the open.

## User Vaults

The Grimoire project license does not apply to a user's own notes, journals, dreams, attachments, imported files, local vaults, or synced vaults.

Those files belong to the user who created or imported them. Opening, editing, syncing, exporting, or analyzing a vault with Grimoire does not grant this project or downstream redistributors any license to that personal content.

## Documentation

Documentation prose in this repository is licensed under the MIT License, the same as the code. Code blocks and executable snippets in documentation may be used under the same terms.

## Demo Content

Sample vault content in `demo-vault-v2/` is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (`CC BY-NC-SA 4.0`) unless a file says otherwise.

This keeps the demo useful for learning, screenshots, QA, and non-commercial remixing without turning personal-style sample journals, people notes, and dream-like material into free commercial filler for clones.

## Brand And Assets

The Grimoire name, app icon, logo, wordmark, and related brand assets are not granted under the MIT License, Creative Commons, or demo-content licenses.

See [TRADEMARKS.md](TRADEMARKS.md) for permitted and restricted uses.

Third-party assets keep their own licenses. For example, the bundled Caveat font is licensed under the SIL Open Font License in [assets/fonts/Caveat-OFL.txt](assets/fonts/Caveat-OFL.txt).

## Third-Party Code

Grimoire depends on open source packages under their own licenses, all of them permissive or file-level copyleft (MIT, Apache-2.0, BSD, ISC, MPL-2.0 and similar). Redistributing Grimoire means carrying those notices along; the build keeps them in the dependency manifests.

## Contributions

Unless agreed otherwise in writing, contributions are accepted under the license that applies to the files being changed:

- code and documentation: `MIT`
- demo vault content: `CC BY-NC-SA 4.0`

Contributors must certify that they have the right to submit their work by signing off commits under the Developer Certificate of Origin 1.1:

```text
Signed-off-by: Name <email@example.com>
```

Use `git commit -s` to add the sign-off automatically.

## History

Grimoire was licensed `AGPL-3.0-or-later` until September 2026. All code up to that point was written by the project owner, so the relicense required no third-party consent. Releases published before the change remain available under the AGPL; everything from this point forward is MIT.

## References

- MIT License: <https://opensource.org/license/mit>
- CC BY-NC-SA 4.0: <https://creativecommons.org/licenses/by-nc-sa/4.0/>
- Developer Certificate of Origin: <https://developercertificate.org/>

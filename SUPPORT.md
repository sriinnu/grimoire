# Grimoire Support

Grimoire is public source, but public binary installers and update feeds are not
published yet. For now, support is centered on source evaluation, reproducible
bug reports, and private security reporting.

## Current Support Status

| Area | Status |
| --- | --- |
| Browser source mode | Supported for UI/product-shape review through `pnpm dev`. |
| Native source mode | Supported for source-native local testing through `pnpm tauri dev`. |
| Public binary installers | Not published yet. |
| Stable and alpha update feeds | Not published yet. |
| Private vault recovery | Not supported through public issues. Keep private vault content out of GitHub. |

Before asking for help, check the current release truth in
[README.md](README.md) and [Public Readiness](docs/PUBLIC-READINESS.md).

## Getting Help From Source

Use the [Source Evaluation Playbook](docs/SOURCE-EVALUATION-PLAYBOOK.md) first.
It separates browser source review from native file IO, packaged resources,
installer launch, updater feeds, and platform proof.

For setup problems, include:

- operating system and version
- Grimoire commit SHA or branch
- whether you ran browser source mode or native source mode
- the exact `pnpm doctor:source` command and output
- the command that failed and the relevant error text

Do not paste private vault content, credentials, signing keys, API keys,
personal journals, diary entries, dream notes, or private attachments.

## Bugs

Use GitHub Issues for reproducible bugs:

https://github.com/sriinnu/grimoire/issues/new/choose

Good bug reports include the tested lane:

- Browser source mode (`pnpm dev`) for product shape, managed demo-vault content,
  navigation, editor surfaces, graph/search affordances, and settings copy.
- Native source mode (`pnpm tauri dev`) for real file IO, folder picking, menus,
  platform copy, and Tauri behavior.
- Packaged app / release artifact only when testing a tagged public release
  artifact.

Browser mock behavior is not evidence for native writes, packaged resources,
installer launch, updater feeds, or platform support.

## Feature Requests

Use Canny for product ideas, roadmap requests, and feature voting:

https://grimoire.canny.io/

Please check existing requests before adding a new one.

## Security

Do not open public issues for vulnerabilities. Report security issues privately
as described in [SECURITY.md](SECURITY.md).

## What Is Not Supported Yet

Until release blockers are cleared, support cannot treat these as shipped public
surfaces:

- stable or alpha binary downloads
- stable or alpha update feeds
- notarized/signed public installer support
- packaged Windows, Linux, or macOS launch claims
- updater behavior from a published feed

Run `pnpm audit:public-readiness -- --branch main` for the live readiness
answer before making public support claims.

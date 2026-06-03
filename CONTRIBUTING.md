# Contributing to Grimoire

Thanks for being here! Grimoire is still early, and every bug report, idea, and contribution genuinely helps shape the app.

## 🗳️ Where to share what

To keep things clean:

- 🐛 Bugs → GitHub Issues
- 💡 Feature requests / ideas → Canny • <https://grimoire.canny.io/>
- 🔐 Security issues → private email in [SECURITY.md](SECURITY.md)
- 🧭 General support → [SUPPORT.md](SUPPORT.md)

If you have a feature idea, please check Canny first and upvote it if it already exists.

## 🧪 Before filing a source bug

Grimoire is public source, but public binary installers and update feeds are not
published yet. Please check the current status in [README.md](README.md) and use
the [Source Evaluation Playbook](docs/SOURCE-EVALUATION-PLAYBOOK.md) before
opening a bug from a local run.

When you file a bug, say which lane you tested:

- Browser source mode (`pnpm dev`) for product shape, mock demo-vault content,
  navigation, editor surfaces, graph/search affordances, and settings copy.
- Native source mode (`pnpm tauri dev`) for real file IO, folder picking, menus,
  platform copy, and Tauri behavior.
- Packaged app / release artifact only when you are testing a tagged public
  release artifact.

Do not treat browser mock behavior as evidence for native file writes, packaged
resources, installer launch, updater feeds, or platform support. That distinction
keeps issues actionable instead of turning every report into archaeology.

## 📥 Pull requests are welcome

PRs are very welcome.

A few things to keep in mind before opening one:

- Bug fixes are always great
- Small improvements are great too
- For bigger features, please check Canny first before building
  - Try to avoid things that are already marked **in progress**
  - Requests marked **planned** are usually great contribution targets
- Keep PRs small, focused, and easy to review
- Include a short explanation of the problem and your solution
- Follow the dev process described in Grimoire’s `AGENTS.md` (tests, code health, etc.)
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in project spaces
- Avoid bundling unrelated refactors into the same PR
- Read [LICENSING.md](LICENSING.md) before submitting code, docs, demo vault content, or assets
- Sign off commits with `git commit -s` so the Developer Certificate of Origin line is present
- For source evaluation or release-readiness fixes, include the lane you tested
  and the public-readiness blocker you changed or preserved

If you want to contribute a feature, the best place to start is here: <https://grimoire.canny.io/>

## ✍️ Contribution license

Unless agreed otherwise in writing, contributions are accepted under the license that applies to the files being changed:

- code contributions: AGPL-3.0-or-later
- documentation prose: AGPL-3.0-or-later and CC BY-SA 4.0
- demo vault content: CC BY-NC-SA 4.0

By contributing, you certify that you have the right to submit the work under the [Developer Certificate of Origin 1.1](https://developercertificate.org/). Add this line to every commit:

```text
Signed-off-by: Name <email@example.com>
```

Use `git commit -s` to add it automatically.

Do not include private vault content, credentials, secrets, personal journals, diary entries, or dream notes in a pull request unless the PR is explicitly about a public fixture and the content is safe to publish.

## 📋 What makes a good bug report

If you open a bug report on GitHub, it really helps to include:

- your Grimoire version
- your OS version
- steps to reproduce
- what you expected to happen
- what actually happened
- screenshots or screen recordings if useful

The clearer the report, the easier it is for us to reproduce and fix it.

## 🙏 Thank you

Grimoire is getting better because people care enough to try it, report what’s broken, suggest what’s missing, and contribute improvements.

That means a lot. Thanks for helping build it.

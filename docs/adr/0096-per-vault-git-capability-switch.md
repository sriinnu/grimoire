# ADR 0096: Per-Vault Git Capability Switch

Date: 2026-05-18

## Status

Accepted

## Context

Grimoire already opens local folders that are not Git repositories. The remaining ambiguity was folders that contain `.git`: the app treated Git metadata as permission to run Git features. That is wrong for private/local-first vaults because a folder can have Git history while the user's intent is still "keep this vault local-only inside Grimoire."

## Decision

Git is a per-vault capability stored in the local vault registry through `syncProvider`.

- `syncProvider: git` enables Git-backed app behavior when `.git` metadata exists.
- `syncProvider: none` forces local-only behavior even if `.git` metadata exists.
- Opening a local folder defaults to `syncProvider: none`.
- Cloning a Git repo records `syncProvider: git`.
- Turning Git on for a vault without `.git` initializes a local Git repository, but does not add a remote.

The app's effective `isGitVault` value is now both physical and intentional: `.git` metadata must exist and the vault's sync provider must be Git-enabled.

## Consequences

Local vaults can stay local by policy, not just by accident. AutoGit, status checks, change history, pull, push, conflict tooling, and commit UI are gated behind the effective Git capability. The Settings panel exposes this as "Vault locality" so the user can see and change the choice without filesystem homework.

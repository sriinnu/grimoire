const RELEASE_SECRET_PATTERN = /Release secrets missing: ([^.]+)\./u

function addUnique(actions, action) {
  if (!actions.includes(action)) actions.push(action)
}

/**
 * Converts public-readiness blockers into safe operator next actions.
 * The output names required artifacts and secret names, never secret values.
 */
export function releaseNextActions(blockers) {
  const actions = []

  for (const blocker of blockers) {
    if (/Repository is still private/u.test(blocker)) {
      addUnique(actions, 'Make the GitHub repository public before advertising Grimoire as public source.')
    }
    if (/Repository topics missing:/u.test(blocker)) {
      addUnique(actions, 'Add the missing GitHub repository topics so discovery metadata matches the public-readiness contract.')
    }
    if (/Current branch HEAD does not have a good git signature/u.test(blocker)) {
      addUnique(actions, 'Create or merge a signed commit before rerunning the public-readiness audit.')
    }
    if (/Release secrets missing:/u.test(blocker)) {
      const match = blocker.match(RELEASE_SECRET_PATTERN)
      const names = match?.[1] ?? 'the missing release secrets'
      addUnique(actions, 'Run pnpm release:secrets to print the name-only release-secret handoff before setting values.')
      addUnique(actions, `Set the GitHub repository release secrets: ${names}.`)
    }
    if (/TAURI_SIGNING_PRIVATE_KEY_PASSWORD is absent/u.test(blocker)) {
      addUnique(actions, 'Set TAURI_SIGNING_PRIVATE_KEY_PASSWORD if the updater private key is encrypted.')
    }
    if (/No stable GitHub Release exists/u.test(blocker)) {
      addUnique(actions, 'After release preflight passes, push a signed stable-vYYYY.M.D tag and let the release workflow publish stable assets.')
    }
    if (/No alpha GitHub Release exists/u.test(blocker)) {
      addUnique(actions, 'After release preflight passes, push a signed alpha-vYYYY.M.D.N tag and let the release workflow publish alpha assets.')
    }
    if (/update feed is unavailable|update feed is missing/u.test(blocker)) {
      addUnique(actions, 'Regenerate the stable and alpha Pages updater feeds after release assets upload, then verify them before advertising updates.')
    }
    if (/update feed does not contain updater platforms/u.test(blocker)) {
      addUnique(actions, 'Regenerate the stable and alpha Pages updater feeds so they include signed updater platform payloads.')
    }
    if (/stable release .+ is missing/u.test(blocker)) {
      addUnique(actions, 'Fix the stable GitHub Release assets, then rerun release artifact verification.')
    }
    if (/alpha release .+ is missing/u.test(blocker)) {
      addUnique(actions, 'Fix the alpha GitHub Release assets, then rerun release artifact verification.')
    }
    if (/Latest CI workflow run|No CI workflow run|lacks successful pinned runner jobs/u.test(blocker)) {
      addUnique(actions, 'Rerun or fix hosted CI until the latest audited branch has successful macOS, Linux, and Windows jobs.')
    }
    if (/Working tree is not clean/u.test(blocker)) {
      addUnique(actions, 'Commit or remove local changes before rerunning the public-readiness audit.')
    }
    if (/Starter vault repository is private/u.test(blocker)) {
      addUnique(actions, 'Make the starter vault repository public before claiming the public starter showcase.')
    }
    if (/Starter vault public HEAD could not be resolved/u.test(blocker)) {
      addUnique(actions, 'Publish or restore the public starter vault HEAD and rerun the starter-vault verifier.')
    }
    if (/Starter vault public clone/u.test(blocker)) {
      addUnique(actions, 'Sync demo-vault-v2 with the public starter vault repository and rerun the starter-vault verifier.')
    }
    if (/Packaged starter-vault fallback is not configured/u.test(blocker)) {
      addUnique(actions, 'Configure the packaged starter-vault fallback in tauri.conf.json before building public installers.')
    }
    if (/Bundled starter-vault source mirror is missing/u.test(blocker)) {
      addUnique(actions, 'Restore the bundled starter-vault source mirror from demo-vault-v2 and rerun starter-vault checks.')
    }
    if (/README still advertises a direct Grimoire\.app\.tar\.gz URL/u.test(blocker)) {
      addUnique(actions, 'Remove stale direct binary download links from README until the release workflow publishes verified assets.')
    }
    if (/Public readiness docs (do not clearly say|still say not ready)/u.test(blocker)) {
      addUnique(actions, 'Update PUBLIC-READINESS.md to match the current audit result before changing public install copy.')
    }
  }

  return actions
}

/** Converts a readiness/preflight result into safe operator next actions. */
export function releaseResultNextActions(result) {
  return releaseNextActions([
    ...(result?.blockers ?? []),
    ...(result?.warnings ?? []),
  ])
}

/** Prints next actions when readiness findings are actionable from the repo. */
export function printReleaseNextActions(result, log = console.log) {
  const actions = Array.isArray(result) ? releaseNextActions(result) : releaseResultNextActions(result)
  if (actions.length === 0) return

  log('\nNext actions:')
  for (const action of actions) log(`- ${action}`)
}

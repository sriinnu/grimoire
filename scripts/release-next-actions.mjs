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
    if (/Release secrets missing:/u.test(blocker)) {
      const match = blocker.match(RELEASE_SECRET_PATTERN)
      const names = match?.[1] ?? 'the missing release secrets'
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
      addUnique(actions, 'After release assets upload, verify the generated stable/alpha Pages feeds before advertising updates.')
    }
    if (/Latest CI workflow run|No CI workflow run|lacks successful pinned runner jobs/u.test(blocker)) {
      addUnique(actions, 'Rerun or fix hosted CI until the latest audited branch has successful macOS, Linux, and Windows jobs.')
    }
    if (/Working tree is not clean/u.test(blocker)) {
      addUnique(actions, 'Commit or remove local changes before rerunning the public-readiness audit.')
    }
    if (/Starter vault public clone/u.test(blocker)) {
      addUnique(actions, 'Sync demo-vault-v2 with the public starter vault repository and rerun the starter-vault verifier.')
    }
  }

  return actions
}

/** Prints next actions when readiness blockers are actionable from the repo. */
export function printReleaseNextActions(blockers, log = console.log) {
  const actions = releaseNextActions(blockers)
  if (actions.length === 0) return

  log('\nNext actions:')
  for (const action of actions) log(`- ${action}`)
}

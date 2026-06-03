function addUnique(actions, action) {
  if (!actions.includes(action)) actions.push(action)
}

function failedChecks(result) {
  return [
    ...(result?.browserChecks ?? []),
    ...(result?.nativeChecks ?? []),
  ].filter((check) => !check.ok)
}

/**
 * Converts source setup doctor failures into safe setup next actions.
 */
export function sourceDoctorNextActions(result) {
  const actions = []

  for (const check of failedChecks(result)) {
    if (check.title === 'Node.js') {
      addUnique(actions, 'Install Node.js 20 or newer, then rerun pnpm doctor:source.')
    }
    if (check.title === 'git') {
      addUnique(actions, 'Install Git and make sure git is available on PATH.')
    }
    if (check.title === 'pnpm') {
      addUnique(actions, 'Run corepack enable, then pnpm install, then rerun pnpm doctor:source.')
    }
    if (check.title === 'cargo' || check.title === 'rustc') {
      addUnique(actions, 'Install the stable Rust toolchain, then rerun pnpm doctor:source.')
    }
    if (check.title === 'Xcode command line tools') {
      addUnique(actions, 'Run xcode-select --install, then rerun pnpm doctor:source.')
    }
    if (check.title === 'Linux native dependencies' || check.title.startsWith('pkg-config ')) {
      addUnique(actions, 'Install Linux native dependencies from docs/GETTING-STARTED.md, then rerun pnpm doctor:source.')
    }
    if (check.title === 'Windows Rust MSVC host') {
      addUnique(actions, 'Install Rust with the stable MSVC toolchain, then rerun pnpm doctor:source.')
    }
    if (check.title === 'Microsoft C++ Build Tools') {
      addUnique(actions, 'Install Microsoft C++ Build Tools with the Desktop development with C++ workload.')
    }
    if (check.title === 'Windows WebView2 runtime') {
      addUnique(actions, 'Install or repair the evergreen WebView2 runtime if the Tauri window does not open.')
    }
  }

  return actions
}

/** Prints source setup next actions when the doctor finds failed checks. */
export function printSourceDoctorNextActions(result, log = console.log) {
  const actions = sourceDoctorNextActions(result)
  if (actions.length === 0) return

  log('\nNext actions:')
  for (const action of actions) log(`- ${action}`)
}

#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const APP_PATH = '/Applications/Grimoire.app'

if (!existsSync(APP_PATH)) {
  throw new Error(`Grimoire is not installed at ${APP_PATH}. Run pnpm macos:install-built-app first.`)
}

// Deliberately omit `-n`: Grimoire is one canonical app process, never a
// second source of notebook state.
execFileSync('open', [APP_PATH], { stdio: 'inherit' })

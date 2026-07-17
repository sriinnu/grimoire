import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT_PATH = 'apps/apple/GrimoireApple.xcodeproj'
const BUILD_ARGUMENTS = [
  '-quiet',
  '-project', PROJECT_PATH,
  '-scheme', 'Grimoire',
  '-destination', 'platform=macOS',
  'CODE_SIGNING_ALLOWED=NO',
]

function runXcode(arguments_) {
  return execFileSync('xcodebuild', arguments_, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

function buildSetting(settings, key) {
  const match = settings.match(new RegExp(`^\\s*${key} = (.+)$`, 'm'))
  if (!match) throw new Error(`xcodebuild did not report ${key}.`)
  return match[1].trim()
}

console.log('Building native Grimoire for macOS…')
runXcode([...BUILD_ARGUMENTS, 'build'])

const settings = runXcode([...BUILD_ARGUMENTS, '-showBuildSettings'])
const appPath = resolve(
  buildSetting(settings, 'TARGET_BUILD_DIR'),
  buildSetting(settings, 'WRAPPER_NAME'),
)

if (!existsSync(appPath)) {
  throw new Error(`Native build completed but no app bundle was found at ${appPath}.`)
}

// `-n` keeps this SwiftUI build separate from a same-named installed Tauri app.
execFileSync('open', ['-n', appPath], { stdio: 'inherit' })
console.log(`Opened native macOS Grimoire: ${appPath}`)

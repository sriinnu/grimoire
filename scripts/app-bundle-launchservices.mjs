import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function plistHasKey(plistPath, key) {
  const result = spawnSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plistPath], {
    stdio: 'ignore',
  })
  return result.status === 0
}

function plistAdd(plistPath, command) {
  spawnSync('/usr/libexec/PlistBuddy', ['-c', command, plistPath], {
    stdio: 'ignore',
  })
}

/** Stamps compatibility metadata that LaunchServices expects on local macOS bundles. */
export function stampMacOsLaunchServicesMetadata(appPath) {
  if (process.platform !== 'darwin') return

  const plistPath = resolve(appPath, 'Contents/Info.plist')
  if (!existsSync(plistPath)) return

  writeFileSync(resolve(appPath, 'Contents/PkgInfo'), 'APPL????')

  if (!plistHasKey(plistPath, 'CFBundleSupportedPlatforms')) {
    plistAdd(plistPath, 'Add :CFBundleSupportedPlatforms array')
    plistAdd(plistPath, 'Add :CFBundleSupportedPlatforms:0 string MacOSX')
  }

  if (!plistHasKey(plistPath, 'CFBundleDevelopmentRegion')) {
    plistAdd(plistPath, 'Add :CFBundleDevelopmentRegion string en')
  }
}

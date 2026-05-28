import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function readPlistValue(plistPath, key) {
  const content = readFileSync(plistPath, 'utf8')
  const match = new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`).exec(content)
  return match?.[1] ?? null
}

/** Verifies the short and bundle versions in a macOS app Info.plist. */
export function assertAppBundleVersion(appPath, expectedVersion) {
  const resolvedAppPath = resolve(appPath)
  const plistPath = join(resolvedAppPath, 'Contents/Info.plist')
  if (!existsSync(plistPath)) {
    throw new Error(`Missing app Info.plist: ${plistPath}`)
  }

  const shortVersion = readPlistValue(plistPath, 'CFBundleShortVersionString')
  const bundleVersion = readPlistValue(plistPath, 'CFBundleVersion')
  if (shortVersion !== expectedVersion) {
    throw new Error(`Expected CFBundleShortVersionString ${expectedVersion}, found ${shortVersion ?? 'missing'}`)
  }
  if (bundleVersion !== expectedVersion) {
    throw new Error(`Expected CFBundleVersion ${expectedVersion}, found ${bundleVersion ?? 'missing'}`)
  }
}

/** Writes a minimal test Info.plist for script self-tests. */
export function writeTestAppInfoPlist(appPath, version, { includeBundleVersion = true } = {}) {
  const contents = join(appPath, 'Contents')
  mkdirSync(contents, { recursive: true })
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0">',
    '<dict>',
    '<key>CFBundleShortVersionString</key>',
    `<string>${version}</string>`,
  ]
  if (includeBundleVersion) {
    lines.push('<key>CFBundleVersion</key>', `<string>${version}</string>`)
  }
  lines.push('</dict>', '</plist>', '')
  writeFileSync(join(contents, 'Info.plist'), lines.join('\n'))
}

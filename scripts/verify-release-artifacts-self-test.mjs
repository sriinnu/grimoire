import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeTestAppInfoPlist } from './app-bundle-version.mjs'
import {
  SOURCE_ICON_PATH,
  run,
  verifyApp,
  verifyBundleDirectory,
  verifyGenericArtifact,
  verifyUpdater,
  verifyWebBuild,
} from './verify-release-artifacts.mjs'

function copySourceIconToApp(appPath) {
  const resources = join(appPath, 'Contents/Resources')
  mkdirSync(resources, { recursive: true })
  cpSync(SOURCE_ICON_PATH, join(resources, 'icon.icns'))
}

function addExecutableToTestApp(appPath) {
  const contents = join(appPath, 'Contents')
  const plistPath = join(contents, 'Info.plist')
  const executableName = 'grimoire'
  const plist = readFileSync(plistPath, 'utf8').replace(
    '</dict>',
    [
      '<key>CFBundleExecutable</key>',
      `<string>${executableName}</string>`,
      '</dict>',
    ].join('\n'),
  )
  writeFileSync(plistPath, plist)

  const macosDir = join(contents, 'MacOS')
  mkdirSync(macosDir, { recursive: true })
  const executablePath = join(macosDir, executableName)
  writeFileSync(executablePath, '#!/bin/sh\nexit 0\n')
  chmodSync(executablePath, 0o755)
}

function addRequiredResourcesToTestApp(appPath) {
  const resources = join(appPath, 'Contents/Resources')
  const starterVault = join(resources, 'starter-vault')
  const mcpServer = join(resources, 'mcp-server')
  mkdirSync(join(starterVault, 'type'), { recursive: true })
  mkdirSync(join(starterVault, 'views'), { recursive: true })
  mkdirSync(join(starterVault, 'attachments'), { recursive: true })
  mkdirSync(mcpServer, { recursive: true })
  writeFileSync(join(starterVault, '.fixture-manifest.json'), '{"files":[]}')
  writeFileSync(join(starterVault, 'grimoire-start-here.md'), '# Start here\n')
  writeFileSync(join(starterVault, 'type/project.md'), '# Project type\n')
  writeFileSync(join(starterVault, 'views/active-projects.yml'), 'title: Active Projects\n')
  writeFileSync(join(starterVault, 'attachments/grimoire-reference.png'), 'fake png bytes\n')
  writeFileSync(join(mcpServer, 'index.js'), 'console.log("mcp")\n')
  writeFileSync(join(mcpServer, 'ws-bridge.js'), 'console.log("bridge")\n')
  writeFileSync(join(mcpServer, 'package.json'), '{"name":"grimoire-mcp"}')
}

function writeCrossPlatformBundle(root) {
  mkdirSync(join(root, 'msi'), { recursive: true })
  mkdirSync(join(root, 'nsis'), { recursive: true })
  mkdirSync(join(root, 'appimage'), { recursive: true })
  mkdirSync(join(root, 'deb'), { recursive: true })
  mkdirSync(join(root, 'rpm'), { recursive: true })
  writeFileSync(join(root, 'msi/Grimoire_9.9.9_x64_en-US.msi'), 'clean windows msi')
  writeFileSync(join(root, 'nsis/Grimoire_9.9.9_x64-setup.exe'), 'clean windows exe')
  writeFileSync(join(root, 'appimage/grimoire_9.9.9_amd64.AppImage'), 'clean linux appimage')
  writeFileSync(join(root, 'deb/grimoire_9.9.9_amd64.deb'), 'clean linux deb')
  writeFileSync(join(root, 'rpm/grimoire-9.9.9.x86_64.rpm'), 'clean linux rpm')
}

function expectFailure(label, action) {
  let failedAsExpected = false
  try {
    action()
  } catch {
    failedAsExpected = true
  }
  if (!failedAsExpected) throw new Error(`Self-test did not reject ${label}`)
}

export function runReleaseArtifactSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-artifacts-test-'))
  try {
    const appPath = join(tempDir, 'Grimoire.app')
    copySourceIconToApp(appPath)
    writeTestAppInfoPlist(appPath, '9.9.9')
    addExecutableToTestApp(appPath)
    addRequiredResourcesToTestApp(appPath)
    verifyApp(appPath, { expectedVersion: '9.9.9' })

    const missingResourcesAppPath = join(tempDir, 'MissingResources.app')
    copySourceIconToApp(missingResourcesAppPath)
    writeTestAppInfoPlist(missingResourcesAppPath, '9.9.9')
    addExecutableToTestApp(missingResourcesAppPath)
    expectFailure('missing packaged resources', () => verifyApp(missingResourcesAppPath))

    const webDir = join(tempDir, 'web')
    mkdirSync(webDir, { recursive: true })
    writeFileSync(join(webDir, 'index.js'), 'console.log("clean")')
    verifyWebBuild(webDir)

    const tarballPath = join(tempDir, 'Grimoire.app.tar.gz')
    run('tar', ['-czf', tarballPath, '-C', tempDir, 'Grimoire.app'])
    verifyUpdater(tarballPath)

    const crossPlatformBundleDir = join(tempDir, 'cross-platform-bundle')
    writeCrossPlatformBundle(crossPlatformBundleDir)
    verifyBundleDirectory(crossPlatformBundleDir)

    const staleAppPath = join(tempDir, 'Stale.app')
    copySourceIconToApp(staleAppPath)
    writeTestAppInfoPlist(staleAppPath, '9.9.9')
    addExecutableToTestApp(staleAppPath)
    writeFileSync(join(staleAppPath, 'Contents/Resources/icon.icns'), 'stale')
    expectFailure('a stale app icon', () => verifyApp(staleAppPath))

    const staleVersionAppPath = join(tempDir, 'StaleVersion.app')
    copySourceIconToApp(staleVersionAppPath)
    writeTestAppInfoPlist(staleVersionAppPath, '9.9.8')
    addExecutableToTestApp(staleVersionAppPath)
    addRequiredResourcesToTestApp(staleVersionAppPath)
    expectFailure('a stale app version', () => verifyApp(staleVersionAppPath, { expectedVersion: '9.9.9' }))

    const carbonAppPath = join(tempDir, 'Carbon.app')
    copySourceIconToApp(carbonAppPath)
    writeTestAppInfoPlist(carbonAppPath, '9.9.9')
    addExecutableToTestApp(carbonAppPath)
    const carbonPlistPath = join(carbonAppPath, 'Contents/Info.plist')
    writeFileSync(
      carbonPlistPath,
      readFileSync(carbonPlistPath, 'utf8').replace('</dict>', '<key>LSRequiresCarbon</key>\n<true/>\n</dict>'),
    )
    expectFailure('LSRequiresCarbon', () => verifyApp(carbonAppPath, { expectedVersion: '9.9.9' }))

    const leakingWebDir = join(tempDir, 'leaking-web')
    mkdirSync(leakingWebDir, { recursive: true })
    writeFileSync(join(leakingWebDir, 'asset.js'), 'const path = "/Users/mock/demo-vault-v2"')
    expectFailure('mock fixture strings', () => verifyWebBuild(leakingWebDir))

    const leakingInstallerPath = join(tempDir, 'Grimoire_9.9.9_x64_en-US.msi')
    writeFileSync(leakingInstallerPath, 'const path = "/Users/mock/demo-vault-v2"')
    expectFailure('mock fixture strings inside installers', () => verifyGenericArtifact(leakingInstallerPath, 'Windows installer'))

    console.log('self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

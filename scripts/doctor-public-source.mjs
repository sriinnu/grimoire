#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const MIN_NODE_MAJOR = 20
const MIN_PNPM_MAJOR = 10
const REQUIRED_BROWSER_TOOLS = ['git']
const REQUIRED_NATIVE_TOOLS = ['cargo', 'rustc']
const LINUX_NATIVE_PKG_CONFIG_CHECKS = [
  { label: 'GTK 3', packages: ['gtk+-3.0'] },
  { label: 'JavaScriptCoreGTK 4.1', packages: ['javascriptcoregtk-4.1'] },
  { label: 'libsoup 3', packages: ['libsoup-3.0'] },
  { label: 'WebKitGTK 4.1', packages: ['webkit2gtk-4.1'] },
  { label: 'libxdo/xdo', packages: ['libxdo', 'xdo'] },
  { label: 'OpenSSL', packages: ['openssl'] },
  { label: 'librsvg', packages: ['librsvg-2.0'] },
  { label: 'AppIndicator/Ayatana AppIndicator', packages: ['ayatana-appindicator3-0.1', 'appindicator3-0.1'] },
]

function parseArgs(argv) {
  return {
    selfTest: argv.includes('--self-test'),
  }
}

function run(command, args = []) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: 'pipe',
  })

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
    status: result.status,
  }
}

function commandVersion(command, args = ['--version']) {
  const result = run(command, args)
  return result.ok ? result.output.split(/\r?\n/)[0] ?? '' : null
}

function commandOutput(command, args = []) {
  const result = run(command, args)
  return result.ok ? result.output : null
}

function hasCommand(command) {
  return run(command, ['--version']).ok
}

function contextCommand(context, command) {
  if (Object.hasOwn(context.commands ?? {}, command)) return context.commands[command]
  return undefined
}

function readPackageManager() {
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  return String(packageJson.packageManager ?? '')
}

function nodeMajor(version = process.versions.node) {
  return Number.parseInt(version.split('.')[0] ?? '0', 10)
}

function versionMajor(version) {
  return Number.parseInt(String(version).match(/\d+/u)?.[0] ?? '0', 10)
}

function checkCoreTools(context = {}) {
  const checks = []
  const nodeVersion = context.nodeVersion ?? process.versions.node
  const packageManager = context.packageManager ?? readPackageManager()
  const expectedPnpm = packageManager.match(/^pnpm@(.+)$/u)?.[1] ?? null

  checks.push({
    detail: `found ${nodeVersion}; required >=${MIN_NODE_MAJOR}`,
    ok: nodeMajor(nodeVersion) >= MIN_NODE_MAJOR,
    title: 'Node.js',
  })

  for (const command of REQUIRED_BROWSER_TOOLS) {
    const configured = contextCommand(context, command)
    const version = configured === undefined ? commandVersion(command) : configured
    checks.push({
      detail: version ?? `${command} was not found on PATH`,
      ok: Boolean(version),
      title: command,
    })
  }

  const configuredPnpm = contextCommand(context, 'pnpm')
  const pnpmVersion = configuredPnpm === undefined ? commandVersion('pnpm') : configuredPnpm
  const pnpmMajor = pnpmVersion ? versionMajor(pnpmVersion) : 0
  checks.push({
    detail: pnpmVersion
      ? `${pnpmVersion}${expectedPnpm ? `; packageManager expects pnpm ${expectedPnpm}` : ''}; required >=${MIN_PNPM_MAJOR}`
      : 'pnpm was not found; run corepack enable, then pnpm install',
    ok: Boolean(pnpmVersion) && pnpmMajor >= MIN_PNPM_MAJOR,
    title: 'pnpm',
  })

  return checks
}

function checkNativeTools(context = {}) {
  const checks = []
  for (const command of REQUIRED_NATIVE_TOOLS) {
    const configured = contextCommand(context, command)
    const version = configured === undefined ? commandVersion(command) : configured
    checks.push({
      detail: version ?? `${command} was not found on PATH`,
      ok: Boolean(version),
      title: command,
    })
  }

  return checks
}

function checkLinuxPackages(context = {}) {
  if ((context.platform ?? platform()) !== 'linux') return []

  const configuredPkgConfig = contextCommand(context, 'pkg-config')
  const hasPkgConfig = configuredPkgConfig === undefined
    ? hasCommand('pkg-config') ? 'pkg-config available' : null
    : configuredPkgConfig
  if (!hasPkgConfig) {
    return [{
      detail: 'pkg-config was not found; install the Linux dependencies listed in docs/GETTING-STARTED.md',
      ok: false,
      title: 'Linux native dependencies',
    }]
  }

  return LINUX_NATIVE_PKG_CONFIG_CHECKS.map((dependency) => {
    const foundPackage = dependency.packages.find((name) => (
      context.pkgConfig?.[name] ?? run('pkg-config', ['--exists', name]).ok
    ))
    const names = dependency.packages.join(' or ')
    return {
      detail: foundPackage ? `${foundPackage} found` : `${names} missing`,
      ok: Boolean(foundPackage),
      title: `pkg-config ${dependency.label}`,
    }
  })
}

function checkMacNative(context = {}) {
  if ((context.platform ?? platform()) !== 'darwin') return []
  const configured = contextCommand(context, 'xcode-select')
  const xcodeSelect = configured === undefined ? commandVersion('xcode-select', ['-p']) : configured
  return [{
    detail: xcodeSelect ?? 'Xcode command line tools were not found; run xcode-select --install',
    ok: Boolean(xcodeSelect),
    title: 'Xcode command line tools',
  }]
}

function windowsToolFound(command, context = {}) {
  const configured = context.commands?.[command]
  if (configured !== undefined) return Boolean(configured)
  return run('where', [command]).ok
}

function windowsRustHost(context = {}) {
  const configured = context.commands?.['rustc -vV']
  if (configured !== undefined) return configured
  return commandOutput('rustc', ['-vV'])
}

function windowsWebView2Found(context = {}) {
  if (context.webview2Runtime !== undefined) return Boolean(context.webview2Runtime)
  const programFiles = [
    process.env['ProgramFiles(x86)'],
    process.env.ProgramFiles,
  ].filter(Boolean)
  return programFiles.some((root) => existsSync(resolve(root, 'Microsoft/EdgeWebView/Application')))
}

function checkWindowsNative(context = {}) {
  if ((context.platform ?? platform()) !== 'win32') return []
  const rustHost = windowsRustHost(context)
  return [
    {
      detail: rustHost
        ? rustHost.includes('pc-windows-msvc')
          ? 'Rust host targets MSVC'
          : `found non-MSVC Rust host: ${rustHost.split(/\r?\n/u).find((line) => line.startsWith('host:')) ?? rustHost}`
        : 'rustc -vV did not report a Windows MSVC host; install Rust with the stable MSVC toolchain',
      ok: Boolean(rustHost?.includes('pc-windows-msvc')),
      title: 'Windows Rust MSVC host',
    },
    {
      detail: windowsToolFound('cl', context)
        ? 'cl.exe found on PATH'
        : 'cl.exe was not found; install Microsoft C++ Build Tools with the Desktop development with C++ workload',
      ok: windowsToolFound('cl', context),
      title: 'Microsoft C++ Build Tools',
    },
    {
      detail: windowsWebView2Found(context)
        ? 'WebView2 runtime found'
        : 'WebView2 runtime was not detected; install the evergreen WebView2 runtime if Tauri cannot open a window',
      ok: windowsWebView2Found(context),
      title: 'Windows WebView2 runtime',
      warning: true,
    },
  ]
}

function summarize(checks) {
  const blockers = checks.filter((check) => !check.ok && !check.warning)
  const warnings = checks.filter((check) => check.warning && !check.ok)
  return { blockers, ok: blockers.length === 0, warnings }
}

function printGroup(title, checks) {
  console.log(`\n${title}`)
  for (const check of checks) {
    const marker = markerForCheck(check)
    console.log(`  [${marker}] ${check.title}: ${check.detail}`)
  }
}

function markerForCheck(check) {
  if (check.warning) return check.ok ? 'ok' : '!'
  return check.ok ? 'ok' : 'x'
}

function runDoctor(context = {}) {
  const browserChecks = checkCoreTools(context)
  const nativeChecks = [
    ...checkNativeTools(context),
    ...checkMacNative(context),
    ...checkLinuxPackages(context),
    ...checkWindowsNative(context),
  ]
  const browser = summarize(browserChecks)
  const native = summarize(nativeChecks)

  return { browser, browserChecks, native, nativeChecks }
}

function printReport(result) {
  printGroup('Browser source mode', result.browserChecks)
  printGroup('Native Tauri mode', result.nativeChecks)
  console.log(`\nBrowser mode: ${result.browser.ok ? 'ready' : 'blocked'}`)
  console.log(`Native mode: ${result.native.ok ? 'ready' : 'blocked'}`)
}

function runSelfTest() {
  const ready = runDoctor({
    commands: {
      cargo: 'cargo 1.90.0',
      git: 'git version 2.50.0',
      pnpm: '10.33.0',
      rustc: 'rustc 1.90.0',
      'xcode-select': '/Applications/Xcode.app/Contents/Developer',
    },
    nodeVersion: '20.19.0',
    packageManager: 'pnpm@10.33.0',
    platform: 'darwin',
  })
  if (!ready.browser.ok || !ready.native.ok) throw new Error('ready fixture should pass')

  const blocked = runDoctor({
    commands: { git: null, pnpm: null, cargo: null, rustc: null, 'pkg-config': 'pkg-config available' },
    nodeVersion: '18.0.0',
    packageManager: 'pnpm@10.33.0',
    pkgConfig: Object.fromEntries(
      LINUX_NATIVE_PKG_CONFIG_CHECKS.flatMap((dependency) => dependency.packages.map((name) => [name, false])),
    ),
    platform: 'linux',
  })
  if (blocked.browser.ok || blocked.native.ok) throw new Error('blocked fixture should fail both modes')

  const oldPnpm = runDoctor({
    commands: { cargo: 'cargo 1.90.0', git: 'git version 2.50.0', pnpm: '9.15.9', rustc: 'rustc 1.90.0' },
    nodeVersion: '20.19.0',
    packageManager: 'pnpm@10.33.0',
    platform: 'darwin',
  })
  if (oldPnpm.browser.ok !== false) throw new Error('pnpm below 10 should block browser source mode')

  const linuxReady = runDoctor({
    commands: {
      cargo: 'cargo 1.90.0',
      git: 'git version 2.50.0',
      pnpm: '10.33.0',
      rustc: 'rustc 1.90.0',
      'pkg-config': 'pkg-config available',
    },
    nodeVersion: '20.19.0',
    packageManager: 'pnpm@10.33.0',
    pkgConfig: {
      'appindicator3-0.1': true,
      'gtk+-3.0': true,
      'javascriptcoregtk-4.1': true,
      libxdo: true,
      'librsvg-2.0': true,
      'libsoup-3.0': true,
      openssl: true,
      'webkit2gtk-4.1': true,
    },
    platform: 'linux',
  })
  if (!linuxReady.browser.ok || !linuxReady.native.ok) throw new Error('Linux ready fixture should pass')

  const windowsReady = runDoctor({
    commands: {
      cargo: 'cargo 1.90.0',
      cl: 'C:\\BuildTools\\VC\\Tools\\MSVC\\cl.exe',
      git: 'git version 2.50.0',
      pnpm: '10.33.0',
      rustc: 'rustc 1.90.0',
      'rustc -vV': 'rustc 1.90.0\nhost: x86_64-pc-windows-msvc',
    },
    nodeVersion: '20.19.0',
    packageManager: 'pnpm@10.33.0',
    platform: 'win32',
    webview2Runtime: true,
  })
  if (!windowsReady.browser.ok || !windowsReady.native.ok) {
    throw new Error('Windows ready fixture should pass')
  }

  const windowsBlocked = runDoctor({
    commands: {
      cargo: 'cargo 1.90.0',
      cl: null,
      git: 'git version 2.50.0',
      pnpm: '10.33.0',
      rustc: 'rustc 1.90.0',
      'rustc -vV': 'rustc 1.90.0\nhost: x86_64-pc-windows-gnu',
    },
    nodeVersion: '20.19.0',
    packageManager: 'pnpm@10.33.0',
    platform: 'win32',
    webview2Runtime: false,
  })
  if (windowsBlocked.browser.ok !== true || windowsBlocked.native.ok !== false) {
    throw new Error('Windows blocked fixture should fail native mode only')
  }
  if (markerForCheck({ ok: false, warning: true }) !== '!') {
    throw new Error('warning-only checks should not render as hard failures')
  }
  if (summarize([{ ok: true, warning: true }]).warnings.length !== 0) {
    throw new Error('passing warning checks should not be reported as warnings')
  }
  if (markerForCheck({ ok: false }) !== 'x') throw new Error('failed checks should render as hard failures')

  console.log('[source-doctor] self-test ok')
}

const args = parseArgs(process.argv.slice(2))
if (args.selfTest) {
  runSelfTest()
} else {
  const result = runDoctor()
  printReport(result)
  if (!result.browser.ok || !result.native.ok) process.exit(1)
}

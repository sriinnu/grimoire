#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { platform } from 'node:os'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const MIN_NODE_MAJOR = 20
const REQUIRED_BROWSER_TOOLS = ['git']
const REQUIRED_NATIVE_TOOLS = ['cargo', 'rustc']
const LINUX_NATIVE_PACKAGES = [
  'gtk+-3.0',
  'javascriptcoregtk-4.1',
  'libsoup-3.0',
  'webkit2gtk-4.1',
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

function hasCommand(command) {
  return run(command, ['--version']).ok
}

function readPackageManager() {
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  return String(packageJson.packageManager ?? '')
}

function nodeMajor(version = process.versions.node) {
  return Number.parseInt(version.split('.')[0] ?? '0', 10)
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
    const version = context.commands?.[command] ?? commandVersion(command)
    checks.push({
      detail: version ?? `${command} was not found on PATH`,
      ok: Boolean(version),
      title: command,
    })
  }

  const pnpmVersion = context.commands?.pnpm ?? commandVersion('pnpm')
  checks.push({
    detail: pnpmVersion
      ? `${pnpmVersion}${expectedPnpm ? `; packageManager expects pnpm ${expectedPnpm}` : ''}`
      : 'pnpm was not found; run corepack enable, then pnpm install',
    ok: Boolean(pnpmVersion),
    title: 'pnpm',
  })

  return checks
}

function checkNativeTools(context = {}) {
  const checks = []
  for (const command of REQUIRED_NATIVE_TOOLS) {
    const version = context.commands?.[command] ?? commandVersion(command)
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

  const hasPkgConfig = context.commands?.['pkg-config'] ?? (hasCommand('pkg-config') ? 'pkg-config available' : null)
  if (!hasPkgConfig) {
    return [{
      detail: 'pkg-config was not found; install the Linux dependencies listed in docs/GETTING-STARTED.md',
      ok: false,
      title: 'Linux native dependencies',
    }]
  }

  return LINUX_NATIVE_PACKAGES.map((name) => {
    const present = context.pkgConfig?.[name] ?? run('pkg-config', ['--exists', name]).ok
    return {
      detail: present ? `${name} found` : `${name} missing`,
      ok: Boolean(present),
      title: `pkg-config ${name}`,
    }
  })
}

function checkMacNative(context = {}) {
  if ((context.platform ?? platform()) !== 'darwin') return []
  const xcodeSelect = context.commands?.['xcode-select'] ?? commandVersion('xcode-select', ['-p'])
  return [{
    detail: xcodeSelect ?? 'Xcode command line tools were not found; run xcode-select --install',
    ok: Boolean(xcodeSelect),
    title: 'Xcode command line tools',
  }]
}

function checkWindowsNative(context = {}) {
  if ((context.platform ?? platform()) !== 'win32') return []
  return [{
    detail: 'WebView2 is required by Tauri on Windows; the runtime is normally present on supported Windows 10/11 installs',
    ok: true,
    title: 'Windows WebView2 note',
    warning: true,
  }]
}

function summarize(checks) {
  const blockers = checks.filter((check) => !check.ok && !check.warning)
  const warnings = checks.filter((check) => check.warning)
  return { blockers, ok: blockers.length === 0, warnings }
}

function printGroup(title, checks) {
  console.log(`\n${title}`)
  for (const check of checks) {
    const marker = check.ok ? check.warning ? '!' : 'ok' : 'x'
    console.log(`  [${marker}] ${check.title}: ${check.detail}`)
  }
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
    pkgConfig: Object.fromEntries(LINUX_NATIVE_PACKAGES.map((name) => [name, false])),
    platform: 'linux',
  })
  if (blocked.browser.ok || blocked.native.ok) throw new Error('blocked fixture should fail both modes')

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

#!/usr/bin/env node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const SRC_ROOT = 'src-tauri/src'

const MACOS_ONLY_RULES = [
  {
    label: 'menu_bar module access',
    pattern: /\b(?:crate::)?menu_bar(?:::|;)/u,
    allowedFiles: new Set(['src-tauri/src/menu_bar.rs']),
  },
  {
    label: 'tauri::RunEvent::Reopen',
    pattern: /\btauri::RunEvent::Reopen\b/u,
    allowedFiles: new Set(),
  },
]

const REQUIRED_FALLBACKS = [
  {
    path: 'src-tauri/src/lib.rs',
    label: 'non-macOS run-event fallback',
    snippet: '#[cfg(all(desktop, not(target_os = "macos")))]\nfn handle_platform_run_event',
  },
  {
    path: 'src-tauri/src/commands/settings_cmds.rs',
    label: 'non-macOS menu bar settings fallback',
    snippet: '#[cfg(not(all(desktop, target_os = "macos")))]\nfn apply_menu_bar_icon_setting_after_save',
  },
]

function stripLineComment(line) {
  return line.split('//')[0]
}

function isMacosCfgLine(line) {
  return /#\s*\[\s*cfg\s*\([^)\]]*target_os\s*=\s*"macos"/u.test(line)
}

function hasImmediateMacosCfg(lines, lineIndex) {
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    const line = stripLineComment(lines[index]).trim()
    if (line.length === 0) continue
    if (isMacosCfgLine(line)) return true
    if (line.startsWith('#[')) continue
    return false
  }
  return false
}

function findEnclosingFunctionIndex(lines, lineIndex) {
  for (let index = lineIndex; index >= 0; index -= 1) {
    const line = stripLineComment(lines[index]).trim()
    if (/^(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?fn\s+\w+/u.test(line)) return index
  }
  return null
}

function hasEnclosingMacosCfgBlock(lines, lineIndex) {
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    if (!isMacosCfgLine(stripLineComment(lines[index]))) continue
    const blockStart = nextMeaningfulLineIndex(lines, index + 1)
    if (blockStart === null || stripLineComment(lines[blockStart]).trim() !== '{') continue
    if (blockContainsLine(lines, blockStart, lineIndex)) return true
  }
  return false
}

function nextMeaningfulLineIndex(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = stripLineComment(lines[index]).trim()
    if (line.length > 0) return index
  }
  return null
}

function blockContainsLine(lines, blockStart, lineIndex) {
  let depth = 0
  for (let index = blockStart; index <= lineIndex; index += 1) {
    const line = stripLineComment(lines[index])
    depth += countOccurrences(line, '{')
    depth -= countOccurrences(line, '}')
    if (index < lineIndex && depth <= 0) return false
  }
  return depth > 0
}

function countOccurrences(value, needle) {
  return value.split(needle).length - 1
}

function normalizeNewlines(value) {
  return value.replace(/\r\n?/gu, '\n')
}

function hasMacosCfgContext(lines, lineIndex) {
  if (hasImmediateMacosCfg(lines, lineIndex)) return true
  if (hasEnclosingMacosCfgBlock(lines, lineIndex)) return true
  const functionIndex = findEnclosingFunctionIndex(lines, lineIndex)
  return functionIndex !== null && hasImmediateMacosCfg(lines, functionIndex)
}

function collectRustFiles(root) {
  const sourceRoot = resolve(root, SRC_ROOT)
  const files = []
  walk(sourceRoot, files)
  return files.sort()
}

function walk(path, files) {
  if (!existsSync(path)) return
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name)
    if (entry.isDirectory()) {
      walk(child, files)
    } else if (entry.isFile() && extname(entry.name) === '.rs') {
      files.push(child)
    }
  }
}

function relativePath(path, root = REPO_ROOT) {
  return relative(root, path).replaceAll('\\', '/')
}

export function verifyRustPlatformGuards(root = REPO_ROOT) {
  const issues = []
  for (const file of collectRustFiles(root)) {
    const repoPath = relativePath(file, root)
    const lines = readFileSync(file, 'utf8').split(/\r?\n/u)
    for (let index = 0; index < lines.length; index += 1) {
      const line = stripLineComment(lines[index])
      for (const rule of MACOS_ONLY_RULES) {
        if (!rule.pattern.test(line)) continue
        if (rule.allowedFiles.has(repoPath)) continue
        if (hasMacosCfgContext(lines, index)) continue
        issues.push(`${repoPath}:${index + 1} uses ${rule.label} outside a macOS cfg guard`)
      }
    }
  }

  for (const fallback of REQUIRED_FALLBACKS) {
    const content = normalizeNewlines(readFileSync(resolve(root, fallback.path), 'utf8'))
    if (!content.includes(fallback.snippet)) {
      issues.push(`${fallback.path} is missing ${fallback.label}`)
    }
  }

  return { ok: issues.length === 0, issues }
}

function assertIssue(name, result, expectedText) {
  if (result.issues.some((issue) => issue.includes(expectedText))) return
  throw new Error(`${name} expected issue containing "${expectedText}", got:\n${result.issues.join('\n')}`)
}

function assertOk(name, result) {
  if (result.ok) return
  throw new Error(`${name} expected ok, got:\n${result.issues.join('\n')}`)
}

function writeFixture(root, path, content) {
  const target = resolve(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

function commonFallbackFixture() {
  return [
    '#[cfg(all(desktop, not(target_os = "macos")))]',
    'fn handle_platform_run_event(_app_handle: &tauri::AppHandle, _event: &tauri::RunEvent) {}',
  ].join('\n')
}

function settingsFallbackFixture() {
  return [
    '#[cfg(not(all(desktop, target_os = "macos")))]',
    'fn apply_menu_bar_icon_setting_after_save(_app_handle: &tauri::AppHandle, _menu_bar_enabled: bool) {}',
  ].join('\n')
}

function runSelfTest() {
  const root = mkdtempSync(join(tmpdir(), 'grimoire-rust-platform-guards-'))
  try {
    writeFixture(root, 'src-tauri/src/commands/settings_cmds.rs', settingsFallbackFixture())
    writeFixture(root, 'src-tauri/src/menu_bar.rs', 'pub fn setup_menu_bar_icon() {}\n')
    writeFixture(root, 'src-tauri/src/lib.rs', [
      '#[cfg(all(desktop, target_os = "macos"))]',
      'pub mod menu_bar;',
      'fn show_main_window() {',
      '  #[cfg(target_os = "macos")]',
      '  {',
      '    crate::menu_bar::show_main_window(app_handle);',
      '  }',
      '}',
      '#[cfg(all(desktop, target_os = "macos"))]',
      'fn handle_platform_run_event(_app_handle: &tauri::AppHandle, event: &tauri::RunEvent) {',
      '  if let tauri::RunEvent::Reopen { .. } = event {}',
      '}',
      commonFallbackFixture(),
    ].join('\n'))
    assertOk('guarded macOS references', verifyRustPlatformGuards(root))

    writeFixture(root, 'src-tauri/src/commands/settings_cmds.rs', settingsFallbackFixture().replace(/\n/gu, '\r\n'))
    writeFixture(root, 'src-tauri/src/lib.rs', [
      '#[cfg(all(desktop, target_os = "macos"))]',
      'pub mod menu_bar;',
      commonFallbackFixture(),
    ].join('\r\n'))
    assertOk('guarded macOS references with CRLF fallback snippets', verifyRustPlatformGuards(root))

    writeFixture(root, 'src-tauri/src/commands/settings_cmds.rs', settingsFallbackFixture())

    writeFixture(root, 'src-tauri/src/lib.rs', [
      'pub mod menu_bar;',
      commonFallbackFixture(),
    ].join('\n'))
    assertIssue('unguarded menu bar module', verifyRustPlatformGuards(root), 'menu_bar module access')

    writeFixture(root, 'src-tauri/src/lib.rs', [
      '#[cfg(all(desktop, target_os = "macos"))]',
      'pub mod menu_bar;',
      'fn handle_platform_run_event(_app_handle: &tauri::AppHandle, event: &tauri::RunEvent) {',
      '  if let tauri::RunEvent::Reopen { .. } = event {}',
      '}',
      commonFallbackFixture(),
    ].join('\n'))
    assertIssue('unguarded reopen event', verifyRustPlatformGuards(root), 'tauri::RunEvent::Reopen')

    console.log('[rust-platform-guards] self-test ok')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest()
    return
  }

  const result = verifyRustPlatformGuards()
  if (result.ok) {
    console.log('[rust-platform-guards] ok')
    return
  }

  console.error('[rust-platform-guards] failed')
  for (const issue of result.issues) console.error(`  - ${issue}`)
  process.exitCode = 1
}

if (process.argv[1] === SCRIPT_PATH) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[rust-platform-guards] ${message}`)
    process.exitCode = 1
  }
}

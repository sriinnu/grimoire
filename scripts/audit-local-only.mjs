#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

export const REQUIRED_GITIGNORE_PATTERNS = [
  '.grimoire-local/',
  'mockups/',
  'docs/scratch/',
  'docs/local/',
  'docs/private/',
  'docs/*.local.md',
  'docs/**/*.local.md',
  '.codex/',
  '.claude/settings.local.json',
  '.mcp.json',
  'certs/*.pem',
  '*.key',
  '*.key.pub',
]

const FORBIDDEN_TRACKED_RULES = [
  { label: '.grimoire-local/', test: (path) => hasPrefix(path, '.grimoire-local/') },
  { label: 'mockups/', test: (path) => hasPrefix(path, 'mockups/') },
  { label: 'docs/scratch/', test: (path) => hasPrefix(path, 'docs/scratch/') },
  { label: 'docs/local/', test: (path) => hasPrefix(path, 'docs/local/') },
  { label: 'docs/private/', test: (path) => hasPrefix(path, 'docs/private/') },
  { label: 'docs/*.local.md', test: (path) => path.startsWith('docs/') && path.endsWith('.local.md') },
  { label: '.codex/', test: (path) => hasPrefix(path, '.codex/') },
  { label: '.claude/settings.local.json', test: (path) => path === '.claude/settings.local.json' },
  { label: '.mcp.json', test: (path) => path === '.mcp.json' },
  { label: 'certs/*.pem', test: (path) => path.startsWith('certs/') && path.endsWith('.pem') },
  { label: '*.key', test: (path) => path.endsWith('.key') },
  { label: '*.key.pub', test: (path) => path.endsWith('.key.pub') },
  { label: 'docs/.DS_Store', test: (path) => path === 'docs/.DS_Store' },
]

const STRONG_LOCAL_MARKERS = [
  'DO NOT COMMIT',
  'PRIVATE LOCAL',
  'local_only: true',
  'local-only: true',
  'never_sync: true',
  'no_sync: true',
]

function hasPrefix(path, prefix) {
  return path === prefix.slice(0, -1) || path.startsWith(prefix)
}

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '')
}

function readGitignorePatterns(root) {
  const gitignorePath = resolve(root, '.gitignore')
  if (!existsSync(gitignorePath)) {
    return new Set()
  }

  return new Set(
    readFileSync(gitignorePath, 'utf8')
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#')),
  )
}

function listTrackedFiles(root) {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'git ls-files failed'
    throw new Error(detail)
  }

  return result.stdout
    .split('\0')
    .filter(Boolean)
    .map(normalizePath)
}

function readPreview(root, trackedPath) {
  const absolutePath = resolve(root, trackedPath)
  if (!existsSync(absolutePath)) return ''
  return readFileSync(absolutePath, 'utf8').slice(0, 8192)
}

function isDocsTextFile(path) {
  return path.startsWith('docs/') && /\.(md|mdx|txt)$/iu.test(path)
}

function findForbiddenRule(path) {
  return FORBIDDEN_TRACKED_RULES.find((rule) => rule.test(path))
}

export function auditLocalOnly(root = REPO_ROOT, options = {}) {
  const issues = []
  const gitignorePatterns = readGitignorePatterns(root)

  for (const pattern of REQUIRED_GITIGNORE_PATTERNS) {
    if (!gitignorePatterns.has(pattern)) {
      issues.push(`.gitignore is missing required local-only pattern: ${pattern}`)
    }
  }

  const trackedFiles = (options.trackedFiles ?? listTrackedFiles(root)).map(normalizePath)
  for (const trackedPath of trackedFiles) {
    const rule = findForbiddenRule(trackedPath)
    if (rule) {
      issues.push(`Tracked local-only file matches ${rule.label}: ${trackedPath}`)
      continue
    }

    if (!isDocsTextFile(trackedPath)) continue

    const preview = readPreview(root, trackedPath)
    const marker = STRONG_LOCAL_MARKERS.find((needle) => preview.includes(needle))
    if (marker) {
      issues.push(`Tracked docs file contains local-only marker "${marker}": ${trackedPath}`)
    }
  }

  return { issues, ok: issues.length === 0 }
}

function parseArgs(argv) {
  const config = { root: REPO_ROOT, selfTest: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--self-test') {
      config.selfTest = true
      continue
    }
    if (arg === '--root') {
      const root = argv[index + 1]
      if (!root || root.startsWith('--')) {
        throw new Error('--root requires a path')
      }
      config.root = resolve(root)
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${arg}`)
  }

  return config
}

function writeRequiredGitignore(root, patterns = REQUIRED_GITIGNORE_PATTERNS) {
  writeFileSync(resolve(root, '.gitignore'), `${patterns.join('\n')}\n`)
}

function assertIssue(name, result, expectedText) {
  if (result.issues.some((issue) => issue.includes(expectedText))) return
  throw new Error(`${name} expected issue containing "${expectedText}", got:\n${result.issues.join('\n')}`)
}

function assertOk(name, result) {
  if (result.ok) return
  throw new Error(`${name} expected ok, got:\n${result.issues.join('\n')}`)
}

function runSelfTest() {
  const root = mkdtempSync(join(tmpdir(), 'grimoire-local-audit-'))
  try {
    mkdirSync(resolve(root, 'docs'), { recursive: true })
    writeRequiredGitignore(root)
    writeFileSync(resolve(root, 'docs/ARCHITECTURE.md'), 'This public doc mentions local-only product policy.\n')
    assertOk('safe docs', auditLocalOnly(root, { trackedFiles: ['docs/ARCHITECTURE.md'] }))

    const missingPatterns = REQUIRED_GITIGNORE_PATTERNS.filter((pattern) => pattern !== 'mockups/')
    writeRequiredGitignore(root, missingPatterns)
    assertIssue('missing gitignore pattern', auditLocalOnly(root, { trackedFiles: [] }), 'mockups/')

    writeRequiredGitignore(root)
    assertIssue('tracked mockup', auditLocalOnly(root, { trackedFiles: ['mockups/wire.png'] }), 'mockups/')
    assertIssue('tracked scratch doc', auditLocalOnly(root, { trackedFiles: ['docs/scratch/plan.md'] }), 'docs/scratch/')
    assertIssue('tracked local md', auditLocalOnly(root, { trackedFiles: ['docs/plan.local.md'] }), 'docs/*.local.md')

    writeFileSync(resolve(root, 'docs/private-plan.md'), 'DO NOT COMMIT\n')
    assertIssue(
      'strong local marker',
      auditLocalOnly(root, { trackedFiles: ['docs/private-plan.md'] }),
      'DO NOT COMMIT',
    )

    console.log('[local-only-audit] self-test ok')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function main() {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    runSelfTest()
    return
  }

  const result = auditLocalOnly(config.root)
  if (result.ok) {
    console.log('[local-only-audit] ok')
    return
  }

  console.error('[local-only-audit] failed')
  for (const issue of result.issues) {
    console.error(`  - ${issue}`)
  }
  process.exitCode = 1
}

if (process.argv[1] === SCRIPT_PATH) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[local-only-audit] ${message}`)
    process.exitCode = 1
  }
}

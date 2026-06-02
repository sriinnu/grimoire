#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  readFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const REPO_ROOT = resolve(SCRIPT_DIR, '..')

export const LOCAL_ONLY_DOCS = [
  'docs/ACTIVE-WORK.md',
  'docs/GRIMOIRE-REVIEW-TODO.md',
  'docs/GRIMOIRE-SPECIALNESS-TODO.md',
  'docs/LIGHTNESS-AND-MOTION-PLAN.md',
  'docs/QUICK-CAPTURE-AUTO-PROMOTION.md',
  'docs/CHITRAGUPTA-GRIMOIRE-INTEGRATION-REQUEST.md',
  'docs/CHITRAGUPTA-WIRING-NEEDS.md',
  'docs/KARYA-BOARD-SALVAGE.md',
]

const ROOT_VAULT_TYPE_STUBS = [
  'journal.md',
  'dream.md',
  'memory.md',
  'task.md',
  'note.md',
  'type.md',
]

const TRACKED_ENV_FIXTURES = new Set([
  'src-tauri/fixtures/import-corpora/mixed-markdown-folder/.env',
  'src-tauri/fixtures/import-corpora/notion-markdown/.env',
  'src-tauri/fixtures/import-corpora/obsidian-vault/.env',
])

export const REQUIRED_GITIGNORE_PATTERNS = [
  '.env',
  '.env.*',
  '!.env.example',
  '.grimoire-local/',
  'mockups/',
  'docs/mockups/',
  'docs/**/mockups/',
  'docs/scratch/',
  'docs/local/',
  'docs/private/',
  'docs/*.local.md',
  'docs/**/*.local.md',
  '.codex/',
  '.claude/',
  '.mcp.json',
  'certs/*.pem',
  '*.key',
  '*.key.pub',
  'src-tauri/gen/apple/assets/mcp-server/',
  ...ROOT_VAULT_TYPE_STUBS,
  ...LOCAL_ONLY_DOCS,
]

const FORBIDDEN_TRACKED_RULES = [
  { label: '.grimoire-local/', test: (path) => hasPrefix(path, '.grimoire-local/') },
  { label: 'mockups/', test: (path) => hasPrefix(path, 'mockups/') },
  { label: 'docs/**/mockups/', test: (path) => isDocsMockupPath(path) },
  { label: 'docs/scratch/', test: (path) => hasPrefix(path, 'docs/scratch/') },
  { label: 'docs/local/', test: (path) => hasPrefix(path, 'docs/local/') },
  { label: 'docs/private/', test: (path) => hasPrefix(path, 'docs/private/') },
  { label: 'docs/*.local.md', test: (path) => path.startsWith('docs/') && path.endsWith('.local.md') },
  { label: '.codex/', test: (path) => hasPathSegment(path, '.codex') },
  { label: '.claude/', test: (path) => hasPathSegment(path, '.claude') },
  { label: '.mcp.json', test: (path) => path === '.mcp.json' || path.endsWith('/.mcp.json') },
  { label: '.env*', test: (path) => isEnvFile(path) && !isAllowedTrackedEnvFile(path) },
  { label: 'certs/*.pem', test: (path) => path.startsWith('certs/') && path.endsWith('.pem') },
  { label: '*.key', test: (path) => path.endsWith('.key') },
  { label: '*.key.pub', test: (path) => path.endsWith('.key.pub') },
  {
    label: 'src-tauri/gen/apple/assets/mcp-server/',
    test: (path) => hasPrefix(path, 'src-tauri/gen/apple/assets/mcp-server/'),
  },
  { label: 'local planning docs', test: (path) => LOCAL_ONLY_DOCS.includes(path) },
  { label: 'root vault type stub', test: (path) => ROOT_VAULT_TYPE_STUBS.includes(path) },
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

const REFERENCE_SCANNED_EXTENSIONS = new Set(['md', 'mdx', 'txt', 'json', 'toml', 'yml', 'yaml'])

function hasPrefix(path, prefix) {
  return path === prefix.slice(0, -1) || path.startsWith(prefix)
}

function hasPathSegment(path, segment) {
  return path.split('/').includes(segment)
}

function basename(path) {
  return path.split('/').at(-1) ?? path
}

function isEnvFile(path) {
  const name = basename(path)
  return name === '.env' || name.startsWith('.env.')
}

function isAllowedTrackedEnvFile(path) {
  const name = basename(path)
  return path === '.env.example' || name.endsWith('.example') || TRACKED_ENV_FIXTURES.has(path)
}

function isDocsMockupPath(path) {
  return path === 'docs/mockups' || (path.startsWith('docs/') && path.includes('/mockups/'))
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

function listUntrackedFiles(root) {
  const result = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || 'git ls-files --others failed'
    throw new Error(detail)
  }

  return result.stdout
    .split('\0')
    .filter(Boolean)
    .map(normalizePath)
}

function readCandidateText(root, candidatePath) {
  const absolutePath = resolve(root, candidatePath)
  if (!existsSync(absolutePath)) return ''
  return readFileSync(absolutePath, 'utf8')
}

function isDocsTextFile(path) {
  return path.startsWith('docs/') && /\.(md|mdx|txt)$/iu.test(path)
}

function extension(path) {
  const name = basename(path)
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}

function isReferenceScannedFile(path) {
  return isDocsTextFile(path) || REFERENCE_SCANNED_EXTENSIONS.has(extension(path))
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
  const worktreeFiles = (options.worktreeFiles ?? listUntrackedFiles(root)).map(normalizePath)
  auditCandidateFiles({ files: trackedFiles, issues, label: 'Tracked', root })
  auditCandidateFiles({ files: worktreeFiles, issues, label: 'Untracked worktree', root })

  return { issues, ok: issues.length === 0 }
}

function auditCandidateFiles({ files, issues, label, root }) {
  for (const candidatePath of files) {
    const rule = findForbiddenRule(candidatePath)
    if (rule) {
      issues.push(`${label} local-only file matches ${rule.label}: ${candidatePath}`)
      continue
    }

    if (TRACKED_ENV_FIXTURES.has(candidatePath)) {
      auditSanitizedEnvFixture({ candidatePath, issues, label, root })
    }

    auditLocalOnlyReferences({ candidatePath, issues, label, root })

    if (!isDocsTextFile(candidatePath)) continue

    const content = readCandidateText(root, candidatePath)
    const marker = STRONG_LOCAL_MARKERS.find((needle) => content.includes(needle))
    if (marker) {
      issues.push(`${label} docs file contains local-only marker "${marker}": ${candidatePath}`)
    }
  }
}

function auditLocalOnlyReferences({ candidatePath, issues, label, root }) {
  if (!isReferenceScannedFile(candidatePath)) return
  const content = readCandidateText(root, candidatePath)
  const localDoc = LOCAL_ONLY_DOCS.find((path) => content.includes(path))
  if (!localDoc) return
  issues.push(`${label} public file references local-only doc ${localDoc}: ${candidatePath}`)
}

function auditSanitizedEnvFixture({ candidatePath, issues, label, root }) {
  const content = readCandidateText(root, candidatePath)
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^[A-Z0-9_]+\s*=\s*(.+)$/u)
    if (!match || match[1].trim() !== 'redacted') {
      issues.push(`${label} import fixture .env must stay sanitized: ${candidatePath}`)
      return
    }
  }
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

async function main() {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    const { runSelfTest } = await import('./audit-local-only-self-test.mjs')
    runSelfTest({ auditLocalOnly, LOCAL_ONLY_DOCS, REQUIRED_GITIGNORE_PATTERNS })
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
    await main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[local-only-audit] ${message}`)
    process.exitCode = 1
  }
}

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

const LOCAL_ONLY_DOCS = [
  'docs/ACTIVE-WORK.md',
  'docs/GRIMOIRE-REVIEW-TODO.md',
  'docs/GRIMOIRE-SPECIALNESS-TODO.md',
  'docs/LIGHTNESS-AND-MOTION-PLAN.md',
  'docs/QUICK-CAPTURE-AUTO-PROMOTION.md',
  'docs/CHITRAGUPTA-GRIMOIRE-INTEGRATION-REQUEST.md',
  'docs/CHITRAGUPTA-WIRING-NEEDS.md',
  'docs/KARYA-BOARD-SALVAGE.md',
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

    if (!isDocsTextFile(candidatePath)) continue

    const content = readCandidateText(root, candidatePath)
    const marker = STRONG_LOCAL_MARKERS.find((needle) => content.includes(needle))
    if (marker) {
      issues.push(`${label} docs file contains local-only marker "${marker}": ${candidatePath}`)
    }
  }
}

function auditSanitizedEnvFixture({ candidatePath, issues, label, root }) {
  const content = readCandidateText(root, candidatePath)
  if (/(SECRET|TOKEN|KEY|PASSWORD)\s*=/iu.test(content)) {
    issues.push(`${label} import fixture .env must stay sanitized: ${candidatePath}`)
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
    assertOk('safe docs', auditLocalOnly(root, {
      trackedFiles: ['docs/ARCHITECTURE.md'],
      worktreeFiles: [],
    }))

    const missingPatterns = REQUIRED_GITIGNORE_PATTERNS.filter((pattern) => pattern !== 'mockups/')
    writeRequiredGitignore(root, missingPatterns)
    assertIssue('missing gitignore pattern', auditLocalOnly(root, {
      trackedFiles: [],
      worktreeFiles: [],
    }), 'mockups/')

    writeRequiredGitignore(root)
    assertIssue('tracked mockup', auditLocalOnly(root, {
      trackedFiles: ['mockups/wire.png'],
      worktreeFiles: [],
    }), 'mockups/')
    assertIssue('tracked docs mockup', auditLocalOnly(root, {
      trackedFiles: ['docs/mockups/wire.png'],
      worktreeFiles: [],
    }), 'docs/**/mockups/')
    assertIssue('tracked nested codex dir', auditLocalOnly(root, {
      trackedFiles: ['fixtures/.codex/session.json'],
      worktreeFiles: [],
    }), '.codex/')
    assertIssue('tracked env file', auditLocalOnly(root, {
      trackedFiles: ['packages/app/.env'],
      worktreeFiles: [],
    }), '.env*')
    assertIssue('tracked nested docs mockup', auditLocalOnly(root, {
      trackedFiles: ['docs/design/mockups/wire.png'],
      worktreeFiles: [],
    }), 'docs/**/mockups/')
    assertIssue('tracked scratch doc', auditLocalOnly(root, {
      trackedFiles: ['docs/scratch/plan.md'],
      worktreeFiles: [],
    }), 'docs/scratch/')
    assertIssue('tracked local md', auditLocalOnly(root, {
      trackedFiles: ['docs/plan.local.md'],
      worktreeFiles: [],
    }), 'docs/*.local.md')
    assertIssue('tracked generated MCP server bundle', auditLocalOnly(root, {
      trackedFiles: ['src-tauri/gen/apple/assets/mcp-server/index.js'],
      worktreeFiles: [],
    }), 'src-tauri/gen/apple/assets/mcp-server/')
    assertIssue('tracked claude command', auditLocalOnly(root, {
      trackedFiles: ['.claude/commands/grimoire-next-task.md'],
      worktreeFiles: [],
    }), '.claude/')
    assertIssue('tracked local planning doc', auditLocalOnly(root, {
      trackedFiles: ['docs/ACTIVE-WORK.md'],
      worktreeFiles: [],
    }), 'local planning docs')
    mkdirSync(resolve(root, 'src-tauri/fixtures/import-corpora/obsidian-vault'), { recursive: true })
    writeFileSync(resolve(root, 'src-tauri/fixtures/import-corpora/obsidian-vault/.env'), 'SECRET=value\n')
    assertIssue('tracked dirty env fixture', auditLocalOnly(root, {
      trackedFiles: ['src-tauri/fixtures/import-corpora/obsidian-vault/.env'],
      worktreeFiles: [],
    }), 'sanitized')

    writeFileSync(resolve(root, 'docs/private-plan.md'), 'DO NOT COMMIT\n')
    assertIssue(
      'strong local marker',
      auditLocalOnly(root, { trackedFiles: ['docs/private-plan.md'], worktreeFiles: [] }),
      'DO NOT COMMIT',
    )
    assertIssue(
      'untracked strong local marker',
      auditLocalOnly(root, { trackedFiles: [], worktreeFiles: ['docs/private-plan.md'] }),
      'DO NOT COMMIT',
    )

    writeFileSync(resolve(root, 'docs/deep-private-plan.md'), `${'x'.repeat(9000)}\nDO NOT COMMIT\n`)
    assertIssue(
      'deep strong local marker',
      auditLocalOnly(root, { trackedFiles: ['docs/deep-private-plan.md'], worktreeFiles: [] }),
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

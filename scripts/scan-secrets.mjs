#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_PATH = fileURLToPath(import.meta.url)
const SCRIPT_DIR = dirname(SCRIPT_PATH)
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const MAX_TEXT_BYTES = 1_000_000

const GITHUB_TOKEN_PATTERN = new RegExp(`\\bgh[pousr]_[A-Za-z0-9_]{20,}\\b`, 'g')
const SECRET_PATTERNS = [
  { label: 'OpenAI-style API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { label: 'GitHub token', pattern: GITHUB_TOKEN_PATTERN },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/g },
]

const SECRET_ASSIGNMENT_PATTERN =
  /\b(?:api[_-]?key|secret|access[_-]?token|auth[_-]?token|bearer[_-]?token|password|authorization|private[_-]?key)\b\s*[:=]\s*["']?([A-Za-z0-9_./+=-]{24,})/giu

const SKIP_PATH_PATTERNS = [
  /^node_modules\//u,
  /^dist\//u,
  /^src-tauri\/target\//u,
  /^coverage\//u,
  /^playwright-report\//u,
  /^test-results\//u,
  /(?:^|\/)pnpm-lock\.yaml$/u,
]

function normalizePath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//u, '')
}

function command(args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' })
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `git ${args.join(' ')} failed`
    throw new Error(detail)
  }
  return result.stdout
}

function listScanFiles(mode) {
  if (mode === 'all') return command(['ls-files', '-z']).split('\0').filter(Boolean)
  return command(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    .split('\0')
    .filter(Boolean)
}

function isSkippedPath(path) {
  return SKIP_PATH_PATTERNS.some((pattern) => pattern.test(path))
}

function readTextFile(path) {
  const absolutePath = resolve(REPO_ROOT, path)
  if (!existsSync(absolutePath)) return null
  const buffer = readFileSync(absolutePath)
  if (buffer.length > MAX_TEXT_BYTES || buffer.includes(0)) return null
  return buffer.toString('utf8')
}

function redact(value) {
  if (value.length <= 8) return '[redacted]'
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`
}

export function scanText(path, text) {
  const findings = []
  for (const { label, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of text.matchAll(pattern)) {
      findings.push({ path, label, sample: redact(match[0]) })
    }
  }

  SECRET_ASSIGNMENT_PATTERN.lastIndex = 0
  for (const match of text.matchAll(SECRET_ASSIGNMENT_PATTERN)) {
    const value = match[1]
    if (/^(?:redacted|example|placeholder|changeme|null|none)$/iu.test(value)) continue
    findings.push({ path, label: 'secret-like assignment', sample: redact(value) })
  }
  return findings
}

function scanFiles(files) {
  const findings = []
  for (const rawPath of files.map(normalizePath)) {
    if (isSkippedPath(rawPath)) continue
    const text = readTextFile(rawPath)
    if (text === null) continue
    findings.push(...scanText(rawPath, text))
  }
  return findings
}

function parseArgs(argv) {
  const config = { mode: 'staged', selfTest: false }
  for (const arg of argv) {
    if (arg === '--') {
      continue
    }
    if (arg === '--staged') {
      config.mode = 'staged'
      continue
    }
    if (arg === '--all') {
      config.mode = 'all'
      continue
    }
    if (arg === '--self-test') {
      config.selfTest = true
      continue
    }
    throw new Error(`Unknown option: ${arg}`)
  }
  return config
}

function runSelfTest() {
  const positive = scanText('demo.md', `OPENAI_API_KEY=${'sk-'}${'x'.repeat(32)}`)
  if (positive.length !== 1) throw new Error('expected API key finding')
  const safe = scanText('demo.md', 'TOKEN=redacted\npassword=placeholder\n')
  if (safe.length !== 0) throw new Error('redacted placeholders should not be findings')
  console.log('[secret-scan] self-test ok')
}

function main() {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) {
    runSelfTest()
    return
  }

  const files = listScanFiles(config.mode)
  const findings = scanFiles(files)
  if (findings.length === 0) {
    console.log(`[secret-scan] ok (${config.mode}, ${files.length} file(s))`)
    return
  }

  console.error(`[secret-scan] failed (${config.mode})`)
  for (const finding of findings) {
    console.error(`  - ${finding.path}: ${finding.label} ${finding.sample}`)
  }
  process.exitCode = 1
}

if (process.argv[1] === SCRIPT_PATH) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[secret-scan] ${message}`)
    process.exitCode = 1
  }
}

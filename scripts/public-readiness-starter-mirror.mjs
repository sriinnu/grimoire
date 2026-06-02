import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEMO_VAULT_DIR = resolve(REPO_ROOT, 'demo-vault-v2')
const MANIFEST_PATH = join(DEMO_VAULT_DIR, '.fixture-manifest.json')
const DEFAULT_IGNORED_PUBLIC_FILES = new Set(['README.md', 'LICENSE'])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`)
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function walkFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '.git') return []
      return walkFiles(path)
    }
    return entry.isFile() ? [path] : []
  })
}

function listRelativeFiles(root) {
  return walkFiles(root)
    .map((path) => relative(root, path).replaceAll('\\', '/'))
    .sort()
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function ignoredPublicFiles(manifest) {
  return new Set([
    ...DEFAULT_IGNORED_PUBLIC_FILES,
    ...(manifest.public_starter_repo?.extra_public_files ?? []),
  ])
}

function compareMirrorFiles(publicClonePath) {
  const manifest = readJson(MANIFEST_PATH)
  const ignoredFiles = ignoredPublicFiles(manifest)
  const localFiles = listRelativeFiles(DEMO_VAULT_DIR)
  const publicFiles = listRelativeFiles(publicClonePath).filter((file) => !ignoredFiles.has(file))

  const localOnly = localFiles.filter((file) => !publicFiles.includes(file))
  const publicOnly = publicFiles.filter((file) => !localFiles.includes(file))
  const changed = localFiles
    .filter((file) => publicFiles.includes(file))
    .filter((file) => sha256(join(DEMO_VAULT_DIR, file)) !== sha256(join(publicClonePath, file)))

  return {
    changed,
    localCount: localFiles.length,
    localOnly,
    publicCount: publicFiles.length,
    publicOnly,
  }
}

export function compareStarterMirror(starterUrl) {
  const clonePath = mkdtempSync(join(tmpdir(), 'grimoire-starter-audit-'))
  try {
    run('git', ['clone', '--depth', '1', starterUrl, clonePath])
    return { checked: true, ...compareMirrorFiles(clonePath) }
  } catch (error) {
    return {
      checked: false,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    if (existsSync(clonePath) && basename(clonePath).startsWith('grimoire-starter-audit-')) {
      rmSync(clonePath, { force: true, recursive: true })
    }
  }
}

export function starterMirrorHasDrift(mirror) {
  if (!mirror?.checked) return true
  return mirror.localOnly.length > 0 || mirror.publicOnly.length > 0 || mirror.changed.length > 0
}

export function starterMirrorDriftSummary(mirror) {
  if (!mirror?.checked) return mirror?.error ?? 'not checked'
  return [
    mirror.localOnly.length ? `local-only ${mirror.localOnly.length}` : '',
    mirror.publicOnly.length ? `public-only ${mirror.publicOnly.length}` : '',
    mirror.changed.length ? `changed ${mirror.changed.length}` : '',
  ].filter(Boolean).join(', ') || 'in sync'
}

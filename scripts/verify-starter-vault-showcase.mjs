#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const DEMO_VAULT_DIR = resolve(REPO_ROOT, 'demo-vault-v2')
const MANIFEST_PATH = join(DEMO_VAULT_DIR, '.fixture-manifest.json')
const DEFAULT_IGNORED_PUBLIC_FILES = new Set(['README.md', 'LICENSE'])

function fail(message) {
  throw new Error(`[starter-vault-showcase] ${message}`)
}

function readText(path) {
  return readFileSync(path, 'utf8')
}

function readJson(path) {
  return JSON.parse(readText(path))
}

function relativeToDemo(path) {
  return relative(DEMO_VAULT_DIR, path).replaceAll('\\', '/')
}

function walkFiles(root) {
  const entries = readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
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

function markdownFiles(root) {
  return walkFiles(root).filter((path) => path.endsWith('.md'))
}

function normalizeLinkTarget(value) {
  return value
    .split('|')[0]
    .split('#')[0]
    .trim()
    .replace(/\.md$/u, '')
    .replace(/\\/gu, '/')
    .replace(/\s+/gu, '-')
    .toLowerCase()
}

function frontmatterScalar(content, key) {
  const match = content.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, 'mu'))
  return match?.[1]?.trim() ?? null
}

function h1Title(content) {
  const match = content.match(/^#\s+(.+)$/mu)
  return match?.[1]?.trim() ?? null
}

function wikiTargets(content) {
  return [...content.matchAll(/\[\[([^\]]+)\]\]/gu)].map((match) => normalizeLinkTarget(match[1] ?? ''))
}

function aliases(content) {
  return [...content.matchAll(/-\s+["']?\[\[([^\]]+)\]\]["']?/gu)].map((match) => normalizeLinkTarget(match[1] ?? ''))
}

function indexedTargets(files, root) {
  const targets = new Set()
  for (const file of files) {
    const content = readText(file)
    const relativePath = relative(root, file).replace(/\.md$/u, '')
    const basename = relativePath.split('/').at(-1) ?? relativePath
    const title = frontmatterScalar(content, 'title') ?? h1Title(content)
    targets.add(normalizeLinkTarget(relativePath))
    targets.add(normalizeLinkTarget(basename))
    if (title) targets.add(normalizeLinkTarget(title))
    for (const alias of aliases(content)) targets.add(alias)
  }
  return targets
}

function assertFileExists(root, relativePath, label) {
  const path = join(root, relativePath)
  if (!existsSync(path) || !statSync(path).isFile()) {
    fail(`${label} is missing: ${relativePath}`)
  }
}

function verifyManifest(manifest) {
  if (manifest.public_starter_repo?.url !== 'https://github.com/sriinnu/grimoire-getting-started.git') {
    fail('manifest must point at the public starter repo')
  }
  assertFileExists(DEMO_VAULT_DIR, manifest.showcase?.feature_tour, 'feature tour')
  assertFileExists(DEMO_VAULT_DIR, manifest.showcase?.start_note, 'start note')

  for (const scenario of manifest.scenarios ?? []) {
    for (const file of scenario.files ?? []) {
      assertFileExists(DEMO_VAULT_DIR, file, `scenario ${scenario.id}`)
    }
  }
}

function verifyFeatureTour(manifest) {
  const featureTourPath = join(DEMO_VAULT_DIR, manifest.showcase.feature_tour)
  const featureTour = readText(featureTourPath)
  for (const surface of manifest.showcase.required_surfaces ?? []) {
    if (!featureTour.includes(`| ${surface} |`)) {
      fail(`feature tour is missing required surface: ${surface}`)
    }
  }
}

function verifyWikilinks(root) {
  const files = markdownFiles(root)
  const targets = indexedTargets(files, root)
  const missing = files.flatMap((file) => {
    const content = readText(file)
    return wikiTargets(content)
      .filter((target) => !targets.has(target))
      .map((target) => `${relative(root, file).replaceAll('\\', '/')} -> ${target}`)
  })
  if (missing.length > 0) {
    fail(`unresolved wikilinks:\n${missing.join('\n')}`)
  }
}

function verifyPublicClone(publicClonePath, manifest) {
  const publicRoot = resolve(publicClonePath)
  if (!existsSync(publicRoot) || !statSync(publicRoot).isDirectory()) {
    fail(`public clone path does not exist: ${publicClonePath}`)
  }

  const ignoredPublicFiles = new Set([
    ...DEFAULT_IGNORED_PUBLIC_FILES,
    ...(manifest.public_starter_repo?.extra_public_files ?? []),
  ])
  const localFiles = listRelativeFiles(DEMO_VAULT_DIR)
  const publicFiles = listRelativeFiles(publicRoot).filter((file) => !ignoredPublicFiles.has(file))

  const localOnly = localFiles.filter((file) => !publicFiles.includes(file))
  const publicOnly = publicFiles.filter((file) => !localFiles.includes(file))
  if (localOnly.length > 0 || publicOnly.length > 0) {
    fail([
      'public starter clone file list does not match demo-vault-v2',
      localOnly.length ? `local only:\n${localOnly.join('\n')}` : '',
      publicOnly.length ? `public only:\n${publicOnly.join('\n')}` : '',
    ].filter(Boolean).join('\n'))
  }

  const changed = localFiles.filter((file) => sha256(join(DEMO_VAULT_DIR, file)) !== sha256(join(publicRoot, file)))
  if (changed.length > 0) {
    fail(`public starter clone content differs from demo-vault-v2:\n${changed.join('\n')}`)
  }
}

function parseArgs(argv) {
  const config = { publicClonePath: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--public-clone') {
      config.publicClonePath = argv[index + 1]
      index += 1
      continue
    }
    fail(`unknown option: ${arg}`)
  }
  return config
}

try {
  const config = parseArgs(process.argv.slice(2))
  const manifest = readJson(MANIFEST_PATH)
  verifyManifest(manifest)
  verifyFeatureTour(manifest)
  verifyWikilinks(DEMO_VAULT_DIR)
  if (config.publicClonePath) verifyPublicClone(config.publicClonePath, manifest)
  console.log('[starter-vault-showcase] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}

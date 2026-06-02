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

function splitMarkdownTableRow(line) {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line) {
  return /^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/u.test(line.trim())
}

function featureTourRows(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !isTableSeparator(line))
    .map(splitMarkdownTableRow)
    .filter((cells) => cells.length >= 3 && cells[0] !== 'Surface')
    .map(([surface, action, demoNote]) => ({ action, demoNote, surface }))
}

function firstWikiTarget(markdown) {
  const match = markdown.match(/\[\[([^\]]+)\]\]/u)
  return match ? normalizeLinkTarget(match[1] ?? '') : null
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
  const requiredSurfaces = manifest.showcase.required_surfaces ?? []
  const rows = featureTourRows(featureTour)
  const rowBySurface = new Map(rows.map((row) => [row.surface, row]))
  const files = markdownFiles(DEMO_VAULT_DIR)
  const targets = indexedTargets(files, DEMO_VAULT_DIR)

  const missing = requiredSurfaces.filter((surface) => !rowBySurface.has(surface))
  const extra = rows.map((row) => row.surface).filter((surface) => !requiredSurfaces.includes(surface))
  if (missing.length > 0 || extra.length > 0) {
    fail([
      'feature tour surfaces do not match manifest',
      missing.length ? `missing:\n${missing.join('\n')}` : '',
      extra.length ? `extra:\n${extra.join('\n')}` : '',
    ].filter(Boolean).join('\n'))
  }

  for (const surface of requiredSurfaces) {
    const row = rowBySurface.get(surface)
    if (!row?.action) fail(`feature tour row has no action copy: ${surface}`)
    const target = firstWikiTarget(row.demoNote ?? '')
    if (!target) fail(`feature tour row has no demo-note wikilink: ${surface}`)
    if (!targets.has(target)) fail(`feature tour row links to missing demo note: ${surface} -> ${target}`)
  }
}

function verifySidebarSpotlightShowcase() {
  const featureTour = readText(join(DEMO_VAULT_DIR, 'grimoire-feature-tour.md'))
  const searchNote = readText(join(DEMO_VAULT_DIR, 'grimoire-search-and-commands.md'))
  const textFixture = readText(join(DEMO_VAULT_DIR, 'docs/sidebar-spotlight-proof.ts'))

  if (!featureTour.includes('Use Sidebar Spotlight, Quick Open, command palette, note search, and document find.')) {
    fail('feature tour must advertise Sidebar Spotlight in the Search and commands row')
  }
  if (!searchNote.includes('search `spotlightSentinel`')) {
    fail('Search and Commands note must include a Sidebar Spotlight text-fixture query')
  }
  if (!searchNote.includes('file contents, filenames, and paths')) {
    fail('Search and Commands note must explain the Spotlight project-text search scope')
  }
  if (!textFixture.includes('spotlightSentinel')) {
    fail('Sidebar Spotlight project text fixture must include the sentinel query')
  }
}

function assertContentIncludes(content, needle, label) {
  if (!content.includes(needle)) fail(`${label} must include: ${needle}`)
}

function assertFrontmatter(path, key, expectedValue, label) {
  const value = frontmatterScalar(readText(join(DEMO_VAULT_DIR, path)), key)
  if (value !== expectedValue) fail(`${label} must have ${key}: ${expectedValue}`)
}

function verifyTimeLoomShowcase(manifest) {
  const scenario = (manifest.scenarios ?? []).find((item) => item.id === 'journal-time-loom-substrate')
  if (!scenario) fail('manifest must include the journal-time-loom-substrate scenario')
  const scenarioFiles = new Set(scenario.files ?? [])
  for (const file of [
    'grimoire-calendar-time-loom.md',
    'grimoire-journal-demo-2026-05-31.md',
    'grimoire-dream-demo-2026-05-31.md',
    'event-team-sync-2025-01-13.md',
  ]) {
    if (!scenarioFiles.has(file)) fail(`journal-time-loom-substrate scenario must include ${file}`)
  }

  const featureTour = readText(join(DEMO_VAULT_DIR, 'grimoire-feature-tour.md'))
  const timeLoomRow = featureTourRows(featureTour)
    .find((row) => row.surface === 'Calendar and Time Loom')
  if (!timeLoomRow) fail('feature tour must include the Calendar and Time Loom row')
  if (timeLoomRow.demoNote !== '[[grimoire-calendar-time-loom]]') {
    fail('Calendar and Time Loom row must link to the dedicated Time Loom demo note')
  }
  assertContentIncludes(
    timeLoomRow.action,
    'Journal, Dream, and Event metadata',
    'Calendar and Time Loom feature-tour action',
  )

  const timeLoomNote = readText(join(DEMO_VAULT_DIR, 'grimoire-calendar-time-loom.md'))
  for (const needle of [
    'metadata-only calendar substrate',
    'without needing to expose private note titles or bodies',
    '[[grimoire-journal-demo-2026-05-31]]',
    '[[grimoire-dream-demo-2026-05-31]]',
    '[[event-team-sync-2025-01-13]]',
    'The dashboard can count "Journal 1", "Dream 1", or "Calendar 1"',
  ]) {
    assertContentIncludes(timeLoomNote, needle, 'Time Loom demo note')
  }

  assertFrontmatter('grimoire-journal-demo-2026-05-31.md', 'type', 'Journal', 'Journal demo')
  assertFrontmatter('grimoire-journal-demo-2026-05-31.md', 'date', '2026-05-31', 'Journal demo')
  assertFrontmatter('grimoire-journal-demo-2026-05-31.md', 'egress-blocked', 'true', 'Journal demo')
  assertFrontmatter('grimoire-dream-demo-2026-05-31.md', 'type', 'Dream', 'Dream demo')
  assertFrontmatter('grimoire-dream-demo-2026-05-31.md', 'date', '2026-05-31', 'Dream demo')
  assertFrontmatter('grimoire-dream-demo-2026-05-31.md', 'egress-blocked', 'true', 'Dream demo')
  assertFrontmatter('event-team-sync-2025-01-13.md', 'type', 'Event', 'Event demo')
  assertFrontmatter('event-team-sync-2025-01-13.md', 'date', '2025-01-13', 'Event demo')
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
  verifySidebarSpotlightShowcase()
  verifyTimeLoomShowcase(manifest)
  verifyWikilinks(DEMO_VAULT_DIR)
  if (config.publicClonePath) verifyPublicClone(config.publicClonePath, manifest)
  console.log('[starter-vault-showcase] ok')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}

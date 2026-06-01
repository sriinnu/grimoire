import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { MOCK_ENTRIES } from './mock-entries'
import { MOCK_CONTENT } from './mock-content'

const DEMO_VAULT_DIR = path.resolve('demo-vault-v2')
const LAUNCH_DAY = '2026-05-31'
const STALE_DEMO_DAY = '2026-05-30'

const REQUIRED_SHOWCASE_FILES = [
  'grimoire-learning-project.md',
  'grimoire-feature-tour.md',
  'grimoire-start-here.md',
  'grimoire-markdown-learning.md',
  'grimoire-properties-and-types.md',
  'grimoire-search-and-commands.md',
  'grimoire-links-and-backlinks.md',
  'grimoire-journal-demo-2026-05-31.md',
  'grimoire-dream-demo-2026-05-31.md',
  'grimoire-canvas-and-attachments.md',
  'grimoire-audio-transcription.md',
  'grimoire-console-and-agents.md',
  'grimoire-agent-council.md',
  'grimoire-local-agent-map.md',
  'grimoire-privacy-and-memory.md',
  'grimoire-portability-and-sync.md',
  'grimoire-settings-and-themes.md',
  'grimoire-crystallize-example.md',
]

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const filePath = path.join(dir, name)
    if (statSync(filePath).isDirectory()) return markdownFiles(filePath)
    return name.endsWith('.md') ? [filePath] : []
  })
}

function normalizeLinkTarget(value: string): string {
  return value
    .split('|')[0]
    .split('#')[0]
    .trim()
    .replace(/\.md$/u, '')
    .replace(/\\/gu, '/')
    .replace(/\s+/gu, '-')
    .toLowerCase()
}

function frontmatterScalar(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, 'mu'))
  return match?.[1]?.trim() ?? null
}

function h1Title(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/mu)
  return match?.[1]?.trim() ?? null
}

function wikiTargets(content: string): string[] {
  return [...content.matchAll(/\[\[([^\]]+)\]\]/gu)].map((match) => normalizeLinkTarget(match[1] ?? ''))
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/u, '')
    .replace(/\|$/u, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/u.test(line.trim())
}

function featureTourSurfaces(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter((line) => line.trim().startsWith('|') && !isTableSeparator(line))
    .map(splitMarkdownTableRow)
    .filter((cells) => cells.length >= 3 && cells[0] !== 'Surface')
    .map(([surface]) => surface ?? '')
}

function aliases(content: string): string[] {
  return [...content.matchAll(/-\s+["']?\[\[([^\]]+)\]\]["']?/gu)].map((match) => normalizeLinkTarget(match[1] ?? ''))
}

function indexedTargets(files: string[]): Set<string> {
  const targets = new Set<string>()
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const relativePath = path.relative(DEMO_VAULT_DIR, file).replace(/\.md$/u, '')
    const basename = path.basename(file, '.md')
    const title = frontmatterScalar(content, 'title') ?? h1Title(content)
    targets.add(normalizeLinkTarget(relativePath))
    targets.add(normalizeLinkTarget(basename))
    if (title) targets.add(normalizeLinkTarget(title))
    for (const alias of aliases(content)) targets.add(alias)
  }
  return targets
}

describe('demo vault feature showcase', () => {
  it('ships the launch-day feature tour files', () => {
    for (const file of REQUIRED_SHOWCASE_FILES) {
      expect(existsSync(path.join(DEMO_VAULT_DIR, file)), `${file} should exist`).toBe(true)
    }
  })

  it('keeps launch-day demo dates current', () => {
    const joinedContent = markdownFiles(DEMO_VAULT_DIR)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')
    expect(joinedContent).toContain(LAUNCH_DAY)
    expect(joinedContent).not.toContain(STALE_DEMO_DAY)
  })

  it('keeps showcase wikilinks resolvable inside the demo vault', () => {
    const files = markdownFiles(DEMO_VAULT_DIR)
    const targets = indexedTargets(files)
    const missing = files.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return wikiTargets(content)
        .filter((target) => !targets.has(target))
        .map((target) => `${path.relative(DEMO_VAULT_DIR, file)} -> ${target}`)
    })
    expect(missing).toEqual([])
  })

  it('mirrors the shipped showcase in browser mock entries', () => {
    const mockFilenames = new Set(MOCK_ENTRIES.map((entry) => entry.filename))
    for (const file of REQUIRED_SHOWCASE_FILES) {
      expect(mockFilenames.has(file), `${file} should exist in browser mock entries`).toBe(true)
    }
  })

  it('keeps browser mock feature-tour surfaces aligned with the demo vault', () => {
    const demoTour = readFileSync(path.join(DEMO_VAULT_DIR, 'grimoire-feature-tour.md'), 'utf8')
    const mockTour = MOCK_CONTENT['/Users/mock/Grimoire/grimoire-feature-tour.md'] ?? ''

    expect(featureTourSurfaces(mockTour)).toEqual(featureTourSurfaces(demoTour))
  })
})

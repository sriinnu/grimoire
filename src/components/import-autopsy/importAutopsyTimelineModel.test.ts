import { describe, expect, it } from 'vitest'
import type { ImportAutopsyPreviewState } from '../../lib/vaultPortability'
import {
  buildExactManifestRows,
  buildPortableManifestMarkdown,
  buildPreflightBuckets,
  buildTimelineSteps,
  exactManifestDisclosure,
} from './importAutopsyTimelineModel'

const preview: ImportAutopsyPreviewState = {
  sourceId: 'day-one-preview',
  result: {
    source_path: '/Users/sri/Private/Day One Export.zip',
    planned_import_root: '/Users/sri/Vault/imports/day-one',
    notes_to_copy: 1,
    assets_to_copy: 1,
    skipped_files: 1,
    failed_files: 0,
    writes_local_only_report: true,
    manifest_rows: [
      {
        kind: 'note',
        source_path: '/Users/sri/Private/Day One Export/entries/entry one.json',
        destination_path: '/Users/sri/Vault/imports/day-one/entry one.md',
        detail: 'mapped /Users/sri/Private/Day One Export/entries/entry one.json into /Users/sri/Vault/imports/day-one/entry one.md',
      },
      {
        kind: 'asset',
        source_path: '/Users/sri/Private/Day One Export/photos/moon photo.png',
        destination_path: '/Users/sri/Vault/imports/day-one/assets/moon photo.png',
        detail: 'copied "/Users/sri/Private/Day One Export/photos/moon photo.png"',
      },
      {
        kind: 'withheld',
        source_path: '/Users/sri/Private/Day One Export/.env.local',
        destination_path: null,
        detail: 'withheld /Users/sri/Private/Day One Export/.env.local by local-only policy',
      },
    ],
  },
}

describe('importAutopsyTimelineModel', () => {
  it('redacts exact manifest details with spaces in local paths', () => {
    const rows = buildExactManifestRows(preview.result, '/Users/sri/Vault')

    expect(rows[0]).toMatchObject({
      source: 'entry one.json',
      destination: './imports/day-one/entry one.md',
      detail: 'mapped entry one.json into ./imports/day-one/entry one.md',
      kind: 'Note',
    })
    expect(rows[1]).toMatchObject({
      source: 'moon photo.png',
      destination: './imports/day-one/assets/moon photo.png',
      detail: 'copied "moon photo.png"',
      kind: 'Asset',
    })
    expect(rows[2]).toMatchObject({
      source: '.env.local',
      destination: 'withheld',
      detail: 'withheld .env.local by local-only policy',
      kind: 'Withheld',
      tone: 'warn',
    })
    expect(JSON.stringify(rows)).not.toContain('/Users/')
    expect(JSON.stringify(rows)).not.toContain('Day One Export')
  })

  it('builds a clipboard-safe Markdown manifest from redacted rows', () => {
    const buckets = buildPreflightBuckets(preview.result)
    const rows = buildExactManifestRows(preview.result, '/Users/sri/Vault')
    const steps = buildTimelineSteps(preview, '/Users/sri/Vault')
    const markdown = buildPortableManifestMarkdown('Day One', buckets, rows, steps)

    expect(markdown).toContain('# Import Autopsy Manifest')
    expect(markdown).toContain('Privacy: absolute local paths are redacted from this portable copy.')
    expect(markdown).toContain('Note: entry one.json -> ./imports/day-one/entry one.md')
    expect(markdown).toContain('Asset: moon photo.png -> ./imports/day-one/assets/moon photo.png')
    expect(markdown).toContain('Withheld: .env.local -> withheld; withheld .env.local by local-only policy')
    expect(markdown).toContain('Day One selected: Day One Export.zip')
    expect(markdown).toContain('Original import reports with absolute source paths stay local-only.')
    expect(markdown).not.toContain('/Users/')
    expect(markdown).not.toContain('/Private/')
  })

  it('limits exact rows so Settings stays scan-friendly', () => {
    const result = {
      ...preview.result,
      manifest_rows: Array.from({ length: 10 }, (_value, index) => ({
        kind: 'note' as const,
        source_path: `/Users/sri/Private/Export/note-${index}.md`,
        destination_path: `/Users/sri/Vault/imports/notes/note-${index}.md`,
        detail: `planned /Users/sri/Private/Export/note-${index}.md`,
      })),
    }

    expect(buildExactManifestRows(result, '/Users/sri/Vault')).toHaveLength(8)
  })

  it('discloses redacted overflow without leaking local paths', () => {
    const result = {
      ...preview.result,
      manifest_rows: Array.from({ length: 10 }, (_value, index) => ({
        kind: 'note' as const,
        source_path: `/Users/sri/Private/Export/note-${index}.md`,
        destination_path: `/Users/sri/Vault/imports/notes/note-${index}.md`,
        detail: `planned /Users/sri/Private/Export/note-${index}.md`,
      })),
    }
    const rows = buildExactManifestRows(result, '/Users/sri/Vault')
    const disclosure = exactManifestDisclosure(result.manifest_rows.length, rows.length)
    const markdown = buildPortableManifestMarkdown(
      'Markdown folder',
      buildPreflightBuckets(result),
      rows,
      buildTimelineSteps({ ...preview, sourceId: 'markdown-folder-preview', result }, '/Users/sri/Vault'),
      result.manifest_rows.length,
    )

    expect(disclosure).toBe('Showing first 8 of 10 redacted rows. Full absolute-path report stays local-only.')
    expect(markdown).toContain('- Showing first 8 of 10 redacted rows. Full absolute-path report stays local-only.')
    expect(markdown).not.toContain('/Users/')
    expect(markdown).not.toContain('/Private/')
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('folder glyph motif CSS', () => {
  it('gives semantic folder medallions distinct motif anatomy', () => {
    const css = readFileSync(`${process.cwd()}/src/components/folder-tree/FolderGlyphMotifs.css`, 'utf8')

    expect(css).toContain('[data-folder-glyph-motif="vault"]')
    expect(css).toContain('[data-folder-glyph-motif="private"]')
    expect(css).toContain('[data-folder-glyph-motif="knowledge"]')
    expect(css).toContain('[data-folder-glyph-motif="mind"]')
    expect(css).toContain('[data-folder-glyph-motif="route"]')
    expect(css).toContain('[data-folder-glyph-motif="sky"]')
    expect(css).toContain('[data-folder-glyph-motif="blueprint"]')
    expect(css).toContain('[data-folder-glyph="vedas"] .folder-glyph__thread')
    expect(css).toContain('[data-folder-glyph="shaastras"] .folder-glyph__constellation')
    expect(css).toContain('[data-folder-glyph="puranas"] .folder-glyph__constellation')
    expect(css).toContain('[data-folder-glyph="second-brain"] .folder-glyph__constellation')
    expect(css).toContain('[data-folder-glyph="rishi"] .folder-glyph__spark')
    expect(css).toContain('not([data-folder-glyph-motif="folder"])')
    expect(css).toContain('[data-folder-glyph-motif="folder"] .folder-glyph__spark')
    expect(css).toContain('.folder-glyph__thread')
    expect(css).toContain('.folder-glyph__constellation')
    expect(css).toContain('[data-open="true"]')
    expect(css).toContain('[data-selected="true"]')
  })
})

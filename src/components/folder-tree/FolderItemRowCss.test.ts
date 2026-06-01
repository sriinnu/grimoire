import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('folder item row CSS', () => {
  it('makes selected folder rows follow semantic glyph tones', () => {
    const css = readFileSync(`${process.cwd()}/src/components/folder-tree/FolderItemRow.css`, 'utf8')

    expect(css).toContain('.folder-item-row')
    expect(css).toContain('[data-folder-row-tone="veda"]')
    expect(css).toContain('[data-folder-row-tone="storage"]')
    expect(css).toContain('[data-folder-row-tone="private"]')
    expect(css).toContain('[data-selected="true"]')
    expect(css).toContain('--folder-row-selected-bg')
    expect(css).toContain('--folder-row-selected-border')
    expect(css).toContain('.folder-item-row__select')
    expect(css).toContain('color-mix')
  })
})

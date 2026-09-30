import { describe, expect, it } from 'vitest'
import { folderLabel, importTargetFolder, normalizePickedPaths, summarizeImport, type ImportedFile } from './importFiles'

const vault = '/Users/me/Notebook'

describe('importTargetFolder', () => {
  it('uses the selected sidebar folder and falls back to the vault root', () => {
    expect(importTargetFolder({ kind: 'folder', path: '/Users/me/Notebook/Projects' })).toBe('/Users/me/Notebook/Projects')
    expect(importTargetFolder({ kind: 'filter', filter: 'all' })).toBeNull()
    expect(importTargetFolder(null)).toBeNull()
  })
})

describe('folderLabel', () => {
  it('names the last segment, or the vault itself', () => {
    expect(folderLabel('/Users/me/Notebook/Projects/', vault)).toBe('Projects')
    expect(folderLabel(null, vault)).toBe('Notebook')
  })
})

describe('summarizeImport', () => {
  const file = (kind: ImportedFile['kind'], name: string): ImportedFile => ({ source: `/tmp/${name}`, path: `${vault}/${name}`, kind })

  it('counts notes and attachments and mentions duplicates', () => {
    expect(summarizeImport([file('note', 'a.md'), file('note', 'b.md'), file('attachment', 'c.pdf')], null, vault)).toBe('Imported 2 notes and 1 attachment into Notebook')
    expect(summarizeImport([file('note', 'a.md'), file('duplicate', 'b.md')], '/Users/me/Notebook/Projects', vault)).toBe('Imported 1 note into Projects · 1 file already there')
    expect(summarizeImport([file('duplicate', 'b.md')], null, vault)).toBe('Nothing new to import into Notebook · 1 file already there')
  })
})

describe('normalizePickedPaths', () => {
  it('accepts one path, many paths, or a cancel, and unwraps file URLs', () => {
    expect(normalizePickedPaths(null)).toEqual([])
    expect(normalizePickedPaths('/a/b.md')).toEqual(['/a/b.md'])
    expect(normalizePickedPaths(['/a/b.md', 'file:///Users/me/My%20Notes/c.md'])).toEqual(['/a/b.md', '/Users/me/My Notes/c.md'])
    expect(normalizePickedPaths(['file:///C:/notes/d.md'])).toEqual(['C:/notes/d.md'])
  })
})

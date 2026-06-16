import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FolderNode } from '../../types'
import { FolderGlyph } from './FolderGlyph'
import { DefaultFolderGlyphIcon, DefaultFolderOpenGlyphIcon } from './folderDomainIcons'
import { resolveFolderGlyphModel } from './folderGlyphModel'

function folder(name: string): FolderNode {
  return { name, path: `library/${name}`, children: [] }
}

function nestedFolder(path: string): FolderNode {
  const parts = path.split('/')
  return { name: parts.at(-1) ?? path, path, children: [] }
}

describe('FolderGlyph', () => {
  it.each([
    ['Vedas', 'vedas', 'veda'],
    ['Vedaṅga', 'vedas', 'veda'],
    ['वेदाङ्ग', 'vedas', 'veda'],
    ['Upanishads', 'vedas', 'veda'],
    ['Shruti', 'vedas', 'veda'],
    ['Shaastras', 'shaastras', 'shaastra'],
    ['Śāstra', 'shaastras', 'shaastra'],
    ['शास्त्र', 'shaastras', 'shaastra'],
    ['Tantra', 'shaastras', 'shaastra'],
    ['Sutra', 'shaastras', 'shaastra'],
    ['Puranas', 'puranas', 'purana'],
    ['Purāṇa', 'puranas', 'purana'],
    ['पुराण', 'puranas', 'purana'],
    ['Ramayana', 'puranas', 'purana'],
    ['Rishi', 'rishi', 'rishi'],
    ['Ṛṣi', 'rishi', 'rishi'],
    ['ऋषि', 'rishi', 'rishi'],
    ['Acharya', 'rishi', 'rishi'],
    ['Second Brain', 'second-brain', 'brain'],
    ['दूसरा मस्तिष्क', 'second-brain', 'brain'],
    ['Brain', 'brain', 'brain'],
    ['स्मृति', 'brain', 'brain'],
    ['Knowledge Graph', 'second-brain', 'brain'],
    ['Astral', 'star', 'star'],
    ['Panchanga', 'star', 'star'],
    ['docs', 'docs', 'docs'],
    ['frontend', 'dev', 'dev'],
    ['ephemeris_data', 'data', 'data'],
    ['Import Export', 'storage', 'storage'],
    ['S3 blobs', 'storage', 'storage'],
    ['Research Notes', 'research', 'research'],
    ['Notes', 'vault', 'vault'],
    ['Evidence Review', 'research', 'research'],
    ['Templates', 'template', 'template'],
    ['Private', 'private', 'private'],
    ['Chitragupta', 'agent', 'agent'],
    ['Agent Council', 'agent', 'agent'],
    ['Nakshatra', 'star', 'star'],
    ['ज्योतिष', 'star', 'star'],
    ['Dreams', 'journal', 'journal'],
    ['स्वप्न', 'journal', 'journal'],
    ['गुप्त', 'private', 'private'],
  ])('resolves %s as a semantic Grimoire glyph', (name, glyphName, tone) => {
    render(<FolderGlyph node={folder(name)} isOpen={false} isSelected={false} />)

    const glyph = screen.getByTestId(`folder-glyph:library/${name}`)
    expect(glyph).toHaveAttribute('data-folder-glyph', glyphName)
    expect(glyph).toHaveAttribute('data-folder-glyph-tone', tone)
    expect(glyph).not.toHaveAttribute('data-folder-glyph-motif')
    expect(glyph.querySelector('.folder-glyph__route')).toBeNull()
    expect(glyph.querySelector('.folder-glyph__thread')).toBeNull()
    expect(glyph.querySelector('.folder-glyph__bead')).toBeNull()
    expect(glyph.querySelector('.folder-glyph__spark')).toBeNull()
    expect(glyph.querySelector('.folder-glyph__constellation')).toBeNull()
    expect(glyph.querySelector('.folder-glyph__cel-glint')).toBeNull()
  })

  it.each([
    ['Private/notes', 'private', 'private'],
    ['Dreams/fragments', 'journal', 'journal'],
    ['Vedas/translations', 'vedas', 'veda'],
    ['Storage/snapshots', 'storage', 'storage'],
    ['Agent Council/prompts', 'agent', 'agent'],
    ['Astral/charts', 'star', 'star'],
  ])('inherits semantic glyphs from parent folders for %s', (path, glyphName, tone) => {
    const model = resolveFolderGlyphModel(nestedFolder(path), false)

    expect(model).toMatchObject({
      name: glyphName,
      tone,
    })
  })

  it('keeps unmatched folders on the standard folder glyph', () => {
    expect(resolveFolderGlyphModel(folder('backend'), false)).toMatchObject({
      name: 'dev',
      tone: 'dev',
    })
    expect(resolveFolderGlyphModel(folder('Meeting Notes'), false)).toMatchObject({
      name: 'folder',
      tone: 'folder',
    })
    expect(resolveFolderGlyphModel(folder('misc'), false)).toMatchObject({
      name: 'folder',
      tone: 'folder',
    })
    expect(resolveFolderGlyphModel(folder('misc'), true)).toMatchObject({
      name: 'folder-open',
      tone: 'folder',
    })
  })

  it('uses authored Grimoire glyphs for unmatched closed and open folders', () => {
    expect(resolveFolderGlyphModel(folder('misc'), false).Icon).toBe(DefaultFolderGlyphIcon)
    expect(resolveFolderGlyphModel(folder('misc'), true).Icon).toBe(DefaultFolderOpenGlyphIcon)
  })

  it('uses the authored Grimoire star glyph for star-domain folders', () => {
    render(<FolderGlyph node={folder('Nakshatra')} isOpen={true} isSelected={true} />)

    const glyph = screen.getByTestId('folder-glyph:library/Nakshatra')
    expect(glyph).toHaveAttribute('data-folder-glyph', 'star')
    expect(glyph.querySelector('[data-knowledge-icon="star"]')).not.toBeNull()
  })
})

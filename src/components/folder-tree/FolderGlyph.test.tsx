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
    ['Vedas', 'vedas', 'veda', 'knowledge'],
    ['Vedaṅga', 'vedas', 'veda', 'knowledge'],
    ['वेदाङ्ग', 'vedas', 'veda', 'knowledge'],
    ['Upanishads', 'vedas', 'veda', 'knowledge'],
    ['Shruti', 'vedas', 'veda', 'knowledge'],
    ['Shaastras', 'shaastras', 'shaastra', 'knowledge'],
    ['Śāstra', 'shaastras', 'shaastra', 'knowledge'],
    ['शास्त्र', 'shaastras', 'shaastra', 'knowledge'],
    ['Tantra', 'shaastras', 'shaastra', 'knowledge'],
    ['Sutra', 'shaastras', 'shaastra', 'knowledge'],
    ['Puranas', 'puranas', 'purana', 'knowledge'],
    ['Purāṇa', 'puranas', 'purana', 'knowledge'],
    ['पुराण', 'puranas', 'purana', 'knowledge'],
    ['Ramayana', 'puranas', 'purana', 'knowledge'],
    ['Rishi', 'rishi', 'rishi', 'sky'],
    ['Ṛṣi', 'rishi', 'rishi', 'sky'],
    ['ऋषि', 'rishi', 'rishi', 'sky'],
    ['Acharya', 'rishi', 'rishi', 'sky'],
    ['Second Brain', 'second-brain', 'brain', 'mind'],
    ['दूसरा मस्तिष्क', 'second-brain', 'brain', 'mind'],
    ['Brain', 'brain', 'brain', 'mind'],
    ['स्मृति', 'brain', 'brain', 'mind'],
    ['Knowledge Graph', 'second-brain', 'brain', 'mind'],
    ['Astral', 'star', 'star', 'sky'],
    ['Panchanga', 'star', 'star', 'sky'],
    ['docs', 'docs', 'docs', 'knowledge'],
    ['frontend', 'dev', 'dev', 'route'],
    ['ephemeris_data', 'data', 'data', 'route'],
    ['Import Export', 'storage', 'storage', 'route'],
    ['S3 blobs', 'storage', 'storage', 'route'],
    ['Research Notes', 'research', 'research', 'route'],
    ['Notes', 'vault', 'vault', 'vault'],
    ['Evidence Review', 'research', 'research', 'route'],
    ['Templates', 'template', 'template', 'blueprint'],
    ['Private', 'private', 'private', 'private'],
    ['Chitragupta', 'agent', 'agent', 'mind'],
    ['Agent Council', 'agent', 'agent', 'mind'],
    ['Nakshatra', 'star', 'star', 'sky'],
    ['ज्योतिष', 'star', 'star', 'sky'],
    ['Dreams', 'journal', 'journal', 'private'],
    ['स्वप्न', 'journal', 'journal', 'private'],
    ['गुप्त', 'private', 'private', 'private'],
  ])('resolves %s as a semantic Grimoire glyph', (name, glyphName, tone, motif) => {
    render(<FolderGlyph node={folder(name)} isOpen={false} isSelected={false} />)

    const glyph = screen.getByTestId(`folder-glyph:library/${name}`)
    expect(glyph).toHaveAttribute('data-folder-glyph', glyphName)
    expect(glyph).toHaveAttribute('data-folder-glyph-tone', tone)
    expect(glyph).toHaveAttribute('data-folder-glyph-motif', motif)
    expect(glyph.querySelector('.folder-glyph__thread')).not.toBeNull()
    expect(glyph.querySelector('.folder-glyph__constellation')).not.toBeNull()
    expect(glyph.querySelector('.folder-glyph__cel-glint')).not.toBeNull()
    expect(glyph.querySelectorAll('.folder-glyph__bead')).toHaveLength(2)
  })

  it.each([
    ['Private/notes', 'private', 'private', 'private'],
    ['Dreams/fragments', 'journal', 'journal', 'private'],
    ['Vedas/translations', 'vedas', 'veda', 'knowledge'],
    ['Storage/snapshots', 'storage', 'storage', 'route'],
    ['Agent Council/prompts', 'agent', 'agent', 'mind'],
    ['Astral/charts', 'star', 'star', 'sky'],
  ])('inherits semantic glyphs from parent folders for %s', (path, glyphName, tone, motif) => {
    const model = resolveFolderGlyphModel(nestedFolder(path), false)

    expect(model).toMatchObject({
      motif,
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
      motif: 'folder',
      name: 'folder',
      tone: 'folder',
    })
    expect(resolveFolderGlyphModel(folder('misc'), false)).toMatchObject({
      motif: 'folder',
      name: 'folder',
      tone: 'folder',
    })
    expect(resolveFolderGlyphModel(folder('misc'), true)).toMatchObject({
      motif: 'folder',
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

import { describe, expect, it, vi } from 'vitest'
import { buildVaultSlashMenuItems } from './singleEditorSlashContext'
import type { VaultEntry } from '../types'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: 100,
    favorite: false,
    favoriteIndex: null,
    fileKind: 'markdown',
    fileSize: 0,
    filename: 'note.md',
    hasH1: true,
    icon: null,
    isA: 'Note',
    listPropertiesDisplay: [],
    modifiedAt: 100,
    order: null,
    organized: false,
    outgoingLinks: [],
    path: '/vault/note.md',
    properties: {},
    relationships: {},
    relatedTo: [],
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: 'Note',
    view: null,
    visible: true,
    wordCount: 0,
    ...overrides,
  }
}

function editorMock() {
  const cursorBlock = { id: 'cursor', type: 'paragraph', content: [], children: [] }
  return {
    getTextCursorPosition: vi.fn(() => ({ block: cursorBlock })),
    insertBlocks: vi.fn((blocks: unknown[]) => blocks),
    setTextCursorPosition: vi.fn(),
    tryParseMarkdownToBlocks: vi.fn((markdown: string) => [{
      id: 'parsed',
      type: 'paragraph',
      content: [{ type: 'text', text: markdown, styles: {} }],
      children: [],
    }]),
    updateBlock: vi.fn((_block: unknown, update: unknown) => update),
  }
}

describe('buildVaultSlashMenuItems', () => {
  it('offers recent note links and inserts a wikilink target', () => {
    const insertWikilink = vi.fn()
    const items = buildVaultSlashMenuItems({
      editor: editorMock() as never,
      entries: [
        entry({ title: 'Old Note', modifiedAt: 10, path: '/vault/old.md' }),
        entry({ title: 'Alpha Project', modifiedAt: 20, path: '/vault/alpha.md' }),
      ],
      insertTag: vi.fn(),
      insertWikilink,
      query: 'alpha',
    })

    expect(items[0]).toMatchObject({ title: 'Link: Alpha Project', group: 'Vault' })
    items[0].onItemClick()
    expect(insertWikilink).toHaveBeenCalledWith('Alpha Project')
  })

  it('offers type templates and parses template markdown through the editor', () => {
    const editor = editorMock()
    const items = buildVaultSlashMenuItems({
      editor: editor as never,
      entries: [
        entry({
          isA: 'Type',
          path: '/vault/types/project.md',
          template: '## Kickoff\n- [ ] ',
          title: 'Project',
        }),
      ],
      insertTag: vi.fn(),
      insertWikilink: vi.fn(),
      query: 'template',
    })

    items[0].onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith('## Kickoff\n- [ ] ')
  })

  it('offers existing tags as slash rows', () => {
    const insertTag = vi.fn()
    const items = buildVaultSlashMenuItems({
      editor: editorMock() as never,
      entries: [entry({ properties: { tags: 'ai, writing' }, snippet: '#ai note' })],
      insertTag,
      insertWikilink: vi.fn(),
      query: 'tag',
    })

    expect(items.map(item => item.title)).toContain('Tag: #ai')
    items.find(item => item.title === 'Tag: #ai')?.onItemClick()
    expect(insertTag).toHaveBeenCalledWith('ai')
  })

  it('offers create-note rows for unmatched slash queries', () => {
    const onCreateAndOpenNote = vi.fn().mockResolvedValue(true)
    const items = buildVaultSlashMenuItems({
      editor: editorMock() as never,
      entries: [entry({ title: 'Existing Note' })],
      onCreateAndOpenNote,
      insertTag: vi.fn(),
      insertWikilink: vi.fn(),
      query: 'new research thread',
    })

    expect(items.map(item => item.title)).toContain('Create Note: new research thread')
    items.find(item => item.title === 'Create Note: new research thread')?.onItemClick()
    expect(onCreateAndOpenNote).toHaveBeenCalledWith('new research thread')
  })

  it('offers create-tag rows for unmatched collection queries', () => {
    const insertTag = vi.fn()
    const items = buildVaultSlashMenuItems({
      editor: editorMock() as never,
      entries: [entry({ properties: { tags: 'ai' } })],
      insertTag,
      insertWikilink: vi.fn(),
      query: 'journal',
    })

    expect(items.map(item => item.title)).toContain('Create Tag: #journal')
    items.find(item => item.title === 'Create Tag: #journal')?.onItemClick()
    expect(insertTag).toHaveBeenCalledWith('journal')
  })
})

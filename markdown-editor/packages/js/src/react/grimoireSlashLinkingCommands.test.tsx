import { describe, expect, it, vi } from 'vitest'
import { getGrimoireCustomSlashMenuItems } from './grimoireSlashCommandItems'

function createEditorMock() {
  const cursorBlock = {
    id: 'cursor',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: '/', styles: {} }],
    children: [],
  }

  return {
    schema: {
      blockSchema: {
        paragraph: { content: 'inline' },
      },
      inlineContentSchema: {},
    },
    document: [],
    getTextCursorPosition: vi.fn(() => ({ block: cursorBlock })),
    insertBlocks: vi.fn((blocks: unknown[]) => blocks),
    insertInlineContent: vi.fn(),
    setTextCursorPosition: vi.fn(),
    tryParseMarkdownToBlocks: vi.fn((markdown: string) => [{
      id: 'parsed',
      type: 'paragraph',
      props: {},
      content: [{ type: 'text', text: markdown, styles: {} }],
      children: [],
    }]),
    updateBlock: vi.fn(),
  }
}

function getItem(key: string) {
  const editor = createEditorMock()
  const items = getGrimoireCustomSlashMenuItems(
    editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
    new Date(2026, 3, 30, 15, 4),
  )
  const item = items.find(candidate => candidate.key === key)
  if (!item) throw new Error(`Missing slash command ${key}`)
  return { editor, item }
}

describe('grimoire linking slash commands', () => {
  it('makes Spelllinks searchable by bracket syntax and inserts missing-target prompts', () => {
    const { editor, item } = getItem('grimoire_create_wikilinks')

    expect(item.title).toBe('Create Spelllinks [[ ]]')
    expect(item.aliases).toContain('[[')
    expect(item.aliases).toContain('wiki links')

    item.onItemClick()
    const markdown = vi.mocked(editor.tryParseMarkdownToBlocks).mock.calls[0][0]
    expect(markdown).toContain('[[Note Title]] - why this should exist')
    expect(markdown).toContain('Missing targets')
  })

  it('keeps graph cleanup commands discoverable through wikilink language', () => {
    expect(getItem('grimoire_backlink_review').item.aliases).toContain('wikilinks')
    expect(getItem('grimoire_link_map').item.subtext).toContain('[[note]]')
  })
})

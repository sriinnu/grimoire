import { describe, expect, it } from 'vitest'
import { getFormattingToolbarItems } from '@blocknote/react'
import {
  filterGrimoireFormattingToolbarItems,
  filterGrimoireSlashMenuItems,
  getGrimoireBlockTypeSelectItems,
} from './grimoireEditorFormattingConfig'

describe('grimoireEditorFormatting', () => {
  it('keeps the markdown-safe toolbar controls and block type select', () => {
    const itemKeys = filterGrimoireFormattingToolbarItems(
      getFormattingToolbarItems(getGrimoireBlockTypeSelectItems()),
    ).map((item) => String(item.key))

    expect(itemKeys).toContain('blockTypeSelect')
    expect(itemKeys).toContain('boldStyleButton')
    expect(itemKeys).toContain('italicStyleButton')
    expect(itemKeys).toContain('strikeStyleButton')
    expect(itemKeys).toContain('createLinkButton')
    expect(itemKeys).toContain('nestBlockButton')
    expect(itemKeys).toContain('unnestBlockButton')

    expect(itemKeys).not.toContain('underlineStyleButton')
    expect(itemKeys).not.toContain('colorStyleButton')
    expect(itemKeys).not.toContain('textAlignLeftButton')
    expect(itemKeys).not.toContain('textAlignCenterButton')
    expect(itemKeys).not.toContain('textAlignRightButton')
  })

  it('returns the audited markdown-safe block types for the toolbar select', () => {
    expect(getGrimoireBlockTypeSelectItems()).toEqual([
      expect.objectContaining({ name: 'Paragraph', type: 'paragraph' }),
      expect.objectContaining({ name: 'Heading 1', type: 'heading', props: { level: 1 } }),
      expect.objectContaining({ name: 'Heading 2', type: 'heading', props: { level: 2 } }),
      expect.objectContaining({ name: 'Heading 3', type: 'heading', props: { level: 3 } }),
      expect.objectContaining({ name: 'Heading 4', type: 'heading', props: { level: 4 } }),
      expect.objectContaining({ name: 'Heading 5', type: 'heading', props: { level: 5 } }),
      expect.objectContaining({ name: 'Heading 6', type: 'heading', props: { level: 6 } }),
      expect.objectContaining({ name: 'Quote', type: 'quote' }),
      expect.objectContaining({ name: 'Bullet List', type: 'bulletListItem' }),
      expect.objectContaining({ name: 'Numbered List', type: 'numberedListItem' }),
      expect.objectContaining({ name: 'Checklist', type: 'checkListItem' }),
      expect.objectContaining({ name: 'Code Block', type: 'codeBlock' }),
    ])
  })

  it('filters unsupported toggle slash-menu variants and annotates supported markdown commands', () => {
    type GrimoireSlashMenuTestItem = {
      key: string
      title: string
      onItemClick: () => void
      subtext?: string
    }

    const items = filterGrimoireSlashMenuItems([
      { key: 'toggle_heading', title: 'Toggle heading', onItemClick: () => {} },
      { key: 'toggle_list', title: 'Toggle list', onItemClick: () => {} },
      { key: 'heading', title: 'Heading', onItemClick: () => {} },
      { key: 'heading_2', title: 'Heading', onItemClick: () => {} },
      { key: 'bullet_list', title: 'Bullet List', onItemClick: () => {} },
      { key: 'code_block', title: 'Code Block', onItemClick: () => {} },
    ] satisfies GrimoireSlashMenuTestItem[])

    expect(items.map((item) => item.key)).toEqual([
      'heading',
      'heading_2',
      'bullet_list',
      'code_block',
    ])
    expect(items.find((item) => item.key === 'heading')?.title).toBe('Heading 1')
    expect(items.find((item) => item.key === 'heading')?.subtext).toContain(
      'page title or major top-level section',
    )
    expect(items.find((item) => item.key === 'heading')?.aliases).toContain('#')
    expect(items.find((item) => item.key === 'heading')?.aliases).toContain('h1')
    expect(items.find((item) => item.key === 'heading')?.group).toBe('Structure')
    expect(items.find((item) => item.key === 'heading_2')?.title).toBe('Heading 2')
    expect(items.find((item) => item.key === 'heading_2')?.subtext).toContain(
      'Heading 2 (`##`)',
    )
    expect(items.find((item) => item.key === 'heading_2')?.aliases).toContain('##')
    expect(items.find((item) => item.key === 'bullet_list')?.subtext).toContain(
      'Markdown-safe bullet list',
    )
    expect(items.find((item) => item.key === 'bullet_list')?.aliases).toContain('ul')
    expect(items.find((item) => item.key === 'bullet_list')?.group).toBe('Lists')
    expect(items.find((item) => item.key === 'code_block')?.subtext).toContain(
      'Markdown-safe fenced code block',
    )
    expect(items.find((item) => item.key === 'code_block')?.aliases).toContain('snippet')
  })
})

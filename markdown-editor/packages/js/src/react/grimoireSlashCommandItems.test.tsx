import { describe, expect, it, vi } from 'vitest'
import { formatLocalDate } from './grimoireSlashCommandActions'
import {
  getGrimoireCustomSlashMenuItems,
  type GrimoireSlashMenuItem,
} from './grimoireSlashCommandItems'

const FIXED_DATE = new Date(2026, 3, 30, 15, 4)

function createEditorMock(document: readonly unknown[] = []) {
  const cursorBlock = {
    id: 'cursor',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: '/', styles: {} }],
    children: [],
  }
  const updateBlock = vi.fn((_block: unknown, update: Record<string, unknown>) => ({
    ...cursorBlock,
    ...update,
    id: 'updated',
  }))
  const insertBlocks = vi.fn((blocks: unknown[]) => (
    blocks.map((block, index) => ({
      ...(block as Record<string, unknown>),
      id: `inserted-${index}`,
    }))
  ))

  return {
    cursorBlock,
    editor: {
      schema: {
        blockSchema: {
          codeBlock: { content: 'inline' },
          checkListItem: { content: 'inline' },
          mathBlock: { content: 'none' },
          paragraph: { content: 'inline' },
          table: { content: 'table' },
        },
        inlineContentSchema: {
          mathInline: { content: 'none' },
          wikilink: { content: 'none' },
        },
      },
      document,
      getTextCursorPosition: vi.fn(() => ({ block: cursorBlock })),
      insertBlocks,
      insertInlineContent: vi.fn(),
      setTextCursorPosition: vi.fn(),
      tryParseMarkdownToBlocks: vi.fn((markdown: string) => [{
        id: 'parsed',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: markdown, styles: {} }],
        children: [],
      }]),
      updateBlock,
    },
  }
}

function getItem(items: GrimoireSlashMenuItem[], key: string) {
  const item = items.find(candidate => candidate.key === key)
  if (!item) throw new Error(`Missing slash command ${key}`)
  return item
}

describe('grimoireSlashCommandItems', () => {
  it('formats local dates without UTC rollover', () => {
    expect(formatLocalDate(0, FIXED_DATE)).toBe('2026-04-30')
    expect(formatLocalDate(1, FIXED_DATE)).toBe('2026-05-01')
    expect(formatLocalDate(-1, FIXED_DATE)).toBe('2026-04-29')
  })

  it('exposes a broad markdown command catalog with friendly aliases', () => {
    const { editor } = createEditorMock()
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )
    const keys = items.map(item => item.key)

    expect(keys).toEqual(expect.arrayContaining([
      'grimoire_today',
      'grimoire_time_now',
      'grimoire_task_due_today',
      'grimoire_note_mention',
      'grimoire_wikilink',
      'grimoire_tag',
      'grimoire_simple_table',
      'grimoire_italic_text',
      'grimoire_strike_text',
      'grimoire_highlight_text',
      'grimoire_callout_warning',
      'grimoire_inline_math',
      'grimoire_mermaid',
      'grimoire_mermaid_flowchart',
      'grimoire_mermaid_sequence',
      'grimoire_mermaid_class',
      'grimoire_mermaid_state',
      'grimoire_mermaid_er',
      'grimoire_mermaid_gantt',
      'grimoire_mermaid_pie',
      'grimoire_mermaid_journey',
      'grimoire_mermaid_timeline',
      'grimoire_mermaid_mindmap',
      'grimoire_mermaid_use_case',
      'grimoire_mermaid_git_graph',
      'grimoire_date_placeholder',
      'grimoire_frontmatter_block',
      'grimoire_property_block',
      'grimoire_mood_log',
      'grimoire_weekly_review',
      'grimoire_monthly_review',
      'grimoire_task_rollover',
      'grimoire_timeline_entry',
      'grimoire_weather_placeholder',
      'grimoire_map_of_content',
      'grimoire_backlink_review',
      'grimoire_graph_node',
      'grimoire_table_of_contents',
      'grimoire_link_map',
      'grimoire_database_table',
      'grimoire_kanban_board',
      'grimoire_llm_research_note',
      'grimoire_prompt_lab',
      'grimoire_daily_journal',
      'grimoire_meeting_notes',
      'grimoire_week_calendar',
      'grimoire_month_calendar',
      'grimoire_cleanup_prompt',
      'grimoire_summarize_note',
      'grimoire_extract_actions',
      'grimoire_create_wikilinks',
      'grimoire_continue_writing',
      'grimoire_related_context',
      'grimoire_memory_recall',
      'grimoire_related_memory',
      'grimoire_memory_note',
      'grimoire_crystallize_memory',
      'grimoire_memory_diagnostics',
      'grimoire_handwritten_canvas',
      'grimoire_whiteboard_canvas',
      'grimoire_sketch_note',
    ]))
    expect(getItem(items, 'grimoire_today').subtext).toContain('2026-04-30')
    expect(getItem(items, 'grimoire_time_now').subtext).toContain('15:04')
    expect(getItem(items, 'grimoire_note_mention').aliases).toContain('@')
    expect(getItem(items, 'grimoire_tag').aliases).toContain('collection')
    expect(getItem(items, 'grimoire_cleanup_prompt').aliases).toContain('mem')
    expect(getItem(items, 'grimoire_related_context').aliases).toContain('heads up')
    expect(getItem(items, 'grimoire_week_calendar').aliases).toContain('week cal')
    expect(getItem(items, 'grimoire_month_calendar').aliases).toContain('month cal')
    expect(getItem(items, 'grimoire_frontmatter_block').aliases).toContain('frontmatter field')
    expect(getItem(items, 'grimoire_weekly_review').aliases).toContain('weekly retro')
    expect(getItem(items, 'grimoire_task_rollover').aliases).toContain('carry forward')
    expect(getItem(items, 'grimoire_map_of_content').aliases).toContain('obsidian')
    expect(getItem(items, 'grimoire_table_of_contents').aliases).toContain('toc')
    expect(getItem(items, 'grimoire_database_table').aliases).toContain('notion')
    expect(getItem(items, 'grimoire_llm_research_note').aliases).toContain('karpathy')
    expect(getItem(items, 'grimoire_memory_recall').aliases).toContain('chitragupta')
    expect(getItem(items, 'grimoire_crystallize_memory').aliases).toContain('write back')
    expect(getItem(items, 'grimoire_memory_diagnostics').aliases).toContain('contradiction')
    expect(getItem(items, 'grimoire_handwritten_canvas').aliases).toContain('handwriting')
    expect(getItem(items, 'grimoire_whiteboard_canvas').aliases).toContain('excalidraw')
    expect(getItem(items, 'grimoire_sketch_note').aliases).toContain('pencil note')
    expect(getItem(items, 'grimoire_mermaid_use_case').aliases).toContain('case diagram')
    expect(getItem(items, 'grimoire_mermaid_sequence').aliases).toContain('api flow')
  })

  it('inserts date and task commands as markdown-safe blocks', () => {
    const { cursorBlock, editor } = createEditorMock()
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_today').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ type: 'paragraph', content: '2026-04-30' }),
    )

    getItem(items, 'grimoire_task_due_tomorrow').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ type: 'checkListItem', content: 'Task due 2026-05-01' }),
    )
  })

  it('inserts inline links, math, and technical blocks', () => {
    const { cursorBlock, editor } = createEditorMock()
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_wikilink').onItemClick()
    expect(editor.insertInlineContent).toHaveBeenCalledWith(
      [{ type: 'wikilink', props: { target: 'Note Title' } }, ' '],
      { updateSelection: true },
    )

    getItem(items, 'grimoire_note_mention').onItemClick()
    expect(editor.insertInlineContent).toHaveBeenCalledWith('@', { updateSelection: true })

    getItem(items, 'grimoire_display_math').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ type: 'mathBlock', props: { latex: 'E=mc^2' } }),
    )

    getItem(items, 'grimoire_mermaid').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ type: 'codeBlock', props: { language: 'mermaid' } }),
    )
  })

  it('inserts Mermaid diagram templates for common technical diagrams', () => {
    const { cursorBlock, editor } = createEditorMock()
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_mermaid_sequence').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ content: expect.stringContaining('sequenceDiagram') }),
    )

    getItem(items, 'grimoire_mermaid_class').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ content: expect.stringContaining('classDiagram') }),
    )

    getItem(items, 'grimoire_mermaid_use_case').onItemClick()
    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({ content: expect.stringContaining('User((Writer))') }),
    )
  })

  it('falls back to portable markdown when custom schema nodes are unavailable', () => {
    const { editor } = createEditorMock()
    editor.schema.inlineContentSchema = {}
    delete editor.schema.blockSchema.mathBlock
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_wikilink').onItemClick()
    expect(editor.insertInlineContent).toHaveBeenCalledWith('[[Note Title]] ', {
      updateSelection: true,
    })

    getItem(items, 'grimoire_inline_math').onItemClick()
    expect(editor.insertInlineContent).toHaveBeenCalledWith('$E=mc^2$ ', {
      updateSelection: true,
    })

    getItem(items, 'grimoire_display_math').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith('$$\nE=mc^2\n$$')
  })

  it('parses templates through the markdown adapter before insertion', () => {
    const { editor } = createEditorMock()
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_meeting_notes').onItemClick()

    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Meeting - 2026-04-30'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('Actions'),
    )

    getItem(items, 'grimoire_week_calendar').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Week Calendar - 2026-04-27 to 2026-05-03'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('| Thu | 2026-04-30 |'),
    )

    getItem(items, 'grimoire_month_calendar').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Calendar - April 2026'),
    )

    getItem(items, 'grimoire_frontmatter_block').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('date: 2026-04-30'),
    )

    getItem(items, 'grimoire_weekly_review').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Weekly Review - 2026-04-27 to 2026-05-03'),
    )

    getItem(items, 'grimoire_monthly_review').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Monthly Review - April 2026'),
    )

    getItem(items, 'grimoire_weather_placeholder').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('| 15:04 |  |  |  |'),
    )

    getItem(items, 'grimoire_map_of_content').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Map of Content - 2026-04-30'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('[[Source Note]] -> [[Target Note]]'),
    )

    getItem(items, 'grimoire_link_map').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('| From | Relation | To | Why |'),
    )

    getItem(items, 'grimoire_llm_research_note').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## LLM Research Note - 2026-04-30'),
    )

    getItem(items, 'grimoire_memory_recall').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Recall - 2026-04-30'),
    )

    getItem(items, 'grimoire_memory_diagnostics').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Memory Diagnostics - 2026-04-30'),
    )

    getItem(items, 'grimoire_handwritten_canvas').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('```grimoire-canvas\ntype: handwriting'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('attachments/handwriting-2026-04-30-150400.grimoire-canvas.json'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('preview: attachments/handwriting-2026-04-30-150400.png'),
    )

    getItem(items, 'grimoire_whiteboard_canvas').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('type: whiteboard'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('attachments/whiteboard-2026-04-30-150400.png'),
    )

    getItem(items, 'grimoire_sketch_note').onItemClick()
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('## Sketch Note - 2026-04-30'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('Prompt\n- \n\n## Handwritten Canvas - 2026-04-30'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('```grimoire-canvas\ntype: handwriting'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('Notes\n- '),
    )
  })

  it('builds a table of contents from current note headings', () => {
    const { editor } = createEditorMock([
      {
        id: 'heading-1',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: 'Project Plan', styles: {} }],
        children: [],
      },
      {
        id: 'heading-2',
        type: 'heading',
        props: { level: 2 },
        content: [{ type: 'text', text: 'Risks & Decisions', styles: {} }],
        children: [],
      },
    ])
    const items = getGrimoireCustomSlashMenuItems(
      editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0],
      FIXED_DATE,
    )

    getItem(items, 'grimoire_table_of_contents').onItemClick()

    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('- [Project Plan](#project-plan)'),
    )
    expect(editor.tryParseMarkdownToBlocks).toHaveBeenCalledWith(
      expect.stringContaining('  - [Risks & Decisions](#risks-decisions)'),
    )
  })
})

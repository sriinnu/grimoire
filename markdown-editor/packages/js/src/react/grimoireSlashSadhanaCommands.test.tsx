import { describe, expect, it, vi } from 'vitest'
import { buildDateContext, type GrimoireSlashMenuEditor } from './grimoireSlashCommandActions'
import { GRIMOIRE_SADHANA_SLASH_COMMANDS } from './grimoireSlashSadhanaCommands'

const FIXED_DATE = new Date(2026, 3, 30, 15, 4)

function createEditorMock() {
  const cursorBlock = { id: 'cursor', type: 'paragraph', content: [] }
  return {
    cursorBlock,
    editor: {
      schema: {
        blockSchema: {
          paragraph: { content: 'inline' },
        },
      },
      getTextCursorPosition: vi.fn(() => ({ block: cursorBlock })),
      insertBlocks: vi.fn(),
      setTextCursorPosition: vi.fn(),
      tryParseMarkdownToBlocks: vi.fn((markdown: string) => [{
        id: 'parsed',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: markdown, styles: {} }],
        children: [],
      }]),
      updateBlock: vi.fn(),
    },
  }
}

function runCommand(key: string) {
  const command = GRIMOIRE_SADHANA_SLASH_COMMANDS.find(item => item.key === key)
  if (!command) throw new Error(`Missing command ${key}`)
  const { cursorBlock, editor } = createEditorMock()
  command.run(editor as unknown as GrimoireSlashMenuEditor, buildDateContext(FIXED_DATE))
  return { cursorBlock, editor }
}

describe('grimoireSlashSadhanaCommands', () => {
  it('adds Spanda-inspired practice commands as portable markdown', () => {
    expect(GRIMOIRE_SADHANA_SLASH_COMMANDS.map(command => command.key)).toEqual([
      'grimoire_sadhana_session',
      'grimoire_panchanga_snapshot',
      'grimoire_japa_log',
      'grimoire_pranayama_log',
      'grimoire_practice_prescription',
    ])
  })

  it('inserts practice sessions with timer and moment context', () => {
    const { cursorBlock, editor } = runCommand('grimoire_sadhana_session')

    expect(editor.updateBlock).toHaveBeenCalledWith(
      cursorBlock,
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('## Practice Session - 2026-04-30 15:04') }),
        ]),
      }),
    )
  })

  it('captures panchanga and prescription tables', () => {
    const snapshot = runCommand('grimoire_panchanga_snapshot').editor
    const prescription = runCommand('grimoire_practice_prescription').editor

    expect(snapshot.updateBlock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('| Tithi |') }),
        ]),
      }),
    )
    expect(prescription.updateBlock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.objectContaining({ text: expect.stringContaining('| Candidate | Type | Why now | Score |') }),
        ]),
      }),
    )
  })
})

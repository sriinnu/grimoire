import { describe, expect, it } from 'vitest'
import { blockHandleGlyph, FALLBACK_HANDLE_GLYPH } from './blockHandleGlyph'

describe('blockHandleGlyph', () => {
  it('names every text block by what it is', () => {
    expect(blockHandleGlyph({ type: 'paragraph' }).label).toBe('Paragraph')
    expect(blockHandleGlyph({ type: 'bulletListItem' }).label).toBe('Bullet list')
    expect(blockHandleGlyph({ type: 'numberedListItem' }).label).toBe('Numbered list')
    expect(blockHandleGlyph({ type: 'checkListItem' }).label).toBe('Checklist')
    expect(blockHandleGlyph({ type: 'quote' }).label).toBe('Quote')
    expect(blockHandleGlyph({ type: 'codeBlock' }).label).toBe('Code block')
    expect(blockHandleGlyph({ type: 'table' }).label).toBe('Table')
  })

  it('reads the heading level from props and falls back to H1', () => {
    expect(blockHandleGlyph({ type: 'heading', props: { level: 3 } }).label).toBe('Heading 3')
    expect(blockHandleGlyph({ type: 'heading' }).label).toBe('Heading 1')
    expect(blockHandleGlyph({ type: 'heading', props: { level: 9 } }).label).toBe('Heading 1')
  })

  it('falls back to a grip for unknown or missing blocks', () => {
    expect(blockHandleGlyph({ type: 'video' })).toBe(FALLBACK_HANDLE_GLYPH)
    expect(blockHandleGlyph(undefined)).toBe(FALLBACK_HANDLE_GLYPH)
  })
})

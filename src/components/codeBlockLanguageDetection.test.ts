import { describe, expect, it, vi } from 'vitest'
import {
  applyDetectedCodeBlockLanguage,
  type CodeLanguageDetectionEditor,
} from './codeBlockLanguageDetection'

function makeEditor(block: unknown): CodeLanguageDetectionEditor & {
  updateBlock: ReturnType<typeof vi.fn>
} {
  return {
    getTextCursorPosition: () => ({ block }),
    updateBlock: vi.fn(),
  }
}

describe('applyDetectedCodeBlockLanguage', () => {
  it('sets the active plain code block language once detected', () => {
    const editor = makeEditor({
      id: 'block-1',
      type: 'codeBlock',
      props: { language: 'text' },
      content: 'def greet(name):\n    return f"hi {name}"',
    })

    expect(applyDetectedCodeBlockLanguage(editor)).toBe('python')
    expect(editor.updateBlock).toHaveBeenCalledWith('block-1', { props: { language: 'python' } })
  })

  it('does not override manually selected languages', () => {
    const editor = makeEditor({
      id: 'block-1',
      type: 'codeBlock',
      props: { language: 'rust' },
      content: 'def greet(name):\n    return f"hi {name}"',
    })

    expect(applyDetectedCodeBlockLanguage(editor)).toBeNull()
    expect(editor.updateBlock).not.toHaveBeenCalled()
  })
})

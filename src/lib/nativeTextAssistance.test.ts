import { describe, expect, it } from 'vitest'
import { disableNativeTextAssistance } from './nativeTextAssistance'

describe('disableNativeTextAssistance', () => {
  it('turns native assistance off on editable text', () => {
    const root = document.createElement('div')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    root.append(editable)
    disableNativeTextAssistance(root)
    expect(editable.getAttribute('spellcheck')).toBe('false')
    expect(editable.getAttribute('autocorrect')).toBe('off')
  })

  it('can leave spellcheck on while still turning autocorrect off', () => {
    const root = document.createElement('div')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    root.append(editable)
    disableNativeTextAssistance(root, { keepSpellcheck: true })
    expect(editable.getAttribute('spellcheck')).toBe('true')
    expect(editable.getAttribute('autocorrect')).toBe('off')
  })
})

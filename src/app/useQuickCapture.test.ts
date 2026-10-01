import { describe, expect, it } from 'vitest'
import { isQuickCaptureShortcut } from './useQuickCapture'

const base = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: true, code: 'Space', key: ' ' }

describe('isQuickCaptureShortcut', () => {
  it('matches Cmd+Shift+Space and Ctrl+Shift+Space', () => {
    expect(isQuickCaptureShortcut({ ...base, metaKey: true })).toBe(true)
    expect(isQuickCaptureShortcut({ ...base, ctrlKey: true })).toBe(true)
  })

  it('ignores near misses', () => {
    expect(isQuickCaptureShortcut({ ...base, metaKey: true, shiftKey: false })).toBe(false)
    expect(isQuickCaptureShortcut({ ...base, metaKey: true, altKey: true })).toBe(false)
    expect(isQuickCaptureShortcut(base)).toBe(false)
    expect(isQuickCaptureShortcut({ ...base, metaKey: true, code: 'KeyK', key: 'k' })).toBe(false)
  })
})

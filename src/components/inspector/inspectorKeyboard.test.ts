import { describe, expect, it } from 'vitest'
import { inspectorJumpTarget, isInspectorEscape } from './inspectorKeyboard'

function key(overrides: Partial<KeyboardEvent> & { key: string }): Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> {
  return { code: '', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...overrides }
}

describe('inspectorJumpTarget', () => {
  it('maps ⌃1/2/3 to the three questions', () => {
    expect(inspectorJumpTarget(key({ key: '1', ctrlKey: true }))).toBe('about')
    expect(inspectorJumpTarget(key({ key: '2', code: 'Digit2', ctrlKey: true }))).toBe('connections')
    expect(inspectorJumpTarget(key({ key: '3', ctrlKey: true }))).toBe('history')
  })

  it('ignores other chords, including the BlockNote heading chords', () => {
    expect(inspectorJumpTarget(key({ key: '1', metaKey: true }))).toBeNull()
    expect(inspectorJumpTarget(key({ key: '1', metaKey: true, altKey: true }))).toBeNull()
    expect(inspectorJumpTarget(key({ key: '1', ctrlKey: true, shiftKey: true }))).toBeNull()
    expect(inspectorJumpTarget(key({ key: '4', ctrlKey: true }))).toBeNull()
  })
})

describe('isInspectorEscape', () => {
  it('closes from plain focus but not from fields or editable text', () => {
    const input = document.createElement('input')
    const editable = document.createElement('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isInspectorEscape(key({ key: 'Escape' }), document.createElement('button'))).toBe(true)
    expect(isInspectorEscape(key({ key: 'Escape' }), input)).toBe(false)
    expect(isInspectorEscape(key({ key: 'Escape' }), editable)).toBe(false)
    expect(isInspectorEscape(key({ key: 'Enter' }), document.createElement('button'))).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEditorTogglePreference, spellcheckPreference, typewriterPreference } from './editorTogglePreference'

describe('createEditorTogglePreference', () => {
  afterEach(() => localStorage.clear())

  it('starts from the default and persists toggles', () => {
    const pref = createEditorTogglePreference('test:toggle', false)
    expect(pref.isEnabled()).toBe(false)
    const listener = vi.fn()
    pref.subscribe(listener)
    pref.toggle()
    expect(pref.isEnabled()).toBe(true)
    expect(listener).toHaveBeenCalledOnce()
    expect(localStorage.getItem('test:toggle')).toBe('1')
    pref.setEnabled(true)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('restores a stored value', () => {
    localStorage.setItem('test:restore', '1')
    const pref = createEditorTogglePreference('test:restore', false)
    expect(pref.isEnabled()).toBe(true)
    localStorage.setItem('test:restore', '0')
    pref.resetForTests()
    expect(pref.isEnabled()).toBe(false)
  })

  it('ships typewriter and spellcheck off by default', () => {
    typewriterPreference.resetForTests()
    spellcheckPreference.resetForTests()
    expect(typewriterPreference.isEnabled()).toBe(false)
    expect(spellcheckPreference.isEnabled()).toBe(false)
  })
})

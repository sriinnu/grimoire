import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import {
  cycleReadingWidth,
  getReadingWidth,
  isReadingWidthShortcut,
  readingWidthCssValue,
  resetReadingWidthForTests,
  setReadingWidth,
  subscribeReadingWidth,
} from './readingWidthPreference'

describe('readingWidthPreference', () => {
  afterEach(() => {
    localStorage.removeItem(APP_STORAGE_KEYS.readingWidth)
    resetReadingWidthForTests()
  })

  it('defaults to Comfortable, which leaves the theme measure alone', () => {
    expect(getReadingWidth()).toBe('comfortable')
    expect(readingWidthCssValue('comfortable')).toBeNull()
  })

  it('persists a chosen width and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeReadingWidth(listener)
    setReadingWidth('wide')
    expect(getReadingWidth()).toBe('wide')
    expect(localStorage.getItem(APP_STORAGE_KEYS.readingWidth)).toBe('wide')
    expect(listener).toHaveBeenCalledTimes(1)
    setReadingWidth('wide')
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('restores a stored width and clears storage when back to the default', () => {
    localStorage.setItem(APP_STORAGE_KEYS.readingWidth, 'narrow')
    resetReadingWidthForTests()
    expect(getReadingWidth()).toBe('narrow')
    setReadingWidth('comfortable')
    expect(localStorage.getItem(APP_STORAGE_KEYS.readingWidth)).toBeNull()
  })

  it('ignores junk in storage', () => {
    localStorage.setItem(APP_STORAGE_KEYS.readingWidth, 'gigantic')
    resetReadingWidthForTests()
    expect(getReadingWidth()).toBe('comfortable')
  })

  it('cycles Narrow → Comfortable → Wide → Full → Narrow', () => {
    setReadingWidth('narrow')
    expect(cycleReadingWidth()).toBe('comfortable')
    expect(cycleReadingWidth()).toBe('wide')
    expect(cycleReadingWidth()).toBe('full')
    expect(cycleReadingWidth()).toBe('narrow')
  })

  it('maps each width to a CSS measure', () => {
    expect(readingWidthCssValue('narrow')).toBe('620px')
    expect(readingWidthCssValue('wide')).toBe('920px')
    expect(readingWidthCssValue('full')).toBe('100%')
  })

  it('recognises Cmd+Alt+W and Ctrl+Alt+W, including the Mac ∑ keysym', () => {
    const base = { altKey: true, shiftKey: false, code: 'KeyW', key: 'w' }
    expect(isReadingWidthShortcut({ ...base, metaKey: true, ctrlKey: false })).toBe(true)
    expect(isReadingWidthShortcut({ ...base, metaKey: false, ctrlKey: true })).toBe(true)
    expect(isReadingWidthShortcut({ ...base, metaKey: true, ctrlKey: false, code: '', key: '∑' })).toBe(true)
    expect(isReadingWidthShortcut({ ...base, metaKey: true, ctrlKey: false, altKey: false })).toBe(false)
    expect(isReadingWidthShortcut({ ...base, metaKey: true, ctrlKey: false, shiftKey: true })).toBe(false)
    expect(isReadingWidthShortcut({ ...base, metaKey: false, ctrlKey: false })).toBe(false)
  })
})

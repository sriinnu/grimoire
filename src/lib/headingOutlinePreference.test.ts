import { afterEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import {
  isHeadingOutlineEnabled,
  resetHeadingOutlinePreferenceForTests,
  subscribeHeadingOutline,
  toggleHeadingOutline,
} from './headingOutlinePreference'

describe('headingOutlinePreference', () => {
  afterEach(() => {
    localStorage.removeItem(APP_STORAGE_KEYS.headingOutline)
    resetHeadingOutlinePreferenceForTests()
  })

  it('defaults to enabled', () => {
    resetHeadingOutlinePreferenceForTests()
    expect(isHeadingOutlineEnabled()).toBe(true)
  })

  it('persists toggles and notifies subscribers', () => {
    resetHeadingOutlinePreferenceForTests()
    const listener = vi.fn()
    const unsubscribe = subscribeHeadingOutline(listener)

    toggleHeadingOutline()
    expect(isHeadingOutlineEnabled()).toBe(false)
    expect(localStorage.getItem(APP_STORAGE_KEYS.headingOutline)).toBe('0')
    expect(listener).toHaveBeenCalledTimes(1)

    toggleHeadingOutline()
    expect(localStorage.getItem(APP_STORAGE_KEYS.headingOutline)).toBe('1')
    unsubscribe()
    toggleHeadingOutline()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('restores a stored off state', () => {
    localStorage.setItem(APP_STORAGE_KEYS.headingOutline, '0')
    resetHeadingOutlinePreferenceForTests()
    expect(isHeadingOutlineEnabled()).toBe(false)
  })
})

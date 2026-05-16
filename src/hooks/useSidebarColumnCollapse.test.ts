import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'
import { useSidebarColumnCollapse } from './useSidebarColumnCollapse'

describe('useSidebarColumnCollapse', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => { storage[key] = value },
        removeItem: (key: string) => { delete storage[key] },
      },
    })
  })

  it('defaults to expanded when no preference exists', () => {
    const { result } = renderHook(() => useSidebarColumnCollapse())

    expect(result.current.sidebarColumnCollapsed).toBe(false)
  })

  it('loads a persisted collapsed preference', () => {
    localStorage.setItem(APP_STORAGE_KEYS.sidebarColumnCollapsed, '1')

    const { result } = renderHook(() => useSidebarColumnCollapse())

    expect(result.current.sidebarColumnCollapsed).toBe(true)
  })

  it('persists collapse changes and clears the legacy key', () => {
    localStorage.setItem(LEGACY_APP_STORAGE_KEYS.sidebarColumnCollapsed, '1')

    const { result } = renderHook(() => useSidebarColumnCollapse())

    act(() => result.current.setSidebarColumnCollapsed(false))

    expect(result.current.sidebarColumnCollapsed).toBe(false)
    expect(localStorage.getItem(APP_STORAGE_KEYS.sidebarColumnCollapsed)).toBe('0')
    expect(localStorage.getItem(LEGACY_APP_STORAGE_KEYS.sidebarColumnCollapsed)).toBeNull()
  })
})

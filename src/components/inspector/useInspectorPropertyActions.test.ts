import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { useInspectorPropertyActions } from './useInspectorPropertyActions'

describe('useInspectorPropertyActions', () => {
  it('binds the missing-type action to the entry type when one is set', async () => {
    const onCreateMissingType = vi.fn().mockResolvedValue(true)
    const entry = makeEntry({ path: '/vault/note.md', isA: 'Ghost' })

    const { result } = renderHook(() =>
      useInspectorPropertyActions({ entry, onCreateMissingType }),
    )

    await result.current.handleCreateMissingType?.('Recipe')

    expect(onCreateMissingType).toHaveBeenCalledWith('/vault/note.md', 'Ghost', 'Recipe')
  })

  it('binds the missing-type action for untyped entries using the next type name', async () => {
    const onCreateMissingType = vi.fn().mockResolvedValue(true)
    const entry = makeEntry({ path: '/vault/note.md', isA: null })

    const { result } = renderHook(() =>
      useInspectorPropertyActions({ entry, onCreateMissingType }),
    )

    expect(result.current.handleCreateMissingType).toBeDefined()
    await result.current.handleCreateMissingType?.('Recipe')

    expect(onCreateMissingType).toHaveBeenCalledWith('/vault/note.md', 'Recipe', 'Recipe')
  })

  it('returns no missing-type action without an entry or callback', () => {
    const { result: withoutEntry } = renderHook(() =>
      useInspectorPropertyActions({ entry: null, onCreateMissingType: vi.fn() }),
    )
    const { result: withoutCallback } = renderHook(() =>
      useInspectorPropertyActions({ entry: makeEntry({ isA: null }) }),
    )

    expect(withoutEntry.current.handleCreateMissingType).toBeUndefined()
    expect(withoutCallback.current.handleCreateMissingType).toBeUndefined()
  })
})

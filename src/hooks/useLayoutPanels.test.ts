import { afterEach, describe, it, expect } from 'vitest'
import { act } from '@testing-library/react'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { renderHook, act } from '@testing-library/react'
import { useLayoutPanels, COLUMN_MIN_WIDTHS } from './useLayoutPanels'

const wideViewport = 1920
const fullLayoutResizeHandlesWidth = 12

describe('useLayoutPanels', () => {
  afterEach(() => localStorage.clear())

  it('exports column minimum widths', () => {
    expect(COLUMN_MIN_WIDTHS.sidebar).toBe(180)
    expect(COLUMN_MIN_WIDTHS.noteList).toBe(220)
    expect(COLUMN_MIN_WIDTHS.editor).toBe(560)
    expect(COLUMN_MIN_WIDTHS.inspector).toBe(240)
  })

  it('returns default widths', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    expect(result.current.sidebarWidth).toBe(256)
    expect(result.current.noteListWidth).toBe(340)
    expect(result.current.inspectorWidth).toBe(280)
  })

  it('uses laptop defaults that fit the Second Brain rail when it was left open', () => {
    localStorage.setItem(APP_STORAGE_KEYS.inspectorOpen, '1')
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: 1440 }))

    expect(result.current.inspectorCollapsed).toBe(false)
    expect(
      result.current.sidebarWidth
      + result.current.noteListWidth
      + result.current.inspectorWidth
      + COLUMN_MIN_WIDTHS.editor
      + fullLayoutResizeHandlesWidth,
    ).toBeLessThanOrEqual(1440)
    expect(result.current.inspectorWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.inspector)
    expect(result.current.sidebarWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.sidebar)
    expect(result.current.noteListWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.noteList)
  })

  it('collapses the inspector when the native rail cannot fit, even if left open', () => {
    localStorage.setItem(APP_STORAGE_KEYS.inspectorOpen, '1')
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: 1180 }))

    expect(result.current.inspectorCollapsed).toBe(true)
    expect(
      result.current.sidebarWidth
      + result.current.noteListWidth
      + COLUMN_MIN_WIDTHS.editor
      + fullLayoutResizeHandlesWidth,
    ).toBeLessThanOrEqual(1180)
    expect(result.current.sidebarWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.sidebar)
    expect(result.current.noteListWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.noteList)
  })

  it('keeps compact navigation beside the rail on smaller desktop windows', () => {
    localStorage.setItem(APP_STORAGE_KEYS.inspectorOpen, '1')
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: 1280 }))

    expect(result.current.inspectorCollapsed).toBe(false)
    expect(
      result.current.sidebarWidth
      + result.current.noteListWidth
      + result.current.inspectorWidth
      + COLUMN_MIN_WIDTHS.editor
      + fullLayoutResizeHandlesWidth,
    ).toBeLessThanOrEqual(1280)
    expect(result.current.sidebarWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.sidebar)
    expect(result.current.noteListWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.noteList)
  })

  it('keeps collapsed navigation within the editor target', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: 1024 }))

    expect(result.current.inspectorCollapsed).toBe(true)
    expect(
      result.current.sidebarWidth
      + result.current.noteListWidth
      + COLUMN_MIN_WIDTHS.editor
      + fullLayoutResizeHandlesWidth,
    ).toBeLessThanOrEqual(1024)
    expect(result.current.sidebarWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.sidebar)
    expect(result.current.noteListWidth).toBeGreaterThanOrEqual(COLUMN_MIN_WIDTHS.noteList)
  })

  it('falls back to minimum navigation columns when the viewport is tighter than the editor target', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: 900 }))

    expect(result.current.inspectorCollapsed).toBe(true)
    expect(result.current.sidebarWidth).toBe(COLUMN_MIN_WIDTHS.sidebar)
    expect(result.current.noteListWidth).toBe(COLUMN_MIN_WIDTHS.noteList)
  })

  it('clamps sidebar resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleSidebarResize(-500))
    expect(result.current.sidebarWidth).toBe(COLUMN_MIN_WIDTHS.sidebar)
  })

  it('clamps note list resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleNoteListResize(-500))
    expect(result.current.noteListWidth).toBe(COLUMN_MIN_WIDTHS.noteList)
  })

  it('clamps inspector resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleInspectorResize(500))
    expect(result.current.inspectorWidth).toBe(COLUMN_MIN_WIDTHS.inspector)
  })

  it('clamps sidebar resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleSidebarResize(500))
    expect(result.current.sidebarWidth).toBe(400)
  })

  it('clamps note list resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleNoteListResize(500))
    expect(result.current.noteListWidth).toBe(500)
  })

  it('clamps inspector resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => result.current.handleInspectorResize(-500))
    expect(result.current.inspectorWidth).toBe(500)
  })

  it('starts with the inspector closed on first launch, even on wide viewports', () => {
    const { result } = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    expect(result.current.inspectorCollapsed).toBe(true)
  })

  it('remembers the inspector choice across launches', () => {
    const first = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    act(() => first.result.current.setInspectorCollapsed((collapsed) => !collapsed))
    expect(localStorage.getItem(APP_STORAGE_KEYS.inspectorOpen)).toBe('1')

    const second = renderHook(() => useLayoutPanels({ viewportWidth: wideViewport }))
    expect(second.result.current.inspectorCollapsed).toBe(false)
  })

  it('never persists the choice from note windows that force a layout', () => {
    const { result } = renderHook(() => useLayoutPanels({ initialInspectorCollapsed: true, viewportWidth: wideViewport }))
    act(() => result.current.setInspectorCollapsed(false))
    expect(localStorage.getItem(APP_STORAGE_KEYS.inspectorOpen)).toBeNull()
  })

  it('accepts initial inspector collapsed override', () => {
    const { result } = renderHook(() => useLayoutPanels({
      initialInspectorCollapsed: true,
      viewportWidth: wideViewport,
    }))
    expect(result.current.inspectorCollapsed).toBe(true)
  })
})

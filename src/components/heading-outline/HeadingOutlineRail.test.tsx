import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../../constants/appStorage'
import {
  resetHeadingOutlinePreferenceForTests,
  setHeadingOutlineEnabled,
} from '../../lib/headingOutlinePreference'
import { extractNoteHeadings } from '../../utils/noteNavigation'
import { buildOutlineRailItems } from './headingOutlineModel'
import { HeadingOutlineRail } from './HeadingOutlineRail'
import { OUTLINE_DEBOUNCE_MS, useHeadingOutline } from './useOutlineHeadings'

const NOTE = '# Intro\n\nText\n\n## Setup\n\nMore\n\n### Details\n'

function mountEditorDom(): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'editor-scroll-area'
  container.innerHTML = [
    ['b1', 1, 'Intro'],
    ['b2', 2, 'Setup'],
    ['b3', 3, 'Details'],
  ].map(([id, level, text]) => (
    `<div class="bn-block-outer" data-id="${id}"><div data-content-type="heading" data-level="${level}"><h${level}>${text}</h${level}></div></div>`
  )).join('')
  document.body.append(container)
  return container
}

function stubTop(element: Element, top: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect)
}

describe('HeadingOutlineRail', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = mountEditorDom()
    Element.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  function renderRail(editor = { setTextCursorPosition: vi.fn(), focus: vi.fn() }) {
    const headings = extractNoteHeadings(NOTE)
    const outline = { headings, items: buildOutlineRailItems(headings), scrollRef: { current: container } }
    render(<HeadingOutlineRail outline={outline} editor={editor} />)
    return editor
  }

  it('lists headings with level indentation', () => {
    renderRail()
    const items = screen.getAllByRole('button')
    expect(items.map((item) => item.textContent)).toEqual(['Intro', 'Setup', 'Details'])
    expect(items[2].style.getPropertyValue('--heading-outline-indent')).toBe('2')
    expect(screen.getByRole('navigation', { name: 'On this page' })).toBeInTheDocument()
  })

  it('scrolls to the heading and places the caret there on click', () => {
    const editor = renderRail()
    fireEvent.click(screen.getByRole('button', { name: 'Setup' }))

    const setupHeading = container.querySelector('[data-id="b2"] [data-content-type="heading"]')
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(setupHeading)
    expect(editor.setTextCursorPosition).toHaveBeenCalledWith('b2', 'end')
    expect(editor.focus).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute('aria-current', 'location')
  })

  it('highlights the heading currently in view as the canvas scrolls', async () => {
    stubTop(container, 0)
    const headingEls = container.querySelectorAll('[data-content-type="heading"]')
    stubTop(headingEls[0], -400)
    stubTop(headingEls[1], 40)
    stubTop(headingEls[2], 600)
    renderRail()

    await act(async () => {
      container.dispatchEvent(new Event('scroll'))
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    })

    expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('button', { name: 'Intro' })).not.toHaveAttribute('data-active')
  })
})

describe('useHeadingOutline', () => {
  let observed: Array<(width: number) => void> = []

  beforeEach(() => {
    vi.useFakeTimers()
    observed = []
    vi.stubGlobal('ResizeObserver', class {
      private callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) { this.callback = callback }
      observe() {
        observed.push((width) => this.callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver))
      }
      disconnect() {}
      unobserve() {}
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.removeItem(APP_STORAGE_KEYS.headingOutline)
    resetHeadingOutlinePreferenceForTests()
  })

  function renderOutline(content: string) {
    const root = document.createElement('div')
    return renderHook(({ text }) => {
      const outline = useHeadingOutline(text, true)
      outline.rootRef.current = root
      return outline
    }, { initialProps: { text: content } })
  }

  it('shows only on wide canvases with three or more headings, after the debounce', () => {
    const { result, rerender } = renderOutline('')
    // The root ref is assigned during render, so re-run effects once it exists.
    rerender({ text: '' })
    expect(result.current.visible).toBe(false)

    act(() => observed.forEach((notify) => notify(1200)))
    rerender({ text: NOTE })
    expect(result.current.visible).toBe(false)

    act(() => { vi.advanceTimersByTime(OUTLINE_DEBOUNCE_MS) })
    expect(result.current.items).toHaveLength(3)
    expect(result.current.visible).toBe(true)

    act(() => observed.forEach((notify) => notify(900)))
    expect(result.current.visible).toBe(false)
  })

  it('hides when the persisted toggle is off', () => {
    const { result, rerender } = renderOutline(NOTE)
    rerender({ text: NOTE })
    act(() => observed.forEach((notify) => notify(1400)))
    act(() => { vi.advanceTimersByTime(OUTLINE_DEBOUNCE_MS) })
    expect(result.current.visible).toBe(true)

    act(() => setHeadingOutlineEnabled(false))
    expect(result.current.visible).toBe(false)
  })
})

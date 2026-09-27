import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { WikilinkPeek } from './WikilinkPeek'
import { peekCardPosition } from './wikilinkPeekModel'
import { PEEK_CLOSE_GRACE_MS, PEEK_OPEN_DELAY_MS, PEEK_TYPING_QUIET_MS } from './useWikilinkPeek'

const entries = [{
  path: '/vault/alpha.md', filename: 'alpha.md', title: 'Project Alpha', isA: 'Project',
  aliases: [], belongsTo: [], relatedTo: [], status: null, archived: false,
  modifiedAt: null, createdAt: null, fileSize: 0, snippet: 'Alpha is the first project.', wordCount: 5,
  relationships: {}, icon: null, color: null, order: null, sidebarLabel: null,
  template: null, sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
}] as unknown as VaultEntry[]

function Harness() {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref}>
      <span className="wikilink" data-target="alpha"><span data-testid="alpha-inner">Project Alpha</span></span>
      <span className="wikilink wikilink--broken" data-target="new-idea">New Idea</span>
      <WikilinkPeek containerRef={ref} entries={entries} />
    </div>
  )
}

function hoverLink(target: string) {
  const el = document.querySelector(`[data-target="${target}"]`) as HTMLElement
  fireEvent.pointerOver(el)
  return el
}

describe('WikilinkPeek', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.removeAttribute('data-writing')
  })

  it('shows the target note after the hover delay', () => {
    render(<Harness />)
    hoverLink('alpha')
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS - 1) })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    const card = screen.getByTestId('wikilink-peek')
    expect(card).toHaveTextContent('Project Alpha')
    expect(card).toHaveTextContent('Project')
    expect(card).toHaveTextContent('Alpha is the first project.')
  })

  it('shows a quiet placeholder for broken links', () => {
    render(<Harness />)
    hoverLink('new-idea')
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS) })
    const card = screen.getByTestId('wikilink-peek')
    expect(card).toHaveAttribute('data-kind', 'missing')
    expect(card).toHaveTextContent('No page yet')
  })

  it('does not open when the pointer leaves before the delay', () => {
    render(<Harness />)
    const link = hoverLink('alpha')
    fireEvent.pointerOut(link, { relatedTarget: document.body })
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS * 2) })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
  })

  it('stays open while moving within the link and into the card', () => {
    render(<Harness />)
    const link = hoverLink('alpha')
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS) })
    fireEvent.pointerOut(link, { relatedTarget: screen.getByTestId('alpha-inner') })
    act(() => { vi.advanceTimersByTime(PEEK_CLOSE_GRACE_MS * 2) })
    expect(screen.getByTestId('wikilink-peek')).toBeInTheDocument()

    fireEvent.pointerOut(link, { relatedTarget: document.body })
    fireEvent.pointerEnter(screen.getByTestId('wikilink-peek'))
    act(() => { vi.advanceTimersByTime(PEEK_CLOSE_GRACE_MS * 2) })
    expect(screen.getByTestId('wikilink-peek')).toBeInTheDocument()

    fireEvent.pointerLeave(screen.getByTestId('wikilink-peek'))
    act(() => { vi.advanceTimersByTime(PEEK_CLOSE_GRACE_MS) })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
  })

  it.each([
    ['Escape', () => fireEvent.keyDown(window, { key: 'Escape' })],
    ['any key', () => fireEvent.keyDown(window, { key: 'a' })],
    ['scroll', () => fireEvent.scroll(window)],
  ])('hides on %s', (_label, dismiss) => {
    render(<Harness />)
    hoverLink('alpha')
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS) })
    expect(screen.getByTestId('wikilink-peek')).toBeInTheDocument()
    act(() => { dismiss() })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
  })

  it('stays out of the way while the user is typing', () => {
    render(<Harness />)
    fireEvent.keyDown(window, { key: 'a' })
    hoverLink('alpha')
    act(() => { vi.advanceTimersByTime(PEEK_TYPING_QUIET_MS) })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
  })

  it('respects the writing-focus flag on the document root', () => {
    document.documentElement.setAttribute('data-writing', '')
    render(<Harness />)
    hoverLink('alpha')
    act(() => { vi.advanceTimersByTime(PEEK_OPEN_DELAY_MS) })
    expect(screen.queryByTestId('wikilink-peek')).toBeNull()
  })
})

describe('peekCardPosition', () => {
  const viewport = { width: 800, height: 600 }

  it('sits below the link when there is room', () => {
    expect(peekCardPosition({ top: 100, bottom: 118, left: 50 }, viewport)).toEqual({ left: 50, top: 124 })
  })

  it('flips above near the bottom edge and clamps to the viewport', () => {
    expect(peekCardPosition({ top: 560, bottom: 578, left: 700 }, viewport)).toEqual({ left: 492, bottom: 46 })
  })
})

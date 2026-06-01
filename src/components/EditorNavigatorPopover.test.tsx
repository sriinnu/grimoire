import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorNavigatorPopover } from './EditorNavigatorPopover'

const originalMatchMedia = window.matchMedia
const originalScrollIntoView = Element.prototype.scrollIntoView

const note = `# Build Grimoire App

## Headings

Content.`
const linkedNote = `${note}

Related: [[Core Memory]] and [[projects/grimoire|Grimoire Project]].`

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

function renderHeadingNavigator(scrollIntoView: ReturnType<typeof vi.fn>) {
  Element.prototype.scrollIntoView = scrollIntoView

  render(
    <>
      <div className="editor__blocknote-container">
        <div data-content-type="heading">
          <div role="heading" aria-level={2}>
            Headings
          </div>
          <span>Block controls</span>
        </div>
      </div>
      <EditorNavigatorPopover content={note} mode="toc" onModeChange={() => {}} />
    </>,
  )
}

describe('EditorNavigatorPopover', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Element.prototype.scrollIntoView = originalScrollIntoView
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  })

  it('jumps to accessible editor headings rendered with role metadata', () => {
    const scrollIntoView = vi.fn()
    setReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 0
    })
    renderHeadingNavigator(scrollIntoView)

    fireEvent.click(screen.getByRole('button', { name: 'H2 Headings' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    expect(document.querySelector('.editor-navigator-hit')).not.toBeNull()
  })

  it('uses immediate heading jumps when reduced motion is requested', () => {
    const scrollIntoView = vi.fn()
    setReducedMotion(true)
    renderHeadingNavigator(scrollIntoView)

    fireEvent.click(screen.getByRole('button', { name: 'H2 Headings' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(document.querySelector('.editor-navigator-hit')).not.toBeNull()
  })

  it('lists and jumps to wikilinks from Links mode', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    setReducedMotion(true)

    render(
      <>
        <div className="editor__blocknote-container">
          <p>Core Memory stays local.</p>
        </div>
        <EditorNavigatorPopover content={linkedNote} mode="links" onModeChange={() => {}} />
      </>,
    )

    expect(screen.getByText('2 Spelllinks')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Core Memory/i }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
  })
})

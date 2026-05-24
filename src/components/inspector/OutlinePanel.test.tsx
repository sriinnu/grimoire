import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import { OutlinePanel } from './OutlinePanel'

const originalMatchMedia = window.matchMedia
const originalScrollIntoView = Element.prototype.scrollIntoView

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

function renderOutline(content: string) {
  render(
    <>
      <div className="editor__blocknote-container">
        <div data-content-type="heading">
          <div role="heading" aria-level={2}>
            Rituals
          </div>
        </div>
      </div>
      <OutlinePanel
        semantics={parseMarkdownDocumentSemantics(content)}
        path="/vault/rituals.md"
        content={content}
      />
    </>,
  )
}

describe('OutlinePanel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Element.prototype.scrollIntoView = originalScrollIntoView
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  })

  it('jumps from right-sidebar outline headings into the active editor', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    setReducedMotion(true)

    renderOutline('# Notebook\n\n## Rituals\n\nCapture the morning loop.')
    fireEvent.click(screen.getByRole('button', { name: 'Jump to H2 Rituals' }))

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
    expect(document.querySelector('.editor-navigator-hit')).not.toBeNull()
  })

  it('summarizes document structure even before TOC insertion', () => {
    renderOutline('# Notebook\n\n## Rituals')

    expect(screen.getByText('2 headings')).toBeInTheDocument()
    expect(screen.getByText('YAML: none')).toBeInTheDocument()
  })
})

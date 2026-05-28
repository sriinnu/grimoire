import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EditorAgentComposerBar } from './EditorAgentComposerBar'

const content = `# First Heading

The local ledger keeps memory close.

## Dream Notes

Searchable dream fragments stay private.`
const linkedContent = `${content}

Related: [[Dream Ledger]] and [[rituals/morning|Morning Ritual]].`

const duplicateContent = `# Repeat

The first dream marker lives here.

## Repeat

The second dream marker lives here.`

async function navigatorPanel() {
  let panel: Element | null = null
  await waitFor(() => {
    panel = document.querySelector('.editor-navigator-popover')
    expect(panel).toBeInTheDocument()
    expect(panel).not.toHaveAttribute('aria-label', 'Loading note navigator')
  })
  return within(panel as HTMLElement)
}

describe('EditorAgentComposerBar', () => {
  it('keeps note search and TOC as real composer tools', () => {
    const { container } = render(<EditorAgentComposerBar content={content} onOpen={vi.fn()} />)

    expect(screen.getByRole('button', { name: /search this note/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /table of contents/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /spelllinks in this note/i })).toBeInTheDocument()
    expect(container.querySelector('.editor-agent-composer__ai-tools')).not.toBeInTheDocument()
  })

  it('shows outgoing Spelllinks from the composer tools', async () => {
    render(<EditorAgentComposerBar content={linkedContent} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /spelllinks in this note/i }))
    const navigator = await navigatorPanel()

    expect(navigator.getByText('2 Spelllinks')).toBeInTheDocument()
    expect(navigator.getByRole('button', { name: /Dream Ledger/i })).toBeInTheDocument()
    expect(navigator.getByRole('button', { name: /Morning Ritual/i })).toBeInTheDocument()
  })

  it('scrolls to the selected search occurrence in the active note', async () => {
    const firstMatchScroll = vi.fn()
    const secondMatchScroll = vi.fn()
    render(
      <>
        <div className="editor__blocknote-container">
          <p ref={(node) => {
            if (node) node.scrollIntoView = firstMatchScroll
          }}>
            The first dream marker lives here.
          </p>
          <p ref={(node) => {
            if (node) node.scrollIntoView = secondMatchScroll
          }}>
            The second dream marker lives here.
          </p>
        </div>
        <EditorAgentComposerBar content={duplicateContent} onOpen={vi.fn()} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: /search this note/i }))
    const navigator = await navigatorPanel()
    fireEvent.change(navigator.getByRole('textbox', { name: /search this note/i }), {
      target: { value: 'dream' },
    })

    expect(navigator.getByText('2 matches')).toBeInTheDocument()
    fireEvent.click(navigator.getByRole('button', { name: /Line 7:/i }))
    expect(firstMatchScroll).not.toHaveBeenCalled()
    expect(secondMatchScroll).toHaveBeenCalled()
  })

  it('shows a navigable table of contents from headings', async () => {
    render(<EditorAgentComposerBar content={content} onOpen={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /table of contents/i }))
    const navigator = await navigatorPanel()

    expect(navigator.getByText('2 headings')).toBeInTheDocument()
    expect(navigator.getByRole('button', { name: /H1 First Heading/i })).toBeInTheDocument()
    expect(navigator.getByRole('button', { name: /H2 Dream Notes/i })).toBeInTheDocument()
  })

  it('scrolls to the selected duplicate heading', async () => {
    const firstHeadingScroll = vi.fn()
    const secondHeadingScroll = vi.fn()
    render(
      <>
        <div className="editor__blocknote-container">
          <div
            data-content-type="heading"
            data-level="1"
            ref={(node) => {
              if (node) node.scrollIntoView = firstHeadingScroll
            }}
          >
            Repeat
          </div>
          <div
            data-content-type="heading"
            data-level="2"
            ref={(node) => {
              if (node) node.scrollIntoView = secondHeadingScroll
            }}
          >
            Repeat
          </div>
        </div>
        <EditorAgentComposerBar content={duplicateContent} onOpen={vi.fn()} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: /table of contents/i }))
    fireEvent.click((await navigatorPanel()).getByRole('button', { name: /H2 Repeat/i }))

    expect(firstHeadingScroll).not.toHaveBeenCalled()
    expect(secondHeadingScroll).toHaveBeenCalled()
  })
})

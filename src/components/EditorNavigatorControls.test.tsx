import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorNavigatorControls } from './EditorNavigatorControls'

const note = `# Plan

Find this note fast.

## Details

Need search and TOC.`
const linkedNote = `${note}

Related: [[Core Note]] and [[projects/alpha|Alpha Project]].`

describe('EditorNavigatorControls', () => {
  it('shows quiet icon actions with counts only where there is something to count', () => {
    render(<EditorNavigatorControls content={note} variant="meta" />)

    expect(screen.getByRole('button', { name: /search this note/i })).toHaveTextContent('')
    expect(screen.getByRole('button', { name: /table of contents, 2 headings/i })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /note links in this note, 0 links/i })).toHaveTextContent('')
  })

  it('summarizes headings and links without counting code fences as document navigation', () => {
    render(<EditorNavigatorControls content={`${linkedNote}\n\n\`\`\`\n## Ignored\n[[Hidden]]\n\`\`\``} variant="meta" />)

    expect(screen.getByRole('button', { name: /table of contents, 2 headings/i })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /note links in this note, 2 links/i })).toHaveTextContent('2')
  })

  it('opens the note links navigator from the editor metadata strip', async () => {
    render(<EditorNavigatorControls content={linkedNote} variant="meta" />)

    fireEvent.click(screen.getByRole('button', { name: /note links in this note/i }))

    expect(await screen.findByText('2 note links')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Line 9: Core Note/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Line 9: Alpha Project/i })).toBeInTheDocument()
  })

  it('opens note search with Cmd+F when focus is inside the editor', async () => {
    render(
      <div className="editor-content-layout--centered">
        <button type="button">Editor focus target</button>
        <EditorNavigatorControls content={note} enableFindShortcut variant="meta" />
      </div>,
    )

    screen.getByRole('button', { name: /editor focus target/i }).focus()
    fireEvent.keyDown(document, { key: 'f', code: 'KeyF', metaKey: true })

    expect(await screen.findByRole('textbox', { name: /search this note/i })).toBeInTheDocument()
  })

  it('leaves Cmd+F alone when focus is outside the editor', () => {
    render(
      <>
        <button type="button">Outside target</button>
        <EditorNavigatorControls content={note} enableFindShortcut variant="meta" />
      </>,
    )

    screen.getByRole('button', { name: /outside target/i }).focus()
    fireEvent.keyDown(document, { key: 'f', code: 'KeyF', metaKey: true })

    expect(screen.queryByRole('textbox', { name: /search this note/i })).not.toBeInTheDocument()
  })
})

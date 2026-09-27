import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog'

function renderDialog(platform: 'mac' | 'other' = 'mac') {
  const onClose = vi.fn()
  render(<KeyboardShortcutsDialog open onClose={onClose} platform={platform} />)
  return { onClose, dialog: screen.getByRole('dialog', { name: 'Keyboard shortcuts' }) }
}

describe('KeyboardShortcutsDialog', () => {
  it('is a labelled dialog with the four groups', () => {
    const { dialog } = renderDialog()
    const titleId = dialog.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(document.getElementById(titleId!)?.textContent).toBe('Keyboard shortcuts')
    const headings = within(dialog).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Navigate', 'Notes', 'Writing', 'View'])
  })

  it('focuses the filter input on open', () => {
    renderDialog()
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Filter shortcuts' }))
  })

  it('renders macOS symbols or Ctrl-style caps by platform', () => {
    const { dialog } = renderDialog('mac')
    const row = within(dialog).getByTestId('shortcut-view-keyboard-shortcuts')
    expect(within(row).getAllByText(/./, { selector: 'kbd' }).map((kbd) => kbd.textContent)).toEqual(['⌘', '/'])
  })

  it('renders Ctrl caps off macOS', () => {
    const { dialog } = renderDialog('other')
    const row = within(dialog).getByTestId('shortcut-edit-find-in-vault')
    expect(within(row).getAllByText(/./, { selector: 'kbd' }).map((kbd) => kbd.textContent)).toEqual(['Ctrl', 'Shift', 'F'])
  })

  it('filters rows and shows an empty state', () => {
    const { dialog } = renderDialog()
    const input = screen.getByRole('searchbox', { name: 'Filter shortcuts' })
    fireEvent.change(input, { target: { value: 'italic' } })
    expect(within(dialog).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Writing'])
    expect(within(dialog).getByText('Italic')).toBeInTheDocument()
    expect(within(dialog).queryByText('Bold')).toBeNull()

    fireEvent.change(input, { target: { value: 'nothing matches this' } })
    expect(within(dialog).getByRole('status')).toHaveTextContent('No shortcuts match')
  })

  it('closes on Escape', () => {
    const { onClose } = renderDialog()
    fireEvent.keyDown(screen.getByRole('searchbox', { name: 'Filter shortcuts' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps focus inside the dialog', () => {
    const { dialog } = renderDialog()
    const close = within(dialog).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.keyDown(close, { key: 'Tab' })
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Filter shortcuts' }))
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarSearchLauncher } from './SidebarSearchLauncher'

vi.mock('../../hooks/appCommandCatalog', () => ({
  APP_COMMAND_IDS: { editFindInVault: 'edit.findInVault' },
  getAppCommandShortcutDisplay: () => 'Ctrl+Shift+F',
}))

describe('SidebarSearchLauncher', () => {
  it('stays hidden when the search action is unavailable', () => {
    const { container } = render(<SidebarSearchLauncher />)

    expect(container).toBeEmptyDOMElement()
  })

  it('opens Spotlight-style search for open vault docs and text files', () => {
    const onOpenSearch = vi.fn()
    render(<SidebarSearchLauncher onOpenSearch={onOpenSearch} />)

    const button = screen.getByRole('button', { name: 'Search open vaults' })

    expect(button).toHaveTextContent('Search vaults')
    expect(button).toHaveTextContent('Notes, docs, text files')
    expect(button).toHaveTextContent('Ctrl+Shift+F')
    expect(button).toHaveAttribute('title', 'Search open vaults (Ctrl+Shift+F)')

    fireEvent.click(button)
    expect(onOpenSearch).toHaveBeenCalledOnce()
  })
})

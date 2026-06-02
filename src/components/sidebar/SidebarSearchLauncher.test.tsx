import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../../hooks/appCommandCatalog'
import { SidebarSearchLauncher } from './SidebarSearchLauncher'

describe('SidebarSearchLauncher', () => {
  it('stays hidden when the search action is unavailable', () => {
    const { container } = render(<SidebarSearchLauncher />)

    expect(container).toBeEmptyDOMElement()
  })

  it('opens Spotlight-style search for open vault docs and text files', () => {
    const onOpenSearch = vi.fn()
    render(<SidebarSearchLauncher onOpenSearch={onOpenSearch} />)

    const input = screen.getByRole('searchbox', {
      name: 'Search open vaults',
    })

    const shortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.editFindInVault)

    expect(input).toHaveAttribute('placeholder', 'Search open vaults...')
    expect(input).toHaveAttribute(
      'title',
      'Search open vaults',
    )
    expect(input).toHaveAttribute('aria-keyshortcuts')
    expect(screen.getByTestId('sidebar-search-shortcut')).toHaveTextContent(shortcut ?? '')

    fireEvent.click(input)
    expect(onOpenSearch).toHaveBeenCalledOnce()
    expect(onOpenSearch).toHaveBeenCalledWith()
  })

  it('uses a printable sidebar key as the initial Spotlight query', () => {
    const onOpenSearch = vi.fn()
    render(<SidebarSearchLauncher onOpenSearch={onOpenSearch} />)

    fireEvent.keyDown(screen.getByTestId('sidebar-search-input'), { key: 'r' })

    expect(onOpenSearch).toHaveBeenCalledWith('r')
  })
})

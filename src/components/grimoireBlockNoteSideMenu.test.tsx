import { render, screen } from '@testing-library/react'
import type { PropsWithChildren, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { GrimoireSideMenu } from './grimoireBlockNoteSideMenu'

let capturedMenuPosition: string | undefined

vi.mock('@blocknote/react', () => ({
  AddBlockButton: () => <button type="button">Add block</button>,
  DragHandleMenu: ({ children }: PropsWithChildren) => (
    <div data-testid="drag-handle-menu">{children}</div>
  ),
  RemoveBlockItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SideMenu: ({ children }: PropsWithChildren) => <div data-testid="side-menu">{children}</div>,
  TableColumnHeaderItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  TableRowHeaderItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  useComponentsContext: () => ({
    Generic: {
      Menu: {
        Root: ({ children, position }: PropsWithChildren<{ position?: string }>) => {
          capturedMenuPosition = position
          return <div data-testid="drag-menu-root">{children}</div>
        },
        Trigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
      },
    },
    SideMenu: {
      Button: ({ label, icon }: { label: string; icon: ReactNode }) => (
        <button type="button" aria-label={label}>{icon}</button>
      ),
    },
  }),
  useDictionary: () => ({
    drag_handle: {
      delete_menuitem: 'Delete',
      header_row_menuitem: 'Header row',
      header_column_menuitem: 'Header column',
      colors_menuitem: 'Colors',
    },
    side_menu: {
      drag_handle_label: 'Open block menu',
    },
  }),
  useExtension: () => ({
    blockDragEnd: vi.fn(),
    blockDragStart: vi.fn(),
    freezeMenu: vi.fn(),
    unfreezeMenu: vi.fn(),
  }),
  useExtensionState: () => ({ type: 'paragraph', content: [] }),
}))

vi.mock('@blocknote/core/extensions', () => ({
  SideMenuExtension: {},
}))

describe('GrimoireSideMenu', () => {
  it('replaces BlockNote block colors with markdown-safe drag-handle items', () => {
    render(<GrimoireSideMenu />)

    expect(screen.getByTestId('side-menu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add block' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open block menu' })).toBeInTheDocument()
    expect(capturedMenuPosition).toBe('left-start')

    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Header row')).toBeInTheDocument()
    expect(screen.getByText('Header column')).toBeInTheDocument()
    expect(screen.queryByText('Colors')).not.toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import type { MouseEventHandler, PropsWithChildren, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GrimoireSideMenu } from './grimoireBlockNoteSideMenu'

const ALL_BLOCK_SPECS = {
  paragraph: {},
  heading: {},
  bulletListItem: {},
  numberedListItem: {},
  checkListItem: {},
  quote: {},
  codeBlock: {},
}

let capturedMenuPosition: string | undefined
const updateBlock = vi.fn()
// Mutable so tests can vary the focused block and the editor schema; the mock
// arrows read these bindings at render time.
let focusedBlock: { type: string; props?: Record<string, unknown>; content?: unknown[] } = {
  type: 'paragraph',
  props: {},
  content: [],
}
let editorBlockSpecs: Record<string, unknown> = { ...ALL_BLOCK_SPECS }

beforeEach(() => {
  capturedMenuPosition = undefined
  updateBlock.mockClear()
  focusedBlock = { type: 'paragraph', props: {}, content: [] }
  editorBlockSpecs = { ...ALL_BLOCK_SPECS }
})

vi.mock('@blocknote/react', () => ({
  AddBlockButton: () => <button type="button">Add block</button>,
  DragHandleMenu: ({ children }: PropsWithChildren) => (
    <div data-testid="drag-handle-menu">{children}</div>
  ),
  RemoveBlockItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SideMenu: ({ children }: PropsWithChildren) => <div data-testid="side-menu">{children}</div>,
  TableColumnHeaderItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  TableRowHeaderItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  useBlockNoteEditor: () => ({
    schema: { blockSpecs: editorBlockSpecs },
    updateBlock,
  }),
  useComponentsContext: () => ({
    Generic: {
      Menu: {
        Root: ({ children, position, sub }: PropsWithChildren<{ position?: string; sub?: boolean }>) => {
          if (!sub) capturedMenuPosition = position
          return <div data-testid="drag-menu-root">{children}</div>
        },
        Trigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
        Dropdown: ({ children }: PropsWithChildren) => <div>{children}</div>,
        Item: ({
          children,
          onClick,
          checked,
        }: PropsWithChildren<{ onClick?: MouseEventHandler; checked?: boolean }>) => (
          <button type="button" onClick={onClick} aria-pressed={checked}>
            {children}
          </button>
        ),
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
    slash_menu: {
      paragraph: { title: 'Paragraph' },
      heading: { title: 'Heading 1' },
      heading_2: { title: 'Heading 2' },
      heading_3: { title: 'Heading 3' },
      bullet_list: { title: 'Bullet List' },
      numbered_list: { title: 'Numbered List' },
      check_list: { title: 'Check List' },
      quote: { title: 'Quote' },
      code_block: { title: 'Code Block' },
    },
  }),
  useExtension: () => ({
    blockDragEnd: vi.fn(),
    blockDragStart: vi.fn(),
    freezeMenu: vi.fn(),
    unfreezeMenu: vi.fn(),
  }),
  useExtensionState: () => focusedBlock,
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
    expect(capturedMenuPosition).toBe('right-start')

    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Header row')).toBeInTheDocument()
    expect(screen.getByText('Header column')).toBeInTheDocument()
    expect(screen.queryByText('Colors')).not.toBeInTheDocument()
  })

  it('offers turn-into conversions for the focused block', () => {
    render(<GrimoireSideMenu />)

    expect(screen.getByText('Turn into')).toBeInTheDocument()
    for (const label of ['Paragraph', 'Heading 1', 'Bullet List', 'Quote', 'Code Block']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('converts the focused block when a turn-into target is chosen', () => {
    render(<GrimoireSideMenu />)

    fireEvent.click(screen.getByText('Heading 1'))

    expect(updateBlock).toHaveBeenCalledWith(focusedBlock, {
      type: 'heading',
      props: { level: 1 },
    })
  })

  it('marks the focused block type as the checked turn-into option', () => {
    render(<GrimoireSideMenu />)

    expect(screen.getByText('Paragraph').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Heading 1').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('omits turn-into targets absent from the editor schema', () => {
    editorBlockSpecs = {
      paragraph: {},
      heading: {},
      bulletListItem: {},
      numberedListItem: {},
      checkListItem: {},
      quote: {},
    }
    render(<GrimoireSideMenu />)

    expect(screen.getByText('Paragraph')).toBeInTheDocument()
    expect(screen.queryByText('Code Block')).not.toBeInTheDocument()
  })

  it('hides Turn into for blocks whose content cannot be converted', () => {
    focusedBlock = { type: 'table', props: {} }
    render(<GrimoireSideMenu />)

    expect(screen.queryByText('Turn into')).not.toBeInTheDocument()
    // The other drag-handle items still render.
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})

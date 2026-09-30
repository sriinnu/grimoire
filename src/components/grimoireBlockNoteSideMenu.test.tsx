import { fireEvent, render, screen, within } from '@testing-library/react'
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
const transact = vi.fn((fn: () => void) => fn())
const openSuggestionMenu = vi.fn()
const insertBlocks = vi.fn((blocks: unknown[]) => blocks.map((block, index) => ({ id: `new-${index}`, ...(block as object) })))
const setTextCursorPosition = vi.fn()
type MockBlock = { id?: string; type: string; props?: Record<string, unknown>; content?: unknown[]; children?: MockBlock[] }
let siblings: MockBlock[] = []
const sibling = (id: string | undefined, offset: number) => {
  const index = siblings.findIndex((block) => block.id === id)
  return index < 0 ? undefined : siblings[index + offset]
}
// Mutable so tests can vary the focused block and the editor schema; the mock
// arrows read these bindings at render time.
let focusedBlock: MockBlock = {
  type: 'paragraph',
  props: {},
  content: [],
}
let editorBlockSpecs: Record<string, unknown> = { ...ALL_BLOCK_SPECS }

beforeEach(() => {
  capturedMenuPosition = undefined
  updateBlock.mockClear()
  transact.mockClear()
  openSuggestionMenu.mockClear()
  insertBlocks.mockClear()
  setTextCursorPosition.mockClear()
  siblings = []
  focusedBlock = { type: 'paragraph', props: {}, content: [] }
  editorBlockSpecs = { ...ALL_BLOCK_SPECS }
})

vi.mock('@blocknote/react', () => ({
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
    transact,
    insertBlocks,
    setTextCursorPosition,
    getPrevBlock: (id: string) => sibling(id, -1),
    getNextBlock: (id: string) => sibling(id, 1),
  }),
  useComponentsContext: () => ({
    Generic: {
      Menu: {
        Root: ({ children, position, sub }: PropsWithChildren<{ position?: string; sub?: boolean }>) => {
          if (!sub) capturedMenuPosition = position
          return <div data-testid="drag-menu-root">{children}</div>
        },
        Trigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
        Dropdown: ({ children }: PropsWithChildren) => <div data-testid="turn-into-options">{children}</div>,
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
      add_block_label: 'Add block',
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
    openSuggestionMenu: openSuggestionMenu,
  }),
  useExtensionState: () => focusedBlock,
}))

vi.mock('@blocknote/core/extensions', () => ({
  SideMenuExtension: {},
  SuggestionMenu: {},
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
    const options = within(screen.getByTestId('turn-into-options'))
    for (const label of ['Paragraph', 'Heading 1', 'Bullet List', 'Quote', 'Code Block']) {
      expect(options.getByText(label)).toBeInTheDocument()
    }
  })

  it('converts the focused block when a turn-into target is chosen', () => {
    render(<GrimoireSideMenu />)

    fireEvent.click(within(screen.getByTestId('turn-into-options')).getByText('Heading 1'))

    expect(updateBlock).toHaveBeenCalledWith(focusedBlock, {
      type: 'heading',
      props: { level: 1 },
    })
  })

  it('turns a whole numbered list into bullets in one transaction, not just the focused item', () => {
    siblings = [
      { id: 'p', type: 'paragraph' },
      { id: 'n1', type: 'numberedListItem', children: [{ id: 'n1a', type: 'numberedListItem' }] },
      { id: 'n2', type: 'numberedListItem' },
      { id: 'n3', type: 'numberedListItem' },
      { id: 'q', type: 'quote' },
    ]
    focusedBlock = siblings[2]
    render(<GrimoireSideMenu />)

    fireEvent.click(within(screen.getByTestId('turn-into-options')).getByText('Bullet List'))

    expect(transact).toHaveBeenCalledTimes(1)
    expect(updateBlock.mock.calls.map(([block]) => (block as MockBlock).id)).toEqual(['n1', 'n1a', 'n2', 'n3'])
    expect(updateBlock).toHaveBeenCalledWith(siblings[1], { type: 'bulletListItem' })
  })

  it('turns only the focused list item when the target is not a list', () => {
    siblings = [
      { id: 'n1', type: 'numberedListItem' },
      { id: 'n2', type: 'numberedListItem' },
    ]
    focusedBlock = siblings[1]
    render(<GrimoireSideMenu />)

    fireEvent.click(within(screen.getByTestId('turn-into-options')).getByText('Paragraph'))

    expect(updateBlock).toHaveBeenCalledTimes(1)
    expect(updateBlock).toHaveBeenCalledWith(siblings[1], { type: 'paragraph' })
  })

  it('shows the current block type beside Turn into', () => {
    focusedBlock = { id: 'n1', type: 'numberedListItem', props: {} }
    render(<GrimoireSideMenu />)

    expect(screen.getByText('Turn into').parentElement).toHaveTextContent('Turn intoNumbered List')
  })

  it('adds a paragraph after a filled block and opens the slash menu there', () => {
    focusedBlock = { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }
    render(<GrimoireSideMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }).querySelector('svg')!)

    expect(insertBlocks).toHaveBeenCalledWith([{ type: 'paragraph' }], focusedBlock, 'after')
    expect(setTextCursorPosition).toHaveBeenCalledWith(expect.objectContaining({ id: 'new-0', type: 'paragraph' }))
    expect(openSuggestionMenu).toHaveBeenCalledWith('/')
  })

  it('opens the slash menu in place when the block is empty', () => {
    focusedBlock = { id: 'p1', type: 'paragraph', content: [] }
    render(<GrimoireSideMenu />)

    fireEvent.click(screen.getByRole('button', { name: 'Add block' }).querySelector('svg')!)

    expect(insertBlocks).not.toHaveBeenCalled()
    expect(setTextCursorPosition).toHaveBeenCalledWith(focusedBlock)
    expect(openSuggestionMenu).toHaveBeenCalledWith('/')
  })

  it('shows the block type on the handle instead of an anonymous grip', () => {
    focusedBlock = { id: 'h', type: 'heading', props: { level: 2 } }
    render(<GrimoireSideMenu />)

    const handle = screen.getByRole('button', { name: 'Open block menu' }).querySelector('.bn-block-handle')
    expect(handle).toHaveAttribute('data-block-type', 'heading')
    expect(handle).toHaveAttribute('aria-label', 'Heading 2')
    expect(handle).not.toHaveAttribute('title')
    expect(handle?.querySelector('.bn-block-handle__glyph')).toBeInTheDocument()
    expect(handle?.querySelector('.bn-block-handle__grip')).toBeInTheDocument()
  })

  it('marks the focused block type as the checked turn-into option', () => {
    render(<GrimoireSideMenu />)

    const options = within(screen.getByTestId('turn-into-options'))
    expect(options.getByText('Paragraph').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(options.getByText('Heading 1').closest('button')).toHaveAttribute('aria-pressed', 'false')
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

    const options = within(screen.getByTestId('turn-into-options'))
    expect(options.getByText('Paragraph')).toBeInTheDocument()
    expect(options.queryByText('Code Block')).not.toBeInTheDocument()
  })

  it('hides Turn into for blocks whose content cannot be converted', () => {
    focusedBlock = { type: 'table', props: {} }
    render(<GrimoireSideMenu />)

    expect(screen.queryByText('Turn into')).not.toBeInTheDocument()
    // The other drag-handle items still render.
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })
})

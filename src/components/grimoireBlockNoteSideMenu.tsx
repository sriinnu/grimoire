import {
  AddBlockButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  type SideMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useExtension,
  useExtensionState,
} from '@blocknote/react'
import type { PartialBlock } from '@blocknote/core'
import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  Code,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Repeat,
  TextQuote,
  type LucideIcon,
} from 'lucide-react'

/**
 * A single "Turn into" target: the localized label, its glyph, and the
 * `updateBlock` payload. `update` is typed as `PartialBlock` for shape — the
 * default-schema union is loose, so this checks structure, not exhaustiveness;
 * the literal types below are kept correct by hand.
 */
type TurnIntoOption = {
  label: string
  icon: LucideIcon
  update: PartialBlock
}

/**
 * Block types that can be safely converted *from*. Restricted to text-bearing
 * blocks so we never offer turning a table or math block into a heading — their
 * content models don't map and conversion would silently drop content.
 */
const TURN_INTO_SOURCES = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'quote',
  'codeBlock',
])

/** Builds the turn-into targets in Notion/Obsidian order, labelled from the active dictionary. */
function turnIntoOptions(dict: ReturnType<typeof useDictionary>): TurnIntoOption[] {
  const menu = dict.slash_menu
  return [
    { label: menu.paragraph.title, icon: Pilcrow, update: { type: 'paragraph' } },
    { label: menu.heading.title, icon: Heading1, update: { type: 'heading', props: { level: 1 } } },
    { label: menu.heading_2.title, icon: Heading2, update: { type: 'heading', props: { level: 2 } } },
    { label: menu.heading_3.title, icon: Heading3, update: { type: 'heading', props: { level: 3 } } },
    { label: menu.bullet_list.title, icon: List, update: { type: 'bulletListItem' } },
    { label: menu.numbered_list.title, icon: ListOrdered, update: { type: 'numberedListItem' } },
    { label: menu.check_list.title, icon: ListChecks, update: { type: 'checkListItem' } },
    { label: menu.quote.title, icon: TextQuote, update: { type: 'quote' } },
    { label: menu.code_block.title, icon: Code, update: { type: 'codeBlock' } },
  ]
}

/** Block as seen by the side menu: only the fields the turn-into matcher reads. */
type SideMenuBlock = { type: string; props?: Record<string, unknown> }

/** True when the focused block already matches a turn-into target's type and props. */
function isActiveOption(block: SideMenuBlock, update: PartialBlock): boolean {
  if (block.type !== update.type) return false
  const props = update.props as Record<string, unknown> | undefined
  if (!props) return true
  return Object.entries(props).every(([key, value]) => block.props?.[key] === value)
}

/**
 * "Turn into" submenu for the block drag handle. Mirrors BlockNote's own nested
 * `BlockColorsItem` structure (Menu.Root[sub] → Trigger → Dropdown[sub]) so it
 * renders and positions like a native flyout. Only targets present in the active
 * editor schema are offered, and the current block type is shown as checked.
 */
function GrimoireTurnIntoItem() {
  const Components = useComponentsContext()
  const dict = useDictionary()
  const editor = useBlockNoteEditor()
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  })

  if (!Components || !block) return null
  if (!TURN_INTO_SOURCES.has(block.type)) return null

  const options = turnIntoOptions(dict).filter(
    (option) => typeof option.update.type === 'string' && option.update.type in editor.schema.blockSpecs,
  )
  if (options.length === 0) return null

  return (
    <Components.Generic.Menu.Root position="right" sub>
      <Components.Generic.Menu.Trigger sub>
        <Components.Generic.Menu.Item
          className="bn-menu-item"
          subTrigger
          icon={<Repeat size={16} />}
        >
          Turn into
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown sub className="bn-menu-dropdown">
        {options.map((option) => {
          const OptionIcon = option.icon
          return (
            <Components.Generic.Menu.Item
              key={option.label}
              className="bn-menu-item"
              icon={<OptionIcon size={16} />}
              checked={isActiveOption(block, option.update)}
              onClick={() => editor.updateBlock(block, option.update)}
            >
              {option.label}
            </Components.Generic.Menu.Item>
          )
        })}
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  )
}

/** Drag-handle menu: turn-into conversions plus delete and table header toggles. */
function GrimoireDragHandleMenu() {
  const dict = useDictionary()

  return (
    <DragHandleMenu>
      <GrimoireTurnIntoItem />
      <RemoveBlockItem>{dict.drag_handle.delete_menuitem}</RemoveBlockItem>
      <TableRowHeaderItem>{dict.drag_handle.header_row_menuitem}</TableRowHeaderItem>
      <TableColumnHeaderItem>{dict.drag_handle.header_column_menuitem}</TableColumnHeaderItem>
    </DragHandleMenu>
  )
}

function GrimoireDragHandleButton(props: SideMenuProps) {
  const Components = useComponentsContext()
  const dict = useDictionary()
  const sideMenu = useExtension(SideMenuExtension)
  const block = useExtensionState(SideMenuExtension, {
    selector: (state) => state?.block,
  })
  const Component = props.dragHandleMenu || GrimoireDragHandleMenu

  if (!Components || block === undefined) return null

  return (
    <Components.Generic.Menu.Root
      onOpenChange={(open: boolean) => {
        if (open) sideMenu.freezeMenu()
        else sideMenu.unfreezeMenu()
      }}
      position="right-start"
    >
      <Components.Generic.Menu.Trigger>
        <Components.SideMenu.Button
          label={dict.side_menu.drag_handle_label}
          draggable
          onDragStart={(event) => sideMenu.blockDragStart(event, block)}
          onDragEnd={sideMenu.blockDragEnd}
          className="bn-button"
          icon={<GripVertical size={20} strokeWidth={2.4} data-test="dragHandle" />}
        />
      </Components.Generic.Menu.Trigger>
      <Component />
    </Components.Generic.Menu.Root>
  )
}

/** Renders Grimoire's BlockNote side controls without clipping the drag-handle menu. */
export function GrimoireSideMenu(props: SideMenuProps) {
  return (
    <SideMenu {...props}>
      <AddBlockButton />
      <GrimoireDragHandleButton dragHandleMenu={props.dragHandleMenu ?? GrimoireDragHandleMenu} />
    </SideMenu>
  )
}

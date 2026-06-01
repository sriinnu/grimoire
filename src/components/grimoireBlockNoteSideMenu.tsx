import {
  AddBlockButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  type SideMenuProps,
  useComponentsContext,
  useDictionary,
  useExtension,
  useExtensionState,
} from '@blocknote/react'
import { SideMenuExtension } from '@blocknote/core/extensions'
import { GripVertical } from 'lucide-react'

function GrimoireDragHandleMenu() {
  const dict = useDictionary()

  return (
    <DragHandleMenu>
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

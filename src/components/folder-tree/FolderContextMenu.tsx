import type { RefObject } from 'react'
import { ArrowSquareOut, FolderOpen, PencilSimple, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { clampFixedMenuPosition } from '@/lib/fixedMenuPosition'
import { revealInFileManagerLabel } from '@/utils/platform'

export interface FolderContextMenuState {
  path: string
  x: number
  y: number
}

interface FolderContextMenuProps {
  menu: FolderContextMenuState | null
  menuRef: RefObject<HTMLDivElement | null>
  onDelete?: (folderPath: string) => void
  onMove?: (folderPath: string) => void
  onRename: (folderPath: string) => void
  onReveal?: (folderPath: string) => void
}

const FOLDER_MENU_WIDTH = 196
const FOLDER_MENU_HEIGHT = 156

export function FolderContextMenu({
  menu,
  menuRef,
  onDelete,
  onMove,
  onRename,
  onReveal,
}: FolderContextMenuProps) {
  if (!menu) return null
  const menuPosition = clampFixedMenuPosition(menu.x, menu.y, {
    width: FOLDER_MENU_WIDTH,
    height: FOLDER_MENU_HEIGHT,
  })

  return (
    <div
      ref={menuRef}
      className="grimoire-context-menu-surface fixed z-50 w-[196px] max-w-[calc(100vw-16px)] rounded-md border bg-popover p-1 shadow-md"
      style={{ left: menuPosition.left, top: menuPosition.top }}
      data-testid="folder-context-menu"
      role="menu"
      aria-label="Folder actions"
    >
      <Button
        type="button"
        role="menuitem"
        variant="ghost"
        className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm"
        onClick={() => onRename(menu.path)}
      >
        <PencilSimple size={14} />
        Rename folder…
      </Button>
      {onMove && (
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm"
          onClick={() => onMove(menu.path)}
          data-testid="move-folder-menu-item"
        >
          <FolderOpen size={14} />
          Move to…
        </Button>
      )}
      {onReveal && (
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm"
          onClick={() => onReveal(menu.path)}
          data-testid="reveal-folder-menu-item"
        >
          <ArrowSquareOut size={14} />
          {revealInFileManagerLabel()}
        </Button>
      )}
      <Button
        type="button"
        role="menuitem"
        variant="ghost"
        className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-sm text-destructive hover:text-destructive"
        disabled={!onDelete}
        onClick={() => onDelete?.(menu.path)}
        data-testid="delete-folder-menu-item"
      >
        <Trash size={14} />
        Delete folder…
      </Button>
    </div>
  )
}

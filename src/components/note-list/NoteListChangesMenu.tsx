import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import type { ModifiedFile, VaultEntry } from '../../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ChangesContextMenuParams {
  isChangesView: boolean
  onDiscardFile?: (relativePath: string) => Promise<void>
  modifiedFiles?: ModifiedFile[]
}

const CHANGES_MENU_WIDTH = 184
const CHANGES_MENU_HEIGHT = 48
const MENU_VIEWPORT_GAP = 8

function clampMenuPosition(x: number, y: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: x, top: y }
  return {
    left: Math.max(MENU_VIEWPORT_GAP, Math.min(x, window.innerWidth - CHANGES_MENU_WIDTH - MENU_VIEWPORT_GAP)),
    top: Math.max(MENU_VIEWPORT_GAP, Math.min(y, window.innerHeight - CHANGES_MENU_HEIGHT - MENU_VIEWPORT_GAP)),
  }
}

export function useChangesContextMenu({
  isChangesView,
  onDiscardFile,
  modifiedFiles,
}: ChangesContextMenuParams) {
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: VaultEntry } | null>(null)
  const [actionTarget, setActionTarget] = useState<{
    entry: VaultEntry
    action: 'discard' | 'restore'
    relativePath: string
  } | null>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  const resolveActionTarget = useCallback((entry: VaultEntry) => {
    const file = modifiedFiles?.find(
      (modified) => modified.path === entry.path || entry.path.endsWith('/' + modified.relativePath),
    )
    if (!file) return null
    return {
      entry,
      action: file.status === 'deleted' ? 'restore' as const : 'discard' as const,
      relativePath: file.relativePath,
    }
  }, [modifiedFiles])

  const openContextMenuForEntry = useCallback((entry: VaultEntry, point: { x: number; y: number }) => {
    if (!isChangesView || !onDiscardFile) return
    setCtxMenu({ x: point.x, y: point.y, entry })
  }, [isChangesView, onDiscardFile])

  const handleNoteContextMenu = useCallback((entry: VaultEntry, event: ReactMouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    openContextMenuForEntry(entry, { x: event.clientX, y: event.clientY })
  }, [openContextMenuForEntry])

  const closeCtxMenu = useCallback(() => setCtxMenu(null), [])

  useEffect(() => {
    if (!ctxMenu) return
    const handleOutsideClick = (event: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(event.target as Node)) closeCtxMenu()
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [ctxMenu, closeCtxMenu])

  const handleChangeConfirm = useCallback(async () => {
    if (!actionTarget || !onDiscardFile) return
    await onDiscardFile(actionTarget.relativePath)
    setActionTarget(null)
  }, [actionTarget, onDiscardFile])

  const menuActionTarget = ctxMenu ? resolveActionTarget(ctxMenu.entry) : null
  const menuActionLabel = menuActionTarget?.action === 'restore' ? 'Restore note' : 'Discard changes'
  const menuPosition = ctxMenu ? clampMenuPosition(ctxMenu.x, ctxMenu.y) : null
  const MenuIcon = menuActionTarget?.action === 'restore' ? RotateCcw : Trash2

  const contextMenuNode = ctxMenu ? (
    <div
      ref={ctxMenuRef}
      className="grimoire-context-menu-surface fixed z-50 w-[184px] max-w-[calc(100vw-16px)] rounded-lg border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur"
      style={{ left: menuPosition?.left, top: menuPosition?.top }}
      data-testid="changes-context-menu"
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-full justify-start gap-2 rounded-[5px] px-2 text-left text-xs font-medium text-destructive hover:text-destructive"
        onClick={() => {
          if (!menuActionTarget) return
          setActionTarget(menuActionTarget)
          closeCtxMenu()
        }}
        data-testid={menuActionTarget?.action === 'restore' ? 'restore-note-button' : 'discard-changes-button'}
      >
        <MenuIcon className="size-3.5" />
        {menuActionLabel}
      </Button>
    </div>
  ) : null

  const dialogNode = (
    <Dialog open={!!actionTarget} onOpenChange={(open) => { if (!open) setActionTarget(null) }}>
      <DialogContent
        showCloseButton={false}
        data-testid={actionTarget?.action === 'restore' ? 'restore-confirm-dialog' : 'discard-confirm-dialog'}
      >
        <DialogHeader>
          <DialogTitle>{actionTarget?.action === 'restore' ? 'Restore note' : 'Discard changes'}</DialogTitle>
          <DialogDescription>
            {actionTarget?.action === 'restore'
              ? <>Restore <strong>{actionTarget?.entry.filename ?? 'this file'}</strong> from Git?</>
              : <>Discard changes to <strong>{actionTarget?.entry.title ?? 'this file'}</strong>? This cannot be undone.</>
            }
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setActionTarget(null)}>Cancel</Button>
          <Button
            variant={actionTarget?.action === 'restore' ? 'default' : 'destructive'}
            onClick={handleChangeConfirm}
            data-testid={actionTarget?.action === 'restore' ? 'restore-confirm-button' : 'discard-confirm-button'}
          >
            {actionTarget?.action === 'restore' ? 'Restore' : 'Discard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return {
    handleNoteContextMenu,
    openContextMenuForEntry,
    contextMenuNode,
    dialogNode,
  }
}

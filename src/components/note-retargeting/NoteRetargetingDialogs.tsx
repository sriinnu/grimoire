import { lazy, Suspense } from 'react'
import type { NoteRetargetDialogState } from '../../hooks/useNoteRetargetingUi'
import type { VaultEntry } from '../../types'
import { LocalityMoveConfirmDialog } from './LocalityMoveConfirmDialog'
import type { RetargetOption } from './RetargetNoteDialog'

const RetargetNoteDialogSurface = lazy(async () => ({
  default: (await import('./RetargetNoteDialog')).RetargetNoteDialog,
}))

interface NoteRetargetingDialogsProps {
  dialogState: NoteRetargetDialogState
  dialogEntry: VaultEntry | null
  typeOptions: RetargetOption[]
  folderOptions: RetargetOption[]
  onClose: () => void
  onSelectType: (type: string) => boolean | Promise<boolean>
  onSelectFolder: (folderPath: string) => boolean | Promise<boolean>
  onConfirmFolderMove: () => void | Promise<void>
}

function typeDialogDescription(entry: VaultEntry | null): string {
  return entry
    ? `Set a new type for "${entry.title}".`
    : 'Select a type for the active note.'
}

function folderDialogDescription(entry: VaultEntry | null): string {
  return entry
    ? `Choose a destination folder for "${entry.title}".`
    : 'Select a destination folder for the active note.'
}

function localityConfirmDescription(effect: 'protects' | 'exposes', entry: VaultEntry | null): string {
  const label = entry ? `"${entry.title}"` : 'This note'
  return effect === 'exposes'
    ? `${label} is local-only because of its current folder. After this move it loses that protection and can be included in sync, export, and AI context.`
    : `${label} will sit under a local-only folder after this move and will be withheld from sync, export, and AI context.`
}

export function NoteRetargetingDialogs({
  dialogState,
  dialogEntry,
  typeOptions,
  folderOptions,
  onClose,
  onSelectType,
  onSelectFolder,
  onConfirmFolderMove,
}: NoteRetargetingDialogsProps) {
  const typeDialogOpen = dialogState?.kind === 'type'
  const folderDialogOpen = dialogState?.kind === 'folder'
  const localityDialogOpen = dialogState?.kind === 'folder-locality'

  return (
    <Suspense fallback={null}>
      {typeDialogOpen ? (
        <RetargetNoteDialogSurface
          open={typeDialogOpen}
          title="Change Note Type"
          description={typeDialogDescription(dialogEntry)}
          searchPlaceholder="Search types"
          emptyMessage="No other note types available."
          options={typeOptions}
          onClose={onClose}
          onSelect={onSelectType}
          testIdPrefix="retarget-note-type"
        />
      ) : null}
      {folderDialogOpen ? (
        <RetargetNoteDialogSurface
          open={folderDialogOpen}
          title="Move Note to Folder"
          description={folderDialogDescription(dialogEntry)}
          searchPlaceholder="Search folders"
          emptyMessage="No other folders available."
          options={folderOptions}
          onClose={onClose}
          onSelect={onSelectFolder}
          testIdPrefix="retarget-note-folder"
        />
      ) : null}
      {localityDialogOpen ? (
        <LocalityMoveConfirmDialog
          open={localityDialogOpen}
          description={localityConfirmDescription(dialogState.effect, dialogEntry)}
          confirmLabel="Move note"
          onCancel={onClose}
          onConfirm={() => { void onConfirmFolderMove() }}
          testIdPrefix="retarget-note-folder"
        />
      ) : null}
    </Suspense>
  )
}

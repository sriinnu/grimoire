import { lazy, Suspense, useMemo, useState } from 'react'
import type { FolderNode, VaultEntry } from '../../types'
import { LocalityMoveConfirmDialog } from '../note-retargeting/LocalityMoveConfirmDialog'
import { buildMoveFolderOptions, summarizeFolderMoveLocality } from './moveFolderOptions'

const RetargetNoteDialogSurface = lazy(async () => ({
  default: (await import('../note-retargeting/RetargetNoteDialog')).RetargetNoteDialog,
}))

interface MoveFolderDialogProps {
  movingFolderPath: string | null
  folders: FolderNode[]
  entries: VaultEntry[]
  vaultPath: string
  onClose: () => void
  onMove: (folderPath: string, destinationPath: string) => Promise<boolean> | boolean
}

interface PendingLocalityMove {
  destinationPath: string
  protects: number
  exposes: number
}

function noteCountLabel(count: number): string {
  return count === 1 ? '1 note' : `${count} notes`
}

function localityConfirmDescription(pending: PendingLocalityMove): string {
  const sentences: string[] = []
  if (pending.exposes > 0) {
    const verb = pending.exposes === 1 ? 'is' : 'are'
    sentences.push(
      `${noteCountLabel(pending.exposes)} in this folder ${verb} local-only because of the current path. After this move they lose that protection and can be included in sync, export, and AI context.`,
    )
  }
  if (pending.protects > 0) {
    sentences.push(
      `${noteCountLabel(pending.protects)} will sit under a local-only folder after this move and will be withheld from sync, export, and AI context.`,
    )
  }
  return sentences.join(' ')
}

export function MoveFolderDialog({
  movingFolderPath,
  folders,
  entries,
  vaultPath,
  onClose,
  onMove,
}: MoveFolderDialogProps) {
  const [pendingLocalityMove, setPendingLocalityMove] = useState<PendingLocalityMove | null>(null)

  const options = useMemo(
    () => (movingFolderPath ? buildMoveFolderOptions(folders, movingFolderPath) : []),
    [folders, movingFolderPath],
  )

  if (!movingFolderPath) return null

  const folderLabel = movingFolderPath.split('/').filter(Boolean).at(-1) ?? movingFolderPath

  const closeDialog = () => {
    setPendingLocalityMove(null)
    onClose()
  }

  const handleSelect = async (destinationPath: string): Promise<boolean> => {
    const { protects, exposes } = summarizeFolderMoveLocality({
      entries,
      vaultPath,
      folderPath: movingFolderPath,
      destinationPath,
    })
    if (protects > 0 || exposes > 0) {
      setPendingLocalityMove({ destinationPath, protects, exposes })
      return false
    }
    return onMove(movingFolderPath, destinationPath)
  }

  const handleConfirmLocalityMove = async () => {
    if (!pendingLocalityMove) return
    const { destinationPath } = pendingLocalityMove
    setPendingLocalityMove(null)
    await onMove(movingFolderPath, destinationPath)
  }

  return (
    <Suspense fallback={null}>
      {pendingLocalityMove ? (
        <LocalityMoveConfirmDialog
          open
          description={localityConfirmDescription(pendingLocalityMove)}
          confirmLabel="Move folder"
          onCancel={closeDialog}
          onConfirm={() => { void handleConfirmLocalityMove() }}
          testIdPrefix="move-folder"
        />
      ) : (
        <RetargetNoteDialogSurface
          open
          title="Move Folder"
          description={`Choose a destination for "${folderLabel}".`}
          searchPlaceholder="Search folders"
          emptyMessage="No other folders available."
          options={options}
          onClose={closeDialog}
          onSelect={handleSelect}
          testIdPrefix="move-folder"
        />
      )}
    </Suspense>
  )
}

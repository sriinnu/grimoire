import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import type { NoteRetargetingContextValue } from '../components/note-retargeting/noteRetargetingContext'
import type { RetargetOption } from '../components/note-retargeting/RetargetNoteDialog'
import { localityMoveEffect, type LocalityMoveEffect } from '../lib/localityPolicy'
import type { FolderNode, SidebarSelection, VaultEntry } from '../types'
import type { FrontmatterOpOptions } from './frontmatterOps'
import { useNoteRetargeting } from './useNoteRetargeting'

export type NoteRetargetDialogState =
  | { kind: 'type'; notePath: string }
  | { kind: 'folder'; notePath: string }
  | {
    kind: 'folder-locality'
    notePath: string
    folderPath: string
    effect: Exclude<LocalityMoveEffect, null>
  }
  | null

type DialogState = NoteRetargetDialogState

interface NoteRetargetingUiInput {
  activeEntry: VaultEntry | null
  activeNoteBlocked: boolean
  entries: VaultEntry[]
  folders: FolderNode[]
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setToastMessage: (message: string | null) => void
  vaultPath: string
  updateFrontmatter: (
    path: string,
    key: string,
    value: string,
    options?: FrontmatterOpOptions,
  ) => Promise<void>
  moveNoteToFolder: (
    path: string,
    folderPath: string,
    vaultPath: string,
    onEntryRenamed: (
      oldPath: string,
      newEntry: Partial<VaultEntry> & { path: string },
      newContent: string,
    ) => void,
  ) => Promise<{ new_path: string } | null>
}

function folderPathForNote(notePath: string, vaultPath: string): string {
  const normalizedVaultPath = vaultPath.replace(/\/+$/, '')
  const relativePath = notePath.startsWith(`${normalizedVaultPath}/`)
    ? notePath.slice(normalizedVaultPath.length + 1)
    : notePath
  const lastSlashIndex = relativePath.lastIndexOf('/')
  return lastSlashIndex >= 0 ? relativePath.slice(0, lastSlashIndex) : ''
}

function buildTypeOptions(types: string[], entry: VaultEntry | null): RetargetOption[] {
  if (!entry) return []
  return types.map((type) => ({
    id: type,
    label: type,
    current: entry.isA === type,
  }))
}

function buildFolderOptions(
  folders: Array<{ path: string; label: string }>,
  entry: VaultEntry | null,
  vaultPath: string,
): RetargetOption[] {
  if (!entry) return []

  const currentFolderPath = folderPathForNote(entry.path, vaultPath)
  return folders.map((folder) => ({
    id: folder.path,
    label: folder.label,
    detail: folder.path === folder.label ? undefined : folder.path,
    current: folder.path === currentFolderPath,
  }))
}

function resolveDialogEntry(
  dialogState: DialogState,
  entries: VaultEntry[],
  activeEntry: VaultEntry | null,
): VaultEntry | null {
  if (!dialogState) return null
  return entries.find((entry) => entry.path === dialogState.notePath)
    ?? (activeEntry?.path === dialogState.notePath ? activeEntry : null)
}

function hasTypeRetargetDestination(activeEntry: VaultEntry | null, activeNoteBlocked: boolean, types: string[]): boolean {
  return !!activeEntry && !activeNoteBlocked && types.some((type) => type !== activeEntry.isA)
}

function hasFolderRetargetDestination(
  activeEntry: VaultEntry | null,
  activeNoteBlocked: boolean,
  folders: Array<{ path: string; label: string }>,
  canDropNoteOnFolder: (notePath: string, folderPath: string) => boolean,
): boolean {
  return !!activeEntry
    && !activeNoteBlocked
    && folders.some((folder) => canDropNoteOnFolder(activeEntry.path, folder.path))
}

function openDialogForActiveEntry(
  setDialogState: Dispatch<SetStateAction<DialogState>>,
  activeEntry: VaultEntry | null,
  enabled: boolean,
  kind: 'type' | 'folder',
) {
  if (!activeEntry || !enabled) return
  setDialogState({ kind, notePath: activeEntry.path })
}

async function selectFromDialogState(
  dialogState: DialogState,
  kind: 'type' | 'folder',
  value: string,
  runSelection: (notePath: string, value: string) => Promise<'updated' | 'noop' | 'error'>,
): Promise<boolean> {
  if (!dialogState || dialogState.kind !== kind) return false
  const result = await runSelection(dialogState.notePath, value)
  return result !== 'error'
}

function useNoteRetargetDialogState({
  activeEntry,
  canChangeActiveNoteType,
  canMoveActiveNoteToFolder,
  changeNoteType,
  moveIntoFolder,
  localityEffectForFolderMove,
}: {
  activeEntry: VaultEntry | null
  canChangeActiveNoteType: boolean
  canMoveActiveNoteToFolder: boolean
  changeNoteType: (notePath: string, type: string) => Promise<'updated' | 'noop' | 'error'>
  moveIntoFolder: (notePath: string, folderPath: string) => Promise<'updated' | 'noop' | 'error'>
  localityEffectForFolderMove: (notePath: string, folderPath: string) => LocalityMoveEffect
}) {
  const [dialogState, setDialogState] = useState<DialogState>(null)

  const openChangeNoteTypeDialog = useCallback(() => {
    openDialogForActiveEntry(setDialogState, activeEntry, canChangeActiveNoteType, 'type')
  }, [activeEntry, canChangeActiveNoteType])

  const openMoveNoteToFolderDialog = useCallback(() => {
    openDialogForActiveEntry(setDialogState, activeEntry, canMoveActiveNoteToFolder, 'folder')
  }, [activeEntry, canMoveActiveNoteToFolder])

  const openMoveNoteToFolderDialogForPath = useCallback((notePath: string) => {
    setDialogState({ kind: 'folder', notePath })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState(null)
  }, [])

  const selectType = useCallback(async (type: string) => {
    return selectFromDialogState(dialogState, 'type', type, changeNoteType)
  }, [changeNoteType, dialogState])

  const selectFolder = useCallback(async (folderPath: string) => {
    if (!dialogState || dialogState.kind !== 'folder') return false
    const effect = localityEffectForFolderMove(dialogState.notePath, folderPath)
    if (effect) {
      // Swap the picker for a quiet privacy confirmation before moving.
      setDialogState({ kind: 'folder-locality', notePath: dialogState.notePath, folderPath, effect })
      return false
    }
    const result = await moveIntoFolder(dialogState.notePath, folderPath)
    return result !== 'error'
  }, [dialogState, localityEffectForFolderMove, moveIntoFolder])

  const confirmFolderMove = useCallback(async () => {
    if (!dialogState || dialogState.kind !== 'folder-locality') return
    const { notePath, folderPath } = dialogState
    setDialogState(null)
    await moveIntoFolder(notePath, folderPath)
  }, [dialogState, moveIntoFolder])

  return {
    dialogState,
    openChangeNoteTypeDialog,
    openMoveNoteToFolderDialog,
    openMoveNoteToFolderDialogForPath,
    closeDialog,
    selectType,
    selectFolder,
    confirmFolderMove,
  }
}

function useRetargetContextValue({
  canDropNoteOnType,
  changeNoteType,
  canDropNoteOnFolder,
  moveIntoFolder,
}: {
  canDropNoteOnType: (notePath: string, type: string) => boolean
  changeNoteType: (notePath: string, type: string) => Promise<'updated' | 'noop' | 'error'>
  canDropNoteOnFolder: (notePath: string, folderPath: string) => boolean
  moveIntoFolder: (notePath: string, folderPath: string) => Promise<'updated' | 'noop' | 'error'>
}) {
  return useMemo<NoteRetargetingContextValue>(() => ({
    canDropNoteOnType,
    dropNoteOnType: async (notePath, type) => {
      await changeNoteType(notePath, type)
    },
    canDropNoteOnFolder,
    dropNoteOnFolder: async (notePath, folderPath) => {
      await moveIntoFolder(notePath, folderPath)
    },
  }), [canDropNoteOnFolder, canDropNoteOnType, changeNoteType, moveIntoFolder])
}

function buildDialogOptions(
  availableTypes: string[],
  availableFolders: Array<{ path: string; label: string }>,
  dialogEntry: VaultEntry | null,
  vaultPath: string,
) {
  return {
    typeOptions: buildTypeOptions(availableTypes, dialogEntry),
    folderOptions: buildFolderOptions(availableFolders, dialogEntry, vaultPath),
  }
}

function buildNoteRetargetingUiState(params: {
  contextValue: NoteRetargetingContextValue
  dialogState: DialogState
  dialogEntry: VaultEntry | null
  canChangeActiveNoteType: boolean
  canMoveActiveNoteToFolder: boolean
  openChangeNoteTypeDialog: () => void
  openMoveNoteToFolderDialog: () => void
  openMoveNoteToFolderDialogForPath: (notePath: string) => void
  typeOptions: RetargetOption[]
  folderOptions: RetargetOption[]
  closeDialog: () => void
  selectType: (type: string) => Promise<boolean>
  selectFolder: (folderPath: string) => Promise<boolean>
  confirmFolderMove: () => Promise<void>
}) {
  return {
    contextValue: params.contextValue,
    isDialogOpen: params.dialogState !== null,
    dialogState: params.dialogState,
    dialogEntry: params.dialogEntry,
    canChangeActiveNoteType: params.canChangeActiveNoteType,
    canMoveActiveNoteToFolder: params.canMoveActiveNoteToFolder,
    openChangeNoteTypeDialog: params.openChangeNoteTypeDialog,
    openMoveNoteToFolderDialog: params.openMoveNoteToFolderDialog,
    openMoveNoteToFolderDialogForPath: params.openMoveNoteToFolderDialogForPath,
    typeOptions: params.typeOptions,
    folderOptions: params.folderOptions,
    closeDialog: params.closeDialog,
    selectType: params.selectType,
    selectFolder: params.selectFolder,
    confirmFolderMove: params.confirmFolderMove,
  }
}

export function useNoteRetargetingUi({
  activeEntry, activeNoteBlocked, entries, folders, selection, setSelection, setToastMessage, vaultPath, updateFrontmatter, moveNoteToFolder,
}: NoteRetargetingUiInput) {
  const {
    availableTypes, availableFolders, canDropNoteOnType, canDropNoteOnFolder, changeNoteType, moveIntoFolder,
  } = useNoteRetargeting({ entries, folders, selection, setSelection, setToastMessage, vaultPath, updateFrontmatter, moveNoteToFolder })
  const canChangeActiveNoteType = hasTypeRetargetDestination(activeEntry, activeNoteBlocked, availableTypes)
  const canMoveActiveNoteToFolder = hasFolderRetargetDestination(activeEntry, activeNoteBlocked, availableFolders, canDropNoteOnFolder)
  const localityEffectForFolderMove = useCallback((notePath: string, folderPath: string): LocalityMoveEffect => {
    const entry = entries.find((candidate) => candidate.path === notePath)
    if (!entry) return null
    const normalizedVaultPath = vaultPath.replace(/\/+$/, '')
    const normalizedFolderPath = folderPath.trim().replace(/^\/+|\/+$/g, '')
    const newPath = normalizedFolderPath
      ? `${normalizedVaultPath}/${normalizedFolderPath}/${entry.filename}`
      : `${normalizedVaultPath}/${entry.filename}`
    return localityMoveEffect(entry, newPath)
  }, [entries, vaultPath])
  const {
    dialogState, openChangeNoteTypeDialog, openMoveNoteToFolderDialog, openMoveNoteToFolderDialogForPath,
    closeDialog, selectType, selectFolder, confirmFolderMove,
  } = useNoteRetargetDialogState({
    activeEntry, canChangeActiveNoteType, canMoveActiveNoteToFolder, changeNoteType, moveIntoFolder, localityEffectForFolderMove,
  })
  const dialogEntry = useMemo(() => resolveDialogEntry(dialogState, entries, activeEntry), [activeEntry, dialogState, entries])
  const contextValue = useRetargetContextValue({ canDropNoteOnType, changeNoteType, canDropNoteOnFolder, moveIntoFolder })
  const { typeOptions, folderOptions } = buildDialogOptions(availableTypes, availableFolders, dialogEntry, vaultPath)
  return buildNoteRetargetingUiState({
    contextValue, dialogState, dialogEntry, canChangeActiveNoteType, canMoveActiveNoteToFolder,
    openChangeNoteTypeDialog, openMoveNoteToFolderDialog, openMoveNoteToFolderDialogForPath,
    typeOptions, folderOptions, closeDialog, selectType, selectFolder, confirmFolderMove,
  })
}

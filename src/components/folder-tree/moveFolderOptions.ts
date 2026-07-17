import { localityMoveEffect } from '../../lib/localityPolicy'
import type { FolderNode, VaultEntry } from '../../types'
import type { RetargetOption } from '../note-retargeting/RetargetNoteDialog'

/** Destination id used for the vault root; the backend treats "." as the root. */
export const VAULT_ROOT_DESTINATION = '.'

function isSelfOrDescendant(candidatePath: string, folderPath: string): boolean {
  return candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`)
}

function flattenFolders(nodes: FolderNode[]): Array<{ path: string; name: string }> {
  return nodes.flatMap((node) => [
    { path: node.path, name: node.name },
    ...flattenFolders(node.children),
  ])
}

function parentFolderPath(folderPath: string): string {
  const lastSlashIndex = folderPath.lastIndexOf('/')
  return lastSlashIndex >= 0 ? folderPath.slice(0, lastSlashIndex) : ''
}

/** Destinations for a folder move: vault root plus every folder that would not create a cycle. */
export function buildMoveFolderOptions(folders: FolderNode[], movingFolderPath: string): RetargetOption[] {
  const parentPath = parentFolderPath(movingFolderPath)
  const rootOption: RetargetOption = {
    id: VAULT_ROOT_DESTINATION,
    label: 'Vault root',
    current: parentPath === '',
  }
  const folderOptions = flattenFolders(folders)
    .filter((folder) => !isSelfOrDescendant(folder.path, movingFolderPath))
    .map((folder) => ({
      id: folder.path,
      label: folder.name,
      detail: folder.path === folder.name ? undefined : folder.path,
      current: folder.path === parentPath,
    }))
  return [rootOption, ...folderOptions]
}

function movedEntryPath(entryPath: string, oldPrefix: string, newPrefix: string): string {
  return `${newPrefix}${entryPath.slice(oldPrefix.length)}`
}

/** Count notes under the folder whose local-only classification would flip after the move. */
export function summarizeFolderMoveLocality(params: {
  entries: VaultEntry[]
  vaultPath: string
  folderPath: string
  destinationPath: string
}): { protects: number; exposes: number } {
  const normalizedVaultPath = params.vaultPath.replace(/\/+$/, '')
  const folderName = params.folderPath.split('/').filter(Boolean).at(-1) ?? params.folderPath
  const oldPrefix = `${normalizedVaultPath}/${params.folderPath}`
  const newPrefix = params.destinationPath === VAULT_ROOT_DESTINATION
    ? `${normalizedVaultPath}/${folderName}`
    : `${normalizedVaultPath}/${params.destinationPath}/${folderName}`

  let protects = 0
  let exposes = 0
  for (const entry of params.entries) {
    if (!entry.path.startsWith(`${oldPrefix}/`)) continue
    const effect = localityMoveEffect(entry, movedEntryPath(entry.path, oldPrefix, newPrefix))
    if (effect === 'protects') protects += 1
    if (effect === 'exposes') exposes += 1
  }
  return { protects, exposes }
}

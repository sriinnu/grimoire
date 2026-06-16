import { getCurrentVaultPath } from './currentVaultPath'

const VAULT_ROOT_MARKERS = new Set(['Grimoire'])

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/u, '')
}

function trimVaultPath(path: string, vaultPath?: string): string | null {
  if (!vaultPath) return null

  const normalizedPath = normalizePath(path)
  const normalizedVaultPath = normalizePath(vaultPath)
  if (normalizedPath === normalizedVaultPath) return ''
  if (!normalizedPath.startsWith(`${normalizedVaultPath}/`)) return null

  return normalizedPath.slice(normalizedVaultPath.length + 1)
}

function rootRelativeParentSegments(path: string, vaultPath?: string): string[] {
  const vaultRelativePath = trimVaultPath(path, vaultPath)
  if (vaultRelativePath !== null) {
    return vaultRelativePath.split('/').filter(Boolean).slice(0, -1)
  }

  const segments = normalizePath(path).split('/').filter(Boolean)
  const parentSegments = segments.slice(0, -1)
  let rootIndex = -1
  for (let index = parentSegments.length - 1; index >= 0; index -= 1) {
    if (VAULT_ROOT_MARKERS.has(parentSegments[index])) {
      rootIndex = index
      break
    }
  }

  return rootIndex >= 0 ? parentSegments.slice(rootIndex + 1) : parentSegments.slice(-2)
}

/** Returns the notebook name displayed when a note sits at the notebook root. */
export function getVaultDisplayName(vaultPath?: string): string {
  if (!vaultPath) return 'Notebook root'
  return normalizePath(vaultPath).split('/').filter(Boolean).pop() || 'Local Notebook'
}

/** Returns the note's folder/project context for compact note-list cards. */
export function getNoteLocationLabel(path: string, vaultPath?: string): string {
  const resolvedVaultPath = vaultPath ?? getCurrentVaultPath()
  const matchedVaultPath = resolvedVaultPath
    ? trimVaultPath(path, resolvedVaultPath) !== null
    : false
  const location = rootRelativeParentSegments(path, resolvedVaultPath).join(' / ')
  return location || getVaultDisplayName(matchedVaultPath || vaultPath ? resolvedVaultPath : undefined)
}

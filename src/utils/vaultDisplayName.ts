import type { DesktopPlatform } from './platform'

interface VaultDisplayNameInput {
  label?: string | null
  path?: string | null
}

export interface VaultPathDisplayOptions {
  /** The user's home directory, when known, so it can be collapsed to `~`. */
  homeDir?: string | null
  /** The host OS — controls whether `~` collapse applies (POSIX convention only). */
  platform?: DesktopPlatform
}

const STARTER_NOTEBOOK_NAMES = new Set(['demo-vault', 'demo-vault-v2', 'getting-started'])

function basenameFromPath(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).pop() ?? ''
}

function normalizeNotebookName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/gu, '-')
}

function isStarterNotebookName(value: string): boolean {
  return STARTER_NOTEBOOK_NAMES.has(normalizeNotebookName(value))
}

/**
 * Strips Windows extended-length path prefixes (`\\?\` and `\\?\UNC\`) so vault
 * paths display as clean native Windows paths (`C:\Users\…`) instead of the raw
 * canonicalized form. The match is case-insensitive (`canonicalize` emits
 * uppercase, but other tooling may not). No-op for POSIX paths.
 */
function stripWindowsLongPathPrefix(path: string): string {
  if (/^\\\\\?\\unc\\/iu.test(path)) return `\\\\${path.slice(8)}`
  if (/^\\\\\?\\/u.test(path)) return path.slice(4)
  return path
}

/**
 * Collapses a leading home directory to `~` — the native macOS/Linux convention
 * (Finder and the shell both show `~/Notes`). Returns null when the path isn't
 * under home so the caller can fall back to the absolute path.
 */
function collapseHomeDir(path: string, homeDir: string | null | undefined): string | null {
  if (!homeDir) return null
  const home = homeDir.replace(/\/+$/u, '')
  if (path === home) return '~'
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`
  return null
}

/**
 * Formats a vault path for display the way the host OS would: Windows extended
 * prefixes stripped to a native `C:\Users\…` path, and on macOS/Linux the home
 * directory collapsed to `~`. Pass `homeDir`/`platform` to enable the `~`
 * collapse; without them it only strips the Windows prefix. No-op for empties.
 */
export function formatVaultPathForDisplay(
  path: string | null | undefined,
  options: VaultPathDisplayOptions = {},
): string {
  if (!path) return ''
  const stripped = stripWindowsLongPathPrefix(path)
  // `~` is a POSIX convention; Windows shows the full path, so skip it there.
  if (options.platform !== 'windows') {
    const collapsed = collapseHomeDir(stripped, options.homeDir)
    if (collapsed !== null) return collapsed
  }
  return stripped
}

/** True when a label is actually a filesystem path (so it must not be shown raw). */
function looksLikePath(value: string): boolean {
  return /[\\/]/u.test(value) || /^[a-z]:$/iu.test(value)
}

/**
 * Returns the product-facing notebook name for vault chrome. A label that is
 * really a path (some vaults register their full canonical path as the label)
 * is ignored in favour of the path's basename, so chrome never prints
 * `\\?\C:\Users\…` as a title.
 */
export function getNotebookVaultDisplayName(vault: VaultDisplayNameInput): string {
  const rawLabel = vault.label?.trim() ?? ''
  const label = looksLikePath(rawLabel) ? '' : rawLabel
  const basename = basenameFromPath(vault.path?.trim() ?? '')
  if (label && isStarterNotebookName(label)) return 'Notebook'
  if (basename && isStarterNotebookName(basename)) return 'Notebook'
  return label || basename || 'Notebook'
}

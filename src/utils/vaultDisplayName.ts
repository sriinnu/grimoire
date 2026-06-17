interface VaultDisplayNameInput {
  label?: string | null
  path?: string | null
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
 * canonicalized form. No-op for POSIX paths.
 */
export function formatVaultPathForDisplay(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('\\\\?\\UNC\\')) return `\\\\${path.slice(8)}`
  if (path.startsWith('\\\\?\\')) return path.slice(4)
  return path
}

/** Returns the product-facing notebook name for vault chrome. */
export function getNotebookVaultDisplayName(vault: VaultDisplayNameInput): string {
  const label = vault.label?.trim() ?? ''
  const basename = basenameFromPath(vault.path?.trim() ?? '')
  if (label && isStarterNotebookName(label)) return 'Notebook'
  if (basename && isStarterNotebookName(basename)) return 'Notebook'
  return label || basename || 'Notebook'
}

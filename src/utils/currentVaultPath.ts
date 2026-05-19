let currentVaultPath: string | null = null

/** Records the active vault path for UI helpers that are outside the App tree. */
export function setCurrentVaultPath(vaultPath: string): void {
  currentVaultPath = vaultPath.trim().length > 0 ? vaultPath : null
}

/** Returns the last active vault path seen by the vault loader. */
export function getCurrentVaultPath(): string | undefined {
  return currentVaultPath ?? undefined
}

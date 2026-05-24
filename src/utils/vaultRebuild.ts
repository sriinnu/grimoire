import { createTauriChannel, invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { VaultEntry } from '../types'

export type VaultRebuildProgressEvent =
  | { event: 'Started'; data: { totalFiles: number } }
  | { event: 'Progress'; data: { processedFiles: number; totalFiles: number; currentPath: string } }
  | { event: 'Cancelled' }
  | { event: 'Finished'; data: { result: VaultEntry[] } }

/** Reloads the active vault while reporting cancellable rebuild progress. */
export async function reloadVaultWithProgress(
  vaultPath: string,
  operationId: string,
  onEvent: (event: VaultRebuildProgressEvent) => void,
): Promise<VaultEntry[]> {
  if (!isTauri()) return runMockVaultReloadWithProgress(vaultPath, onEvent)

  const channel = await createTauriChannel<VaultRebuildProgressEvent>()
  let finishedResult: VaultEntry[] | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>('reload_vault_with_progress', {
    path: vaultPath,
    operationId,
    onEvent: channel,
  })

  if (!finishedResult) throw new Error('Vault rebuild finished without entries')
  return finishedResult
}

/** Requests cancellation for an active vault rebuild operation. */
export function cancelVaultRebuild(operationId: string): Promise<boolean> {
  const args = { operationId }
  return isTauri()
    ? invoke<boolean>('cancel_portability_operation', args)
    : mockInvoke<boolean>('cancel_markdown_folder_import', args)
}

async function runMockVaultReloadWithProgress(
  vaultPath: string,
  onEvent: (event: VaultRebuildProgressEvent) => void,
): Promise<VaultEntry[]> {
  onEvent({ event: 'Started', data: { totalFiles: 0 } })
  const result = await mockInvoke<VaultEntry[]>('reload_vault', { path: vaultPath })
  const totalFiles = result.length
  result.forEach((entry, index) => {
    onEvent({
      event: 'Progress',
      data: {
        processedFiles: index + 1,
        totalFiles,
        currentPath: entry.filename || entry.path,
      },
    })
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

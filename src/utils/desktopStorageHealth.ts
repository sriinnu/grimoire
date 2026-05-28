import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

export type DesktopStorageProviderId = 'icloud-drive' | 'google-drive-desktop'
export type DesktopStorageHealthStatus =
  | 'ready'
  | 'not_selected'
  | 'provider_root_missing'
  | 'path_missing'
  | 'not_directory'
  | 'inaccessible'
  | 'unsupported_provider'

export interface DesktopStorageHealthReport {
  provider_id: DesktopStorageProviderId
  proof_level: 'desktop-folder-read-check'
  configured: boolean
  status: DesktopStorageHealthStatus
  local_path_checked: boolean
  provider_root_detected: boolean
  vault_directory_checked: boolean
  readable: boolean
  credentials_stored: boolean
  message: string
  checked_at: string
  risk_notes: string[]
}

/** Checks provider-managed desktop folders without touching cloud credentials. */
export function runDesktopStorageHealthCheck(
  vaultPath: string,
  providerId: DesktopStorageProviderId,
): Promise<DesktopStorageHealthReport> {
  const payload = { vaultPath, providerId }
  return isTauri()
    ? invoke<DesktopStorageHealthReport>('storage_desktop_provider_health_check', payload)
    : mockInvoke<DesktopStorageHealthReport>('storage_desktop_provider_health_check', payload)
}

/** Summarizes a desktop-folder storage health proof in toast-safe copy. */
export function formatDesktopStorageHealthToast(report: DesktopStorageHealthReport): string {
  return `${desktopStorageProviderLabel(report.provider_id)} local-folder check: ${desktopStorageHealthStatusLabel(report.status)}`
}

/** Removes absolute local paths and token-shaped fragments before UI display. */
export function redactDesktopStorageHealthMessage(message: string): string {
  return message
    .replace(/\/(?:Users|Volumes|private\/var|var\/folders)\/[^\s,;:)]+/g, '[local path]')
    .replace(/\b(?:token|secret|password|key)=[^\s,;:)]+/gi, '[redacted]')
}

export function desktopStorageProviderLabel(providerId: DesktopStorageProviderId): string {
  return providerId === 'icloud-drive' ? 'iCloud Drive' : 'Google Drive Desktop'
}

export function desktopStorageHealthStatusLabel(status: DesktopStorageHealthStatus): string {
  switch (status) {
    case 'ready':
      return 'ready'
    case 'not_selected':
      return 'not selected'
    case 'provider_root_missing':
      return 'provider folder missing'
    case 'path_missing':
      return 'vault missing'
    case 'not_directory':
      return 'not a folder'
    case 'inaccessible':
      return 'not readable'
    case 'unsupported_provider':
      return 'unsupported provider'
  }
}

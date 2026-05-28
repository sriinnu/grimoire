import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  desktopStorageHealthStatusLabel,
  formatDesktopStorageHealthToast,
  runDesktopStorageHealthCheck,
  type DesktopStorageHealthReport,
} from './desktopStorageHealth'
import { mockInvoke } from '../mock-tauri'

vi.mock('../lib/tauriRuntime', () => ({
  invoke: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(() => false),
  mockInvoke: vi.fn(),
}))

const readyReport: DesktopStorageHealthReport = {
  provider_id: 'icloud-drive',
  proof_level: 'desktop-folder-read-check',
  configured: true,
  status: 'ready',
  local_path_checked: true,
  provider_root_detected: true,
  vault_directory_checked: true,
  readable: true,
  credentials_stored: false,
  message: 'iCloud Drive local folder is readable.',
  checked_at: new Date(0).toISOString(),
  risk_notes: ['No cloud credentials are stored by Grimoire.'],
}

describe('desktopStorageHealth', () => {
  beforeEach(() => {
    vi.mocked(mockInvoke).mockReset()
  })

  it('invokes the native desktop provider health command with local vault scope', async () => {
    vi.mocked(mockInvoke).mockResolvedValueOnce(readyReport)

    await expect(runDesktopStorageHealthCheck('/vault', 'icloud-drive')).resolves.toBe(readyReport)

    expect(mockInvoke).toHaveBeenCalledWith('storage_desktop_provider_health_check', {
      vaultPath: '/vault',
      providerId: 'icloud-drive',
    })
  })

  it('formats redacted provider health toasts and status labels', () => {
    expect(formatDesktopStorageHealthToast(readyReport)).toBe('iCloud Drive local-folder check: ready')
    expect(desktopStorageHealthStatusLabel('provider_root_missing')).toBe('provider folder missing')
    expect(desktopStorageHealthStatusLabel('inaccessible')).toBe('not readable')
  })
})

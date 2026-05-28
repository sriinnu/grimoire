import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import {
  runDesktopStorageHealthCheck,
  type DesktopStorageHealthReport,
} from '../utils/desktopStorageHealth'
import { DesktopStorageHealthPanel } from './DesktopStorageHealthPanel'

vi.mock('../utils/desktopStorageHealth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/desktopStorageHealth')>()
  return {
    ...actual,
    runDesktopStorageHealthCheck: vi.fn(),
  }
})

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
  checked_at: '2026-05-25T00:00:00Z',
  risk_notes: ['No cloud credentials are stored by Grimoire.'],
}

describe('DesktopStorageHealthPanel', () => {
  it('runs read-only desktop folder proof without exposing credentials or paths', async () => {
    vi.mocked(runDesktopStorageHealthCheck).mockResolvedValueOnce(readyReport)

    render(
      <DesktopStorageHealthPanel
        vaultPath="/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire"
        t={createTranslator('en')}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-check-icloud-drive'))

    await waitFor(() => expect(runDesktopStorageHealthCheck).toHaveBeenCalledWith(
      '/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire',
      'icloud-drive',
    ))
    const report = screen.getByTestId('settings-desktop-storage-report-icloud-drive')
    expect(report).toHaveTextContent('ready')
    expect(report).toHaveTextContent('credentials not stored')
    expect(report).not.toHaveTextContent('/Users/')
    expect(report).not.toHaveTextContent('token')
  })
})

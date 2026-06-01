import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { StatusBar, type VaultOption } from '../StatusBar'

const vaults: VaultOption[] = [
  { label: 'Main Vault', path: '/Users/srinivas/Grimoire' },
]

function renderStatusBar(props: Partial<ComponentProps<typeof StatusBar>> = {}) {
  return render(
    <StatusBar
      noteCount={10}
      vaultPath="/Users/srinivas/Grimoire"
      vaults={vaults}
      onSwitchVault={vi.fn()}
      {...props}
    />,
  )
}

describe('StatusBar presence tone', () => {
  it('summarizes pending work without adding more visible chrome', () => {
    renderStatusBar({ modifiedCount: 2, syncStatus: 'pull_required' })

    const statusBar = screen.getByTestId('status-bar')
    expect(statusBar).toHaveAttribute('data-status-tone', 'attention')
    expect(statusBar).toHaveAccessibleName('Grimoire status, 2 pending changes, sync pull required')
  })

  it('uses danger tone for offline or conflicted states', () => {
    renderStatusBar({ conflictCount: 1, isOffline: true, syncStatus: 'conflict' })

    const statusBar = screen.getByTestId('status-bar')
    expect(statusBar).toHaveAttribute('data-status-tone', 'danger')
    expect(statusBar).toHaveAccessibleName('Grimoire status, offline, 1 conflict, sync conflict')
  })

  it('uses healthy tone when the vault is idle and clean', () => {
    renderStatusBar({ modifiedCount: 0, syncStatus: 'idle' })

    expect(screen.getByTestId('status-bar')).toHaveAttribute('data-status-tone', 'healthy')
  })

  it('leaves color and tone ownership to theme CSS for darker bottom bars', () => {
    renderStatusBar({ modifiedCount: 0, syncStatus: 'idle' })

    const statusBar = screen.getByTestId('status-bar')
    expect(statusBar.style.getPropertyValue('--foreground')).toBe('')
    expect(statusBar.style.getPropertyValue('--muted-foreground')).toBe('')
    expect(statusBar.style.getPropertyValue('--status-bar-foreground')).toBe('')
    expect(statusBar.style.getPropertyValue('--status-bar-warning-fg')).toBe('')
    expect(statusBar.style.getPropertyValue('--status-bar-badge-fg')).toBe('')
    expect(statusBar.style.color).toBe('')
    expect(statusBar.style.background).toBe('')
    expect(statusBar.style.borderTop).toBe('')
    expect(statusBar.style.boxShadow).toBe('')
    expect(statusBar.style.getPropertyValue('backdrop-filter')).toBe('')
  })
})

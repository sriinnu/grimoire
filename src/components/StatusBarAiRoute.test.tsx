import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatusBar, type VaultOption } from './StatusBar'

const vaults: VaultOption[] = [
  { label: 'Main Vault', path: '/Users/srinivas/Grimoire' },
]

const installedAiAgentsStatus = {
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'installed' as const, version: '0.37.0' },
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
}

function renderStatusBarRoute() {
  render(
    <TooltipProvider>
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        aiAgentsStatus={installedAiAgentsStatus}
        defaultAiAgent="chitragupta"
        defaultAiProvider="ollama"
        defaultAiModel="qwen3:8b"
        onSetDefaultAiAgent={vi.fn()}
      />
    </TooltipProvider>,
  )
}

describe('StatusBar AI controls', () => {
  it('keeps route disclosure out of the status bar and keeps the bar focused on notebook state', () => {
    renderStatusBarRoute()

    expect(screen.queryByTestId('status-ai-agents')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-ai-agents-route-truth')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-bar')).toHaveAccessibleName('Notebook status')
    expect(screen.getByTestId('status-save-signal')).toBeInTheDocument()
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from './SettingsPanel'
import type { Settings } from '../types'

const emptySettings: Settings = {
  auto_pull_interval_minutes: null,
  autogit_enabled: null,
  autogit_idle_threshold_seconds: null,
  autogit_inactive_threshold_seconds: null,
  auto_advance_inbox_after_organize: null,
  telemetry_consent: null,
  crash_reporting_enabled: null,
  analytics_enabled: null,
  anonymous_id: null,
  release_channel: null,
  theme_mode: null,
  theme_preset: null,
  editor_font: null,
  ui_language: null,
  menu_bar_icon_enabled: null,
  native_shell_material: null,
}

function installPointerCapturePolyfill() {
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {}
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {}
  }
}

describe('SettingsPanel sync and agent settings', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    installPointerCapturePolyfill()
  })

  it('defaults the release channel trigger to stable', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    expect(screen.getByTestId('settings-release-channel')).toHaveAttribute('data-value', 'stable')
    expect(screen.queryByText(/Beta\/Stable/i)).not.toBeInTheDocument()
  })

  it('treats a legacy beta release channel as stable', () => {
    render(<SettingsPanel open={true} settings={{ ...emptySettings, release_channel: 'beta' }} onSave={onSave} onClose={onClose} />)

    expect(screen.getByTestId('settings-release-channel')).toHaveAttribute('data-value', 'stable')
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
  })

  it('preserves alpha when alpha is already selected', () => {
    render(<SettingsPanel open={true} settings={{ ...emptySettings, release_channel: 'alpha' }} onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ release_channel: 'alpha' }))
  })

  it('anchors the default agent dropdown with the popper strategy', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    fireEvent.pointerDown(screen.getByTestId('settings-default-ai-agent'), { button: 0, pointerType: 'mouse' })

    expect(document.querySelector('[data-anchor-strategy="popper"]')).toBeInTheDocument()
  })

  it('keeps keyboard opening enabled for the default agent dropdown', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    const trigger = screen.getByTestId('settings-default-ai-agent')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })

    expect(document.querySelector('[data-anchor-strategy="popper"]')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Codex/i })).toBeInTheDocument()
  })

  it('saves a model override for the selected default agent', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    fireEvent.change(screen.getByTestId('settings-default-ai-model'), {
      target: { value: 'sonnet' },
    })
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      ai_agent_models: { claude_code: 'sonnet' },
    }))
  })

  it('saves a provider override for the selected default agent', () => {
    render(<SettingsPanel open={true} settings={{ ...emptySettings, default_ai_agent: 'chitragupta' }} onSave={onSave} onClose={onClose} />)

    fireEvent.change(screen.getByTestId('settings-default-ai-provider'), {
      target: { value: 'openai' },
    })

    expect(screen.getByTestId('settings-ai-agent-route-note')).toHaveTextContent('Provider override: --provider openai')

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      ai_agent_providers: { chitragupta: 'openai' },
    }))
  })

  it('explains that Chitragupta uses the local CLI route when no provider override is set', () => {
    render(<SettingsPanel open={true} settings={{ ...emptySettings, default_ai_agent: 'chitragupta' }} onSave={onSave} onClose={onClose} />)

    expect(screen.getByTestId('settings-ai-agent-route-note')).toHaveTextContent('Provider resolves from the Chitragupta stream')
    expect(screen.getByTestId('settings-ai-agent-route-note')).toHaveTextContent('Model resolves from the Chitragupta stream')
  })

  it('shows Chitragupta MCP readiness as a separate memory contract', () => {
    const onInstallMcp = vi.fn()
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, default_ai_agent: 'chitragupta' }}
        mcpStatus="installed"
        onInstallMcp={onInstallMcp}
        onSave={onSave}
        onClose={onClose}
      />,
    )

    const contract = screen.getByTestId('settings-ai-agent-chitragupta-contract')
    expect(contract).toHaveTextContent('MCP memory contract')
    expect(contract).toHaveTextContent('Live memory lanes stay local-ledger only')
    expect(contract).toHaveTextContent('External MCP registration')
    expect(contract).toHaveTextContent('Connected')
    expect(contract).toHaveTextContent('Runtime bridge readiness is still verified')
    expect(contract).toHaveTextContent('recall')
    expect(contract).toHaveTextContent('wiki')
    expect(contract).toHaveTextContent('graph')
    expect(contract).toHaveTextContent('diagnostics')
    expect(contract).not.toHaveTextContent(/google|gemini|anthropic|openai|\/Users/i)

    fireEvent.click(screen.getByTestId('settings-ai-agent-mcp-runtime-action'))

    expect(onInstallMcp).toHaveBeenCalledOnce()
  })
})

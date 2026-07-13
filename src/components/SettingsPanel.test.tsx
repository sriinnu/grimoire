import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

describe('SettingsPanel workflow settings', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    installPointerCapturePolyfill()
  })

  it('defaults the organization workflow switch to on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByRole('switch', { name: 'Organize notes explicitly' })).toHaveAttribute('aria-checked', 'true')
  })

  it('defaults auto-advance to the next inbox item to off', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByRole('switch', { name: 'Auto-advance to next Inbox item' })).toHaveAttribute('aria-checked', 'false')
  })

  it('defaults the initial H1 auto-rename switch to on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByRole('switch', { name: 'Auto-rename untitled notes from first H1' })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows a daily assistant workflow runway before workflow toggles', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    const runway = screen.getByTestId('settings-workflow-runway')
    expect(within(runway).getByText('Daily brief')).toBeInTheDocument()
    expect(within(runway).getByText(/journal nudges/i)).toBeInTheDocument()
    expect(within(runway).getByText('Inbox triage')).toBeInTheDocument()
    expect(within(runway).getByText('Inbox on')).toBeInTheDocument()
    expect(within(runway).getByText('Flow-through')).toBeInTheDocument()
    expect(within(runway).getByText('Manual')).toBeInTheDocument()
    expect(within(runway).getByText('Title hygiene')).toBeInTheDocument()
    expect(within(runway).getByText('H1 sync')).toBeInTheDocument()
  })

  it('updates the workflow runway as workflow settings change', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Organize notes explicitly' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-advance to next Inbox item' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Auto-rename untitled notes from first H1' }))

    const runway = screen.getByTestId('settings-workflow-runway')
    expect(within(runway).getByText('Simple flow')).toBeInTheDocument()
    expect(within(runway).getByText('Auto')).toBeInTheDocument()
    expect(within(runway).getAllByText('Manual')).not.toHaveLength(0)
    expect(within(runway).getByText('Filenames wait until you rename them yourself.')).toBeInTheDocument()
  })

  it('defaults AutoGit to off with recommended thresholds', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByRole('switch', { name: 'Enable AutoGit' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('settings-autogit-idle-threshold')).toHaveValue(90)
    expect(screen.getByTestId('settings-autogit-inactive-threshold')).toHaveValue(30)
  })

  it('saves AutoGit preferences when toggled and edited', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Enable AutoGit' }))
    fireEvent.change(screen.getByTestId('settings-autogit-idle-threshold'), { target: { value: '120' } })
    fireEvent.change(screen.getByTestId('settings-autogit-inactive-threshold'), { target: { value: '45' } })
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      autogit_enabled: true,
      autogit_idle_threshold_seconds: 120,
      autogit_inactive_threshold_seconds: 45,
    }))
  })

  it('disables AutoGit controls when the current vault is not git-enabled', () => {
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        isGitVault={false}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByRole('switch', { name: 'Enable AutoGit' })).toBeDisabled()
    expect(screen.getByTestId('settings-autogit-idle-threshold')).toBeDisabled()
    expect(screen.getByTestId('settings-autogit-inactive-threshold')).toBeDisabled()
    expect(screen.getByTestId('settings-pull-interval')).toBeDisabled()
    expect(screen.getByTestId('settings-pull-interval')).not.toHaveAttribute('data-settings-autofocus')
  })

  it('shows an explicit local-only Git capability when Git metadata is paused', () => {
    const onSetGitEnabled = vi.fn()
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        isGitVault={false}
        hasGitMetadata={true}
        onSetGitEnabled={onSetGitEnabled}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getAllByText('Local only')).not.toHaveLength(0)
    expect(screen.getByText(/intentionally keeping the vault local-only/i)).toBeInTheDocument()

    fireEvent.click(within(screen.getByTestId('settings-git-enabled')).getByRole('switch', { name: 'Git' }))

    expect(onSetGitEnabled).toHaveBeenCalledWith(true)
  })

  it('shows a local-first sync runway before Git and AutoGit controls', () => {
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        isGitVault={false}
        hasGitMetadata={false}
        onSave={onSave}
        onClose={onClose}
      />
    )

    const runway = screen.getByTestId('settings-sync-runway')
    expect(within(runway).getByText('Markdown source')).toBeInTheDocument()
    expect(within(runway).getByText('Files stay readable on disk first.')).toBeInTheDocument()
    expect(within(runway).getByText('Git lane')).toBeInTheDocument()
    expect(within(runway).getByText('No repository metadata required.')).toBeInTheDocument()
    expect(within(runway).getByText('Gated')).toBeInTheDocument()
    expect(within(runway).getByText('Preference only; update checks verify published feeds before offering an install.')).toBeInTheDocument()
  })

  it('can turn Git off for the current vault from Settings', () => {
    const onSetGitEnabled = vi.fn()
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        isGitVault={true}
        hasGitMetadata={true}
        onSetGitEnabled={onSetGitEnabled}
        onSave={onSave}
        onClose={onClose}
      />
    )

    fireEvent.click(within(screen.getByTestId('settings-git-enabled')).getByRole('switch', { name: 'Git' }))

    expect(onSetGitEnabled).toHaveBeenCalledWith(false)
  })

  it('saves the initial H1 auto-rename preference when toggled off', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-rename untitled notes from first H1' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      initial_h1_auto_rename_enabled: false,
    }))
  })

  it('saves the organization workflow preference when toggled off', () => {
    const onSaveExplicitOrganization = vi.fn()
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        onSave={onSave}
        explicitOrganizationEnabled={true}
        onSaveExplicitOrganization={onSaveExplicitOrganization}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Organize notes explicitly' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSaveExplicitOrganization).toHaveBeenCalledWith(false)
  })

  it('saves the auto-advance inbox preference when toggled on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-advance to next Inbox item' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      auto_advance_inbox_after_organize: true,
    }))
  })

  it('calls onClose when Cancel is clicked', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByTitle('Close settings'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on Escape key', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('saves on Cmd+Enter', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.keyDown(screen.getByTestId('settings-panel'), { key: 'Enter', metaKey: true })

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      auto_pull_interval_minutes: 5,
    }))
  })

  it('renders the Radix backdrop for outside dismissal', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull()
    fireEvent.pointerDown(document.body, { button: 0 })
    fireEvent.pointerUp(document.body, { button: 0 })
    fireEvent.click(document.body)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows keyboard shortcut hint in footer', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByText(/to save/)).toBeInTheDocument()
  })

  describe('Privacy section', () => {
    it('leads with a local-only note and no telemetry toggles', () => {
      render(
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      )
      expect(screen.getByTestId('settings-privacy-local-note')).toBeInTheDocument()
      expect(screen.getByTestId('settings-cloud-transcription')).toBeInTheDocument()
      // Telemetry was removed entirely — nothing leaves the device.
      expect(screen.queryByTestId('settings-crash-reporting')).not.toBeInTheDocument()
      expect(screen.queryByTestId('settings-analytics')).not.toBeInTheDocument()
    })

    it('shows a local-first privacy runway with no diagnostics step', () => {
      render(
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      )

      const runway = screen.getByTestId('settings-privacy-runway')
      expect(within(runway).getByText('Private by default')).toBeInTheDocument()
      expect(within(runway).getByText('Private capture')).toBeInTheDocument()
      expect(within(runway).getByText('Cloud blocked')).toBeInTheDocument()
      // No telemetry/diagnostics opt-in copy anywhere.
      expect(within(runway).queryByText('Anonymous opt-in')).not.toBeInTheDocument()
    })

    it('reflects cloud transcription allowed in the runway when enabled', () => {
      const cloudEnabled: Settings = {
        ...emptySettings,
        cloud_transcription_enabled: true,
      }
      render(
        <SettingsPanel open={true} settings={cloudEnabled} onSave={onSave} onClose={onClose} />
      )

      const runway = screen.getByTestId('settings-privacy-runway')
      expect(within(runway).getByText('Cloud allowed')).toBeInTheDocument()
    })

    it('keeps cloud transcription off until explicitly enabled', () => {
      render(
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      )

      const cloudSwitch = within(screen.getByTestId('settings-cloud-transcription')).getByRole('switch')
      expect(cloudSwitch).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(cloudSwitch)
      fireEvent.click(screen.getByTestId('settings-save'))

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        cloud_transcription_enabled: true,
        transcription_provider: 'local_whisper',
      }))
    })
  })
})

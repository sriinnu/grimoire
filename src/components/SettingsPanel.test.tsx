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

  it('calls onClose when clicking backdrop', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    fireEvent.click(screen.getByTestId('settings-panel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows keyboard shortcut hint in footer', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(screen.getByText(/to open settings/)).toBeInTheDocument()
  })

  describe('Privacy & Telemetry section', () => {
    it('renders crash reporting and analytics toggles', () => {
      render(
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      )
      expect(screen.getByTestId('settings-cloud-transcription')).toBeInTheDocument()
      expect(screen.getByTestId('settings-crash-reporting')).toBeInTheDocument()
      expect(screen.getByTestId('settings-analytics')).toBeInTheDocument()
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

    it('toggles reflect initial settings state', () => {
      const withTelemetry: Settings = {
        ...emptySettings,
        telemetry_consent: true,
        crash_reporting_enabled: true,
        analytics_enabled: false,
        anonymous_id: 'test-uuid',
      }
      render(
        <SettingsPanel open={true} settings={withTelemetry} onSave={onSave} onClose={onClose} />
      )

      const crashCheckbox = within(screen.getByTestId('settings-crash-reporting')).getByRole('checkbox')
      const analyticsCheckbox = within(screen.getByTestId('settings-analytics')).getByRole('checkbox')

      expect(crashCheckbox).toHaveAttribute('aria-checked', 'true')
      expect(analyticsCheckbox).toHaveAttribute('aria-checked', 'false')
    })

    it('saves telemetry settings when toggled and saved', () => {
      render(
        <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
      )

      fireEvent.click(within(screen.getByTestId('settings-crash-reporting')).getByRole('checkbox'))
      fireEvent.click(screen.getByTestId('settings-save'))

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        crash_reporting_enabled: true,
        analytics_enabled: false,
      }))
    })
  })
})

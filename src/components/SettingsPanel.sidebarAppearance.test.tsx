import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../types'
import { SettingsPanel } from './SettingsPanel'

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
}

function installPointerCapturePolyfill(): void {
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

describe('SettingsPanel sidebar appearance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installPointerCapturePolyfill()
  })

  it('renders the selected theme as a left-sidebar preview', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_preset: 'graphite' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('settings-sidebar-preview')).toHaveAttribute(
      'data-sidebar-preset-preview',
      'graphite',
    )
    expect(screen.getByTestId('settings-sidebar-preview')).toHaveAttribute(
      'data-theme-preview',
      'light',
    )
  })

  it('updates the left-sidebar preview when a theme preset is selected', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={vi.fn()} onClose={vi.fn()} />
    )

    fireEvent.click(screen.getByTestId('settings-theme-preset-future'))

    expect(screen.getByTestId('settings-sidebar-preview')).toHaveAttribute(
      'data-sidebar-preset-preview',
      'future',
    )
  })

  it('includes the same artwork rail used by the live sidebar preview', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_preset: 'manuscript' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('settings-sidebar-artwork-preview')).toBeInTheDocument()
  })
})

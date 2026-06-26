import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Settings } from '../types'
import {
  emitLocalThemePackChange,
  writeStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
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

function createStorageMock(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: vi.fn(() => { values.clear() }),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => { values.delete(key) }),
    setItem: vi.fn((key: string, value: string) => { values.set(key, value) }),
  }
}

describe('SettingsPanel sidebar appearance', () => {
  const localStorageMock = createStorageMock()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    window.localStorage.clear()
    installPointerCapturePolyfill()
  })

  it('renders the aurora sidebar preview in its light mode', () => {
    // Grimoire now ships a single theme: midnight aurora. Any persisted preset value —
    // including legacy ids like "nocturne" — collapses to morning-notebook.
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_preset: 'nocturne' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )

    const preview = screen.getByTestId('settings-sidebar-preview')
    expect(preview).toHaveAttribute('data-sidebar-preset-preview', 'morning-notebook')
    expect(preview).toHaveAttribute('data-theme-definition-preview', 'morning-notebook')
    expect(preview).toHaveAttribute('data-theme-preview', 'light')
    // Light mode paints the cool aurora sidebar surface.
    expect(preview).toHaveStyle({ background: '#f6f2ea' })
  })

  it('repaints the aurora preview when the dark mode is selected', () => {
    // The preset picker is gone; the light/dark toggle is the primary theme control.
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={vi.fn()} onClose={vi.fn()} />
    )

    const preview = screen.getByTestId('settings-sidebar-preview')
    expect(preview).toHaveAttribute('data-theme-preview', 'light')
    expect(preview).toHaveStyle({ background: '#f6f2ea' })

    fireEvent.click(screen.getByTestId('settings-theme-dark'))

    // Same single aurora preset, now in its dark navy mode.
    expect(preview).toHaveAttribute('data-sidebar-preset-preview', 'morning-notebook')
    expect(preview).toHaveAttribute('data-theme-preview', 'dark')
    expect(preview).toHaveStyle({ background: '#081a21' })
  })

  it('includes the same artwork rail used by the live sidebar preview', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_preset: 'morning-notebook' }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByTestId('settings-sidebar-artwork-preview')).toBeInTheDocument()
  })

  it('updates the left-sidebar preview from a local experience pack override', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={vi.fn()} onClose={vi.fn()} />
    )

    act(() => {
      writeStoredLocalThemeDefinition(window.localStorage, THEME_PRESET_CATALOG[0])
      emitLocalThemePackChange()
    })

    expect(screen.getByTestId('settings-sidebar-preview')).toHaveAttribute(
      'data-theme-definition-preview',
      THEME_PRESET_CATALOG[0].id,
    )
  })
})

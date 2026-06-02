import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SettingsPanel } from './SettingsPanel'
import type { Settings } from '../types'
import { THEME_MODE_STORAGE_KEY } from '../lib/themeMode'

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

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

describe('SettingsPanel appearance and agent settings', () => {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const localStorageMock = createStorageMock()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    window.localStorage.clear()
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    setPlatform('MacIntel')
    installPointerCapturePolyfill()
  })

  it('renders nothing when not open', () => {
    const { container } = render(
      <SettingsPanel open={false} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders modal when open', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(document.querySelector('.settings-panel-shell')).toHaveClass('grimoire-settings-stage')
    expect(screen.getAllByText('Sync & Updates')).not.toHaveLength(0)
  })

  it('renders a native settings rail with active section state', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)
    expect(screen.getByTestId('settings-navigation-rail')).toBeInTheDocument()
    expect(screen.getByTestId('settings-main-surface')).toBeInTheDocument()
    expect(screen.getByTestId('settings-nav-settings-portability')).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByTestId('settings-nav-settings-appearance'))
    expect(screen.getByTestId('settings-nav-settings-appearance')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('settings-nav-settings-portability')).not.toHaveAttribute('aria-current')
  })

  it('updates the active settings rail item while the main surface scrolls', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    const mainSurface = screen.getByTestId('settings-main-surface')
    Object.defineProperty(mainSurface, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, bottom: 640, left: 0, right: 860, width: 860, height: 640, x: 0, y: 0, toJSON: () => ({}) }),
    })

    for (const [id, top] of [
      ['settings-portability', -460],
      ['settings-sync', -320],
      ['settings-appearance', -140],
      ['settings-workflow', 18],
      ['settings-agents', 220],
    ] as const) {
      const section = document.getElementById(id)
      expect(section).not.toBeNull()
      Object.defineProperty(section, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ top, bottom: top + 120, left: 0, right: 640, width: 640, height: 120, x: 0, y: top, toJSON: () => ({}) }),
      })
    }

    fireEvent.scroll(mainSurface)

    expect(screen.getByTestId('settings-nav-settings-workflow')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('settings-nav-settings-appearance')).not.toHaveAttribute('aria-current')
  })

  it('updates the draft language when stored settings finish loading', () => {
    const { rerender } = render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    rerender(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, ui_language: 'zh-Hans' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('calls onSave with stable defaults on save', () => {
    render(<SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      auto_pull_interval_minutes: 5,
      autogit_enabled: false,
      autogit_idle_threshold_seconds: 90,
      autogit_inactive_threshold_seconds: 30,
      release_channel: null,
      theme_mode: 'light',
      theme_preset: 'constellation',
      editor_font: 'literary',
      editor_line_height: 'comfortable',
      menu_bar_icon_enabled: false,
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('saves the native menu bar icon preference when toggled on', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Show Grimoire in the menu bar' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      menu_bar_icon_enabled: true,
    }))
  })

  it('labels unsupported native quick actions with the current Windows platform', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    setPlatform('Win32')

    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByText('Native Windows')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Windows tray integration not available yet' })).toBeDisabled()
    expect(screen.getByTestId('settings-menu-bar-icon-enabled')).toHaveTextContent(
      'This control stays off until Grimoire ships native quick actions for Windows.',
    )
  })

  it('labels and saves the native shell material preference', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByRole('combobox', { name: 'Window material' })).toBeInTheDocument()
    expect(screen.getByTestId('settings-native-locality-note')).toHaveClass('settings-material-inner')
    fireEvent.pointerDown(screen.getByTestId('settings-native-shell-material'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Glass preview' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      native_shell_material: 'glass-preview',
    }))
  })

  it('defaults the color mode control to light', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByTestId('settings-theme-mode')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
  })

  it('defaults the language selector to system language', () => {
    render(
      <SettingsPanel
        open={true}
        settings={emptySettings}
        locale="en"
        systemLocale="zh-Hans"
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('settings-ui-language')).toHaveAttribute('data-value', 'system')
    expect(screen.getByText('系统（简体中文）')).toBeInTheDocument()
  })

  it('keeps the language selector keyboard accessible', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    const trigger = screen.getByTestId('settings-ui-language')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' })

    expect(screen.getByRole('option', { name: 'Simplified Chinese' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'German' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Hindi' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sanskrit' })).toBeInTheDocument()
  })

  it('saves the selected UI language and updates visible settings text', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.pointerDown(screen.getByTestId('settings-ui-language'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Simplified Chinese' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      ui_language: 'zh-Hans',
    }))
  })

  it('saves Hindi as a first-class UI language', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.pointerDown(screen.getByTestId('settings-ui-language'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Hindi' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(screen.getByText('सेटिंग्स')).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      ui_language: 'hi',
    }))
  })

  it('uses the stored color mode mirror when settings have no saved mode', () => {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark')

    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the selected dark color mode', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_mode: 'dark',
    }))
  })

  it('saves the selected theme preset, editor font, and editor line height', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByTestId('settings-theme-preset-retro-terminal'))
    fireEvent.pointerDown(screen.getByTestId('settings-editor-font'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Readable Sans' }))
    fireEvent.pointerDown(screen.getByTestId('settings-editor-line-height'), { button: 0, pointerType: 'mouse' })
    fireEvent.click(screen.getByRole('option', { name: 'Spacious' }))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_preset: 'retro-terminal',
      editor_font: 'readable',
      editor_line_height: 'spacious',
    }))
  })

  it('saves the nocturne theme preset', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    fireEvent.click(screen.getByTestId('settings-theme-preset-nocturne'))
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_preset: 'nocturne',
    }))
  })

  it('renders the curated personal theme preset set', () => {
    render(
      <SettingsPanel open={true} settings={emptySettings} onSave={onSave} onClose={onClose} />
    )

    expect(screen.getByTestId('settings-theme-preset-constellation')).toBeInTheDocument()
    expect(screen.getByTestId('settings-theme-preset-daylight-atelier')).toBeInTheDocument()
    expect(screen.getByTestId('settings-theme-preset-prabhat-studio')).toBeInTheDocument()
    expect(screen.getByTestId('settings-theme-preset-living-archive')).toBeInTheDocument()
    expect(screen.getByTestId('settings-theme-preset-nocturne')).toBeInTheDocument()
    expect(screen.getByTestId('settings-theme-preset-retro-terminal')).toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-research-cockpit')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-manuscript')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-aether')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-ion')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-moss')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-retro')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-aurora')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-future')).not.toBeInTheDocument()
  })

  it('renders the appearance preview with the selected preset', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_preset: 'nocturne', editor_font: 'readable', editor_line_height: 'compact' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute(
      'data-theme-preset-preview',
      'nocturne',
    )
    expect(screen.getByTestId('settings-editor-font')).toHaveAttribute('data-value', 'readable')
    expect(screen.getByTestId('settings-editor-line-height')).toHaveAttribute('data-value', 'compact')
  })

  it('preserves a saved dark color mode until changed', () => {
    render(
      <SettingsPanel
        open={true}
        settings={{ ...emptySettings, theme_mode: 'dark' }}
        onSave={onSave}
        onClose={onClose}
      />
    )

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByTestId('settings-save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      theme_mode: 'dark',
    }))
  })

})

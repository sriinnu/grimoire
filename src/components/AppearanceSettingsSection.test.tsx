import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'

const t = createTranslator('en')

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

describe('AppearanceSettingsSection', () => {
  beforeEach(() => {
    installPointerCapturePolyfill()
  })

  it('renders the single warm-paper theme with a light/dark mode toggle', () => {
    const setThemeMode = vi.fn()

    render(
      <AppearanceSettingsSection
        t={t}
        themeMode="dark"
        setThemeMode={setThemeMode}
        themePreset="morning-notebook"
        setThemePreset={vi.fn()}
        editorFont="system"
        setEditorFont={vi.fn()}
        editorLineHeight="comfortable"
        setEditorLineHeight={vi.fn()}
      />,
    )

    // The multi-card preset picker is gone; the light/dark toggle is the primary theme control.
    const mode = screen.getByTestId('settings-theme-mode')
    expect(within(mode).getByTestId('settings-theme-light')).toBeInTheDocument()
    expect(within(mode).getByTestId('settings-theme-dark')).toBeInTheDocument()

    // Warm Paper ships both modes, so neither toggle button is disabled.
    expect(within(mode).getByTestId('settings-theme-light')).not.toBeDisabled()
    expect(within(mode).getByTestId('settings-theme-dark')).not.toBeDisabled()

    // Dark mode is the active selection here.
    expect(within(mode).getByTestId('settings-theme-dark')).toHaveAttribute('aria-checked', 'true')
    expect(within(mode).getByTestId('settings-theme-light')).toHaveAttribute('aria-checked', 'false')

    // No removed preset cards survive the collapse.
    expect(screen.queryByTestId('settings-theme-preset-nocturne')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-constellation')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-code-notebook')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-theme-preset-group-specialist')).not.toBeInTheDocument()

    // The preview reflects the warm-paper (morning-notebook) identity in dark mode.
    const preview = screen.getByTestId('settings-appearance-preview')
    expect(preview).toHaveAttribute('data-theme-preview', 'dark')
    expect(preview).toHaveAttribute('data-theme-preset-preview', 'morning-notebook')
    expect(preview).toHaveAttribute('data-motion-preview', 'standard')
    expect(preview).toHaveAttribute('data-graph-preview', 'ledger')
    expect(preview).toHaveAttribute('data-canvas-preview', 'paper')
    expect(preview).toHaveAttribute('data-shell-preview', 'notebook')
    expect(preview).toHaveAttribute('data-writing-preview', 'system')
    expect(screen.getByLabelText('Experience profile traits')).toBeInTheDocument()

    // The curated editor-font catalog is unchanged: serif + sans + mono, no legacy aliases.
    fireEvent.pointerDown(screen.getByTestId('settings-editor-font'), { button: 0, pointerType: 'mouse' })
    expect(screen.getByRole('option', { name: 'Book Serif' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Editorial Serif' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Manuscript Serif' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Native Sans' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Readable Sans' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Humanist Sans' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mono' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Handwritten' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Compact' })).not.toBeInTheDocument()

    expect(screen.getByTestId('settings-editor-line-height')).toHaveAttribute('data-value', 'comfortable')
  })

  it('switches between warm-paper light and dark via the mode toggle', () => {
    const setThemeMode = vi.fn()

    render(
      <AppearanceSettingsSection
        t={t}
        themeMode="light"
        setThemeMode={setThemeMode}
        themePreset="morning-notebook"
        setThemePreset={vi.fn()}
        editorFont="mono"
        setEditorFont={vi.fn()}
        editorLineHeight="compact"
        setEditorLineHeight={vi.fn()}
      />,
    )

    const mode = screen.getByTestId('settings-theme-mode')

    // Light is the active selection; the preview renders the parchment surface.
    expect(within(mode).getByTestId('settings-theme-light')).toHaveAttribute('aria-checked', 'true')
    expect(within(mode).getByTestId('settings-theme-dark')).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-theme-preview', 'light')

    // Picking the candlelit (dark) mode drives the theme mode without any preset change.
    fireEvent.click(within(mode).getByTestId('settings-theme-dark'))
    expect(setThemeMode).toHaveBeenCalledWith('dark')
  })
})

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

  it('renders curated preset groups without changing preset selection behavior', () => {
    const setThemePreset = vi.fn()

    render(
      <AppearanceSettingsSection
        t={t}
        themeMode="dark"
        setThemeMode={vi.fn()}
        themePreset="nocturne"
        setThemePreset={setThemePreset}
        editorFont="system"
        setEditorFont={vi.fn()}
        editorLineHeight="comfortable"
        setEditorLineHeight={vi.fn()}
      />,
    )

    const signature = screen.getByTestId('settings-theme-preset-group-signature')
    const studio = screen.getByTestId('settings-theme-preset-group-studio')
    const lab = screen.getByTestId('settings-theme-preset-group-lab')

    expect(within(signature).getByTestId('settings-theme-preset-living-archive')).toBeInTheDocument()
    expect(within(signature).getByTestId('settings-theme-preset-nocturne')).toHaveAttribute('aria-checked', 'true')
    expect(within(signature).getByTestId('settings-theme-preset-constellation')).toBeInTheDocument()
    expect(within(studio).getByTestId('settings-theme-preset-daylight-atelier')).toBeInTheDocument()
    expect(within(studio).getByTestId('settings-theme-preset-prabhat-studio')).toBeInTheDocument()
    expect(within(lab).getByTestId('settings-theme-preset-retro-terminal')).toBeInTheDocument()

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

    fireEvent.click(within(lab).getByTestId('settings-theme-preset-retro-terminal'))

    expect(setThemePreset).toHaveBeenCalledWith('retro-terminal')
    expect(screen.getByTestId('settings-editor-line-height')).toHaveAttribute('data-value', 'comfortable')
  })
})

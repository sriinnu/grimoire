import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    const paper = screen.getByTestId('settings-theme-preset-group-paper')
    const specialist = screen.getByTestId('settings-theme-preset-group-specialist')

    expect(within(signature).getByTestId('settings-theme-preset-morning-notebook')).toBeInTheDocument()
    expect(within(signature).getByTestId('settings-theme-preset-nocturne')).toHaveAttribute('aria-checked', 'true')
    expect(within(paper).getByTestId('settings-theme-preset-daylight-notebook')).toBeInTheDocument()
    expect(within(paper).getByTestId('settings-theme-preset-living-archive')).toBeInTheDocument()
    expect(within(specialist).getByTestId('settings-theme-preset-constellation')).toBeInTheDocument()
    expect(within(specialist).getByTestId('settings-theme-preset-code-notebook')).toBeInTheDocument()
    expect(within(specialist).getByTestId('settings-theme-preset-constellation')).toHaveAttribute('data-graph', 'constellation')
    expect(within(specialist).getByTestId('settings-theme-preset-constellation')).toHaveAttribute('data-canvas', 'blueprint')
    expect(within(specialist).getByTestId('settings-theme-preset-constellation')).toHaveAttribute('data-shell', 'map')
    expect(within(specialist).getByTestId('settings-theme-preset-constellation')).toHaveAttribute('data-writing', 'graph')
    expect(within(specialist).getByTestId('settings-theme-preset-code-notebook')).toHaveAttribute('data-density', 'compact')
    expect(within(specialist).getByTestId('settings-theme-preset-code-notebook')).toHaveAttribute('data-code-block', 'terminal')
    expect(within(specialist).getByTestId('settings-theme-preset-code-notebook')).toHaveAttribute('data-shell', 'terminal')
    expect(within(specialist).getByTestId('settings-theme-preset-code-notebook')).toHaveAttribute('data-writing', 'terminal')
    expect(within(screen.getByTestId('settings-theme-preset-code-notebook-traits')).getByText('Compact')).toBeInTheDocument()
    expect(within(screen.getByTestId('settings-theme-preset-code-notebook-traits')).getByLabelText('Shell: Terminal')).toBeInTheDocument()
    expect(within(screen.getByTestId('settings-theme-preset-code-notebook-traits')).getByLabelText('Writing: Terminal')).toBeInTheDocument()
    expect(within(screen.getByTestId('settings-theme-preset-code-notebook-traits')).getByLabelText('Code: Terminal')).toBeInTheDocument()
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-motion-preview', 'calm')
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-graph-preview', 'ledger')
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-shell-preview', 'notebook')
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-writing-preview', 'system')
    expect(screen.getByLabelText('Experience profile traits')).toBeInTheDocument()

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

    fireEvent.click(within(specialist).getByTestId('settings-theme-preset-code-notebook'))

    expect(setThemePreset).toHaveBeenCalledWith('code-notebook')
    expect(screen.getByTestId('settings-editor-line-height')).toHaveAttribute('data-value', 'comfortable')
  })

  it('moves dark-only presets to dark mode instead of showing a fake light surface', async () => {
    const setThemeMode = vi.fn()

    render(
      <AppearanceSettingsSection
        t={t}
        themeMode="light"
        setThemeMode={setThemeMode}
        themePreset="code-notebook"
        setThemePreset={vi.fn()}
        editorFont="mono"
        setEditorFont={vi.fn()}
        editorLineHeight="compact"
        setEditorLineHeight={vi.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Light' })).toBeDisabled()
    expect(screen.getByTestId('settings-appearance-preview')).toHaveAttribute('data-theme-preview', 'dark')
    await waitFor(() => expect(setThemeMode).toHaveBeenCalledWith('dark'))
  })

  it('uses a preset preferred mode when changing UX themes', () => {
    const setThemeMode = vi.fn()

    render(
      <AppearanceSettingsSection
        t={t}
        themeMode="light"
        setThemeMode={setThemeMode}
        themePreset="morning-notebook"
        setThemePreset={vi.fn()}
        editorFont="literary"
        setEditorFont={vi.fn()}
        editorLineHeight="comfortable"
        setEditorLineHeight={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-theme-preset-nocturne'))

    expect(setThemeMode).toHaveBeenCalledWith('dark')
  })
})

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'

const t = createTranslator('en')

describe('AppearanceSettingsSection', () => {
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

    fireEvent.click(within(lab).getByTestId('settings-theme-preset-retro-terminal'))

    expect(setThemePreset).toHaveBeenCalledWith('retro-terminal')
  })
})

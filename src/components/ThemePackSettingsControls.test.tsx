import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_PRESET_CATALOG, serializeThemeDefinition } from '../themes/themeRegistry'
import {
  LOCAL_THEME_PACK_STORAGE_KEY,
  readStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { ThemePackSettingsControls } from './ThemePackSettingsControls'

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

describe('ThemePackSettingsControls', () => {
  const localStorageMock = createStorageMock()

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    window.localStorage.clear()
  })

  it('imports a validated local theme JSON file into app-local storage', async () => {
    render(<ThemePackSettingsControls themePreset="nocturne" />)

    const file = new File([serializeThemeDefinition(THEME_PRESET_CATALOG[0])], 'theme.json', {
      type: 'application/json',
    })
    fireEvent.change(screen.getByTestId('theme-pack-file-input'), { target: { files: [file] } })

    await waitFor(() => {
      expect(readStoredLocalThemeDefinition(window.localStorage)?.id).toBe(THEME_PRESET_CATALOG[0].id)
    })
    expect(screen.getByTestId('theme-pack-message')).toHaveTextContent(`Local override active: ${THEME_PRESET_CATALOG[0].label}`)
  })

  it('rejects invalid local theme JSON without storing it', async () => {
    render(<ThemePackSettingsControls themePreset="nocturne" />)

    const file = new File(['{"schemaVersion":1}'], 'broken.json', { type: 'application/json' })
    fireEvent.change(screen.getByTestId('theme-pack-file-input'), { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-pack-message')).toHaveTextContent('Theme rejected:')
    })
    expect(window.localStorage.getItem(LOCAL_THEME_PACK_STORAGE_KEY)).toBeNull()
  })
})

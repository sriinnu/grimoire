import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_PRESET_CATALOG, serializeThemeDefinition } from '../themes/themeRegistry'
import {
  LOCAL_THEME_PACK_STORAGE_KEY,
  readStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { createTranslator } from '../lib/i18n'
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
  const t = createTranslator('en')

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true })
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  function renderControls(localeT = t) {
    return render(<ThemePackSettingsControls t={localeT} themePreset="morning-notebook" />)
  }

  it('imports a validated local theme JSON file into app-local storage', async () => {
    renderControls()

    const localTheme = {
      ...THEME_PRESET_CATALOG[0],
      typography: { display: "'Theme Display', serif", editor: "'Theme Body', sans-serif" },
    }
    const file = new File([serializeThemeDefinition(localTheme)], 'theme.json', {
      type: 'application/json',
    })
    fireEvent.change(screen.getByTestId('theme-pack-file-input'), { target: { files: [file] } })

    await waitFor(() => {
      expect(readStoredLocalThemeDefinition(window.localStorage)?.id).toBe(THEME_PRESET_CATALOG[0].id)
    })
    expect(screen.getByTestId('theme-pack-message')).toHaveTextContent(`Local override active: ${THEME_PRESET_CATALOG[0].label}`)
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Density')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Code')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Graph')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Canvas')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Motion')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent('Fonts display, editor')
  })

  it('rejects invalid local theme JSON without storing it', async () => {
    renderControls()

    const file = new File(['{"schemaVersion":1}'], 'broken.json', { type: 'application/json' })
    fireEvent.change(screen.getByTestId('theme-pack-file-input'), { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('theme-pack-message')).toHaveTextContent('Experience pack rejected:')
    })
    expect(window.localStorage.getItem(LOCAL_THEME_PACK_STORAGE_KEY)).toBeNull()
  })

  it('reloads the gitignored local experience pack endpoint from Settings', async () => {
    const fetchThemePack = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(serializeThemeDefinition(THEME_PRESET_CATALOG[0])),
    })
    vi.stubGlobal('fetch', fetchThemePack)
    renderControls()

    fireEvent.click(screen.getByTestId('theme-pack-reload-local'))

    await waitFor(() => {
      expect(screen.getByTestId('theme-pack-message')).toHaveTextContent(
        `Local override active: ${THEME_PRESET_CATALOG[0].label}`,
      )
    })
    expect(readStoredLocalThemeDefinition(window.localStorage)?.id).toBe(THEME_PRESET_CATALOG[0].id)
  })

  it('applies typography role edits through the validated local theme JSON contract', async () => {
    renderControls()

    fireEvent.change(screen.getByLabelText('Headings font stack'), {
      target: { value: "'Grimoire Header', serif" },
    })
    fireEvent.change(screen.getByLabelText('Body and lists font stack'), {
      target: { value: "'Grimoire Body', system-ui, sans-serif" },
    })
    fireEvent.change(screen.getByLabelText('Code font stack'), {
      target: { value: "'SF Mono', monospace" },
    })
    fireEvent.click(screen.getByTestId('theme-pack-apply-typography'))

    await waitFor(() => {
      expect(readStoredLocalThemeDefinition(window.localStorage)?.typography.display).toContain('Grimoire Header')
    })
    const definition = readStoredLocalThemeDefinition(window.localStorage)

    expect(definition?.typography.editor).toContain('Grimoire Body')
    expect(definition?.typography.mono).toContain('SF Mono')
    expect(screen.getByTestId('theme-pack-contract-summary')).toHaveTextContent(
      'Fonts ui, editor, mono, display, label',
    )
  })

  it('shows missing dev theme feedback and clears the local override', async () => {
    window.localStorage.setItem(LOCAL_THEME_PACK_STORAGE_KEY, serializeThemeDefinition(THEME_PRESET_CATALOG[0]))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    renderControls()

    expect(screen.getByTestId('theme-pack-message')).toHaveTextContent(
      `Local override active: ${THEME_PRESET_CATALOG[0].label}`,
    )
    fireEvent.click(screen.getByTestId('theme-pack-reload-local'))

    await waitFor(() => {
      expect(screen.getByTestId('theme-pack-message')).toHaveTextContent('No .grimoire-local/theme-pack.json file found.')
    })
    expect(window.localStorage.getItem(LOCAL_THEME_PACK_STORAGE_KEY)).toBeNull()
  })

  it('renders theme-pack controls through the settings translator', () => {
    renderControls(createTranslator('zh-Hans'))

    expect(screen.getByText('体验包')).toBeInTheDocument()
    expect(screen.getByText('载入 JSON')).toBeInTheDocument()
    expect(screen.getByText('字体角色')).toBeInTheDocument()
    expect(screen.getByLabelText('标题 字体栈')).toBeInTheDocument()
  })
})

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { DownloadSimple, FileCode, Trash, UploadSimple } from '@phosphor-icons/react'
import type { ThemePreset } from '../lib/appearance'
import {
  resolveThemePresetDefinition,
  type ThemeDefinition,
} from '../themes/themeRegistry'
import {
  clearStoredLocalThemeDefinition,
  downloadThemeDefinitionJson,
  emitLocalThemePackChange,
  LOCAL_THEME_PACK_CHANGE_EVENT,
  parseLocalThemeFile,
  readStoredLocalThemeDefinition,
  writeStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { Button } from './ui/button'

interface ThemePackSettingsControlsProps {
  themePreset: ThemePreset
}

function readActiveLocalTheme(): ThemeDefinition | null {
  return readStoredLocalThemeDefinition(window.localStorage)
}

/** Controls local-only theme-pack JSON import/export from Settings. */
export function ThemePackSettingsControls({ themePreset }: ThemePackSettingsControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localTheme, setLocalTheme] = useState<ThemeDefinition | null>(() => readActiveLocalTheme())
  const [message, setMessage] = useState('Theme packs stay local to this app.')

  useEffect(() => {
    const handleThemeChange = () => setLocalTheme(readActiveLocalTheme())
    window.addEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleThemeChange)
    return () => window.removeEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleThemeChange)
  }, [])

  const handleLoadClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const parsed = await parseLocalThemeFile(file)
    if (!parsed.ok) {
      setMessage(`Theme rejected: ${parsed.errors[0]}`)
      return
    }

    writeStoredLocalThemeDefinition(window.localStorage, parsed.definition)
    setLocalTheme(parsed.definition)
    setMessage(`Loaded local theme pack: ${parsed.definition.label}`)
    emitLocalThemePackChange()
  }, [])

  const handleExport = useCallback(() => {
    const definition = localTheme ?? resolveThemePresetDefinition(themePreset)
    downloadThemeDefinitionJson(definition)
    setMessage(`Exported theme JSON: ${definition.label}`)
  }, [localTheme, themePreset])

  const handleClear = useCallback(() => {
    clearStoredLocalThemeDefinition(window.localStorage)
    setLocalTheme(null)
    setMessage('Local theme pack cleared. Built-in presets are active again.')
    emitLocalThemePackChange()
  }, [])

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/35 p-3" data-testid="theme-pack-settings">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileCode size={14} />
            Theme packs
          </div>
          <div className="mt-1 text-[11px] leading-5 text-muted-foreground" data-testid="theme-pack-message">
            {localTheme ? `Local override active: ${localTheme.label}` : message}
          </div>
        </div>
        {localTheme ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear local theme pack" onClick={handleClear}>
            <Trash size={14} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleLoadClick} data-testid="theme-pack-load">
          <UploadSimple size={14} />
          Load JSON
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport} data-testid="theme-pack-export">
          <DownloadSimple size={14} />
          Export JSON
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="theme-pack-file-input"
        onChange={handleFileChange}
      />
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ArrowsClockwise, DownloadSimple, FileCode, Trash, UploadSimple } from '@phosphor-icons/react'
import type { ThemePreset } from '../lib/appearance'
import {
  parseThemeDefinitionJson,
  resolveThemePresetDefinition,
  serializeThemeDefinition,
  type ThemeDefinition,
} from '../themes/themeRegistry'
import type { ThemeTypographyRole } from '../themes/themeDefinition'
import {
  clearStoredLocalThemeDefinition,
  downloadThemeDefinitionJson,
  emitLocalThemePackChange,
  LOCAL_THEME_PACK_CHANGE_EVENT,
  parseLocalThemeFile,
  readStoredLocalThemeDefinition,
  refreshDevelopmentThemePack,
  writeStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { Button } from './ui/button'
import { Input } from './ui/input'
import type { createTranslator } from '../lib/i18n'

interface ThemePackSettingsControlsProps {
  t: ReturnType<typeof createTranslator>
  themePreset: ThemePreset
}

type EditableTypographyRole = Extract<ThemeTypographyRole, 'display' | 'editor' | 'label' | 'mono'>
type TypographyDraft = Record<EditableTypographyRole, string>
type Translate = ReturnType<typeof createTranslator>

function typographyFields(t: Translate): readonly {
  label: string
  role: EditableTypographyRole
  sample: string
}[] {
  return [
    { label: t('settings.themePack.roleHeadings'), role: 'display', sample: t('settings.themePack.roleHeadingsSample') },
    { label: t('settings.themePack.roleBody'), role: 'editor', sample: t('settings.themePack.roleBodySample') },
    { label: t('settings.themePack.roleCode'), role: 'mono', sample: t('settings.themePack.roleCodeSample') },
    { label: t('settings.themePack.roleLabels'), role: 'label', sample: t('settings.themePack.roleLabelsSample') },
  ]
}

function readActiveLocalTheme(): ThemeDefinition | null {
  return readStoredLocalThemeDefinition(window.localStorage)
}

function themeContractDetails(definition: ThemeDefinition | null, t: Translate): string[] {
  if (!definition) return []
  const details = [
    t('settings.themePack.contractCode', { value: definition.editor.codeBlockStyle }),
    t('settings.themePack.contractGraph', { value: definition.visuals.graphStyle }),
    t('settings.themePack.contractCanvas', { value: definition.visuals.canvasStyle }),
    t('settings.themePack.contractDensity', { value: definition.density.scale }),
    t('settings.themePack.contractMotion', { value: definition.motion.profile }),
  ]
  const typographyRoles = Object.keys(definition.typography)
  if (typographyRoles.length > 0) {
    details.push(t('settings.themePack.contractFonts', { value: typographyRoles.join(', ') }))
  }
  return details
}

function typographyDraftFromDefinition(definition: ThemeDefinition): TypographyDraft {
  return {
    display: definition.typography.display ?? '',
    editor: definition.typography.editor ?? '',
    label: definition.typography.label ?? '',
    mono: definition.typography.mono ?? '',
  }
}

/** Controls local-only theme-pack JSON import/export from Settings. */
export function ThemePackSettingsControls({ t, themePreset }: ThemePackSettingsControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localTheme, setLocalTheme] = useState<ThemeDefinition | null>(() => readActiveLocalTheme())
  const [message, setMessage] = useState(t('settings.themePack.localNotice'))
  const [refreshing, setRefreshing] = useState(false)
  const showDevReload = import.meta.env.DEV
  const fields = useMemo(() => typographyFields(t), [t])
  const activeDefinition = useMemo(
    () => localTheme ?? resolveThemePresetDefinition(themePreset),
    [localTheme, themePreset],
  )
  const [typographyDraft, setTypographyDraft] = useState<TypographyDraft>(() => typographyDraftFromDefinition(activeDefinition))
  const activeContractDetails = themeContractDetails(localTheme, t)

  useEffect(() => {
    const handleThemeChange = () => setLocalTheme(readActiveLocalTheme())
    window.addEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleThemeChange)
    return () => window.removeEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleThemeChange)
  }, [])

  useEffect(() => {
    setTypographyDraft(typographyDraftFromDefinition(activeDefinition))
  }, [activeDefinition])

  const handleLoadClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const parsed = await parseLocalThemeFile(file)
    if (!parsed.ok) {
      setMessage(t('settings.themePack.rejected', { error: parsed.errors[0] }))
      return
    }

    writeStoredLocalThemeDefinition(window.localStorage, parsed.definition)
    setLocalTheme(parsed.definition)
    setMessage(t('settings.themePack.loaded', { label: parsed.definition.label }))
    emitLocalThemePackChange()
  }, [t])

  const handleExport = useCallback(() => {
    downloadThemeDefinitionJson(activeDefinition)
    setMessage(t('settings.themePack.exported', { label: activeDefinition.label }))
  }, [activeDefinition, t])

  const handleClear = useCallback(() => {
    clearStoredLocalThemeDefinition(window.localStorage)
    setLocalTheme(null)
    setMessage(t('settings.themePack.cleared'))
    emitLocalThemePackChange()
  }, [t])

  const handleReloadLocalJson = useCallback(async () => {
    setRefreshing(true)
    const result = await refreshDevelopmentThemePack(window.localStorage)
    setRefreshing(false)

    if (result.status === 'loaded') {
      setLocalTheme(result.definition)
      setMessage(t('settings.themePack.reloaded', { label: result.definition.label }))
      emitLocalThemePackChange()
      return
    }

    if (result.status === 'missing') {
      setLocalTheme(null)
      setMessage(t('settings.themePack.missingLocal'))
      emitLocalThemePackChange()
      return
    }

    setMessage(t('settings.themePack.rejected', { error: result.errors[0] }))
  }, [t])

  const handleTypographyChange = useCallback((role: EditableTypographyRole, value: string) => {
    setTypographyDraft((current) => ({ ...current, [role]: value }))
  }, [])

  const handleApplyTypography = useCallback(() => {
    const typography = { ...activeDefinition.typography }
    for (const { role } of fields) {
      const value = typographyDraft[role].trim()
      if (value) typography[role] = value
      else delete typography[role]
    }

    const parsed = parseThemeDefinitionJson(serializeThemeDefinition({
      ...activeDefinition,
      typography,
    }))
    if (!parsed.ok) {
      setMessage(t('settings.themePack.rejected', { error: parsed.errors[0] }))
      return
    }

    writeStoredLocalThemeDefinition(window.localStorage, parsed.definition)
    setLocalTheme(parsed.definition)
    setMessage(t('settings.themePack.appliedTypography', { label: parsed.definition.label }))
    emitLocalThemePackChange()
  }, [activeDefinition, fields, t, typographyDraft])

  return (
    <div className="settings-material-card space-y-2 rounded-md border p-3" data-testid="theme-pack-settings">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <FileCode size={14} />
            {t('settings.themePack.title')}
          </div>
          <div className="mt-1 text-[11px] leading-5 text-muted-foreground" data-testid="theme-pack-message">
            {localTheme ? t('settings.themePack.localOverride', { label: localTheme.label }) : message}
          </div>
        </div>
        {localTheme ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('settings.themePack.clear')} onClick={handleClear}>
            <Trash size={14} />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleLoadClick} data-testid="theme-pack-load">
          <UploadSimple size={14} />
          {t('settings.themePack.loadJson')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport} data-testid="theme-pack-export">
          <DownloadSimple size={14} />
          {t('settings.themePack.exportJson')}
        </Button>
        {showDevReload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => { void handleReloadLocalJson() }}
            data-testid="theme-pack-reload-local"
          >
            <ArrowsClockwise size={14} />
            {refreshing ? t('settings.themePack.reloading') : t('settings.themePack.reloadLocal')}
          </Button>
        ) : null}
      </div>

      {activeContractDetails.length > 0 ? (
        <div className="settings-material-inner rounded-sm border px-2 py-1.5 text-[11px] text-muted-foreground" data-testid="theme-pack-contract-summary">
          {t('settings.themePack.contractPrefix')} <span className="font-medium text-foreground">{activeContractDetails.join(' / ')}</span>
        </div>
      ) : null}

      <div className="settings-material-inner space-y-2 rounded-sm border p-2" data-testid="theme-pack-typography-roles">
        <div className="text-[11px] font-semibold text-foreground">{t('settings.themePack.typographyTitle')}</div>
        <div className="grid gap-2">
          {fields.map((field) => (
            <div key={field.role} className="grid gap-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`theme-pack-font-${field.role}`}>
                {field.label}
              </label>
              <Input
                id={`theme-pack-font-${field.role}`}
                aria-label={`${field.label} ${t('settings.themePack.fontStack')}`}
                value={typographyDraft[field.role]}
                placeholder={t('settings.themePack.fontPlaceholder')}
                className="h-8 text-xs"
                onChange={(event) => handleTypographyChange(field.role, event.target.value)}
              />
              <div
                className="settings-material-chip truncate rounded-sm border px-2 py-1 text-xs text-foreground"
                style={{ fontFamily: typographyDraft[field.role] || undefined }}
              >
                {field.sample}
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleApplyTypography} data-testid="theme-pack-apply-typography">
          {t('settings.themePack.applyTypography')}
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

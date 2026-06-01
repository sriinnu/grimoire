import type { ThemePreset } from '../lib/appearance'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  resolveThemeDefinitionMode,
  resolveThemePresetDefinition,
} from '../themes/themeRegistry'
import {
  LOCAL_THEME_PACK_CHANGE_EVENT,
  readStoredLocalThemeDefinition,
} from '../themes/localThemePacks'
import { SidebarArtwork } from './sidebar/SidebarArtwork'

type Translate = ReturnType<typeof createTranslator>

/** Shows how the selected appearance preset changes the left sidebar surface. */
export function SidebarAppearancePreview({
  t,
  themeMode,
  themePreset,
}: {
  t: Translate
  themeMode: ThemeMode
  themePreset: ThemePreset
}) {
  const [localDefinition, setLocalDefinition] = useState(() => readStoredLocalThemeDefinition(window.localStorage))

  useEffect(() => {
    const handleLocalThemeChange = () => setLocalDefinition(readStoredLocalThemeDefinition(window.localStorage))
    window.addEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleLocalThemeChange)
    return () => window.removeEventListener(LOCAL_THEME_PACK_CHANGE_EVENT, handleLocalThemeChange)
  }, [])

  const definition = localDefinition ?? resolveThemePresetDefinition(themePreset)
  const mode = resolveThemeDefinitionMode(definition, themeMode)
  const tokens = definition.modes[mode]?.tokens
  const sidebar = tokens?.['surface.sidebar'] ?? definition.swatches[1]
  const accent = tokens?.['sidebar.primary'] ?? definition.swatches[2]
  const foreground = tokens?.['sidebar.foreground'] ?? definition.swatches[0]
  const activeForeground = tokens?.['sidebar.primaryForeground'] ?? definition.swatches[0]
  const muted = tokens?.['sidebar.border'] ?? tokens?.['text.secondary'] ?? definition.swatches[2]

  return (
    <div className="space-y-2">
      <div className="text-[12px] font-semibold text-foreground">{t('settings.sidebarAppearance.label')}</div>
      <div
        className="overflow-hidden rounded-md border border-border"
        data-testid="settings-sidebar-preview"
        data-theme-preview={themeMode}
        data-theme-definition-preview={definition.id}
        data-sidebar-artwork-preview={definition.sidebar.artwork}
        data-sidebar-preset-preview={themePreset}
        style={{
          background: sidebar,
          color: foreground,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
          '--sidebar': sidebar,
          '--sidebar-foreground': foreground,
          '--art-accent': accent,
          '--sidebar-artwork-opacity': String(definition.sidebar.artworkOpacity),
        } as CSSProperties}
      >
        <div className="flex items-center gap-1 border-b px-3 py-2" style={{ borderColor: muted }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FF6B5F' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#F6C44F' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#53C66A' }} />
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
            {t('settings.sidebarAppearance.previewLabel')}
          </span>
        </div>
        <div className="space-y-1 p-2">
          {[
            ['Home', '4301'],
            ['Inbox', '12'],
            ['Ideas', '55'],
          ].map(([label, count], index) => (
            <div
              key={label}
              className="flex h-8 items-center gap-2 rounded px-2 text-[12px] font-medium"
              style={{
                background: index === 0 ? accent : 'transparent',
                color: index === 0 ? activeForeground : foreground,
              }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: index === 0 ? activeForeground : accent }}
              />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              <span style={{ color: index === 0 ? activeForeground : muted }}>{count}</span>
            </div>
          ))}
        </div>
        <SidebarArtwork compact />
      </div>
    </div>
  )
}

import type { ThemePreset } from '../lib/appearance'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import { PRESET_SWATCHES } from './appearanceSettingsOptions'
import { SidebarArtwork } from './sidebar/SidebarArtwork'

type Translate = ReturnType<typeof createTranslator>

const DARK_SIDEBAR_PRESETS = new Set<ThemePreset>([
  'manuscript',
  'nocturne',
  'aether',
  'ion',
  'moss',
  'ember',
])

function sidebarForegroundForPreset(preset: ThemePreset): string {
  if (preset === 'aether') return '#E7FFF7'
  if (preset === 'ion') return '#EFF5FF'
  if (preset === 'moss') return '#EEF6E7'
  return DARK_SIDEBAR_PRESETS.has(preset) ? '#FFF7E6' : '#23312B'
}

function activeForegroundForPreset(preset: ThemePreset): string {
  if (preset === 'aether') return '#07110F'
  if (preset === 'ion') return '#F8FAFD'
  if (preset === 'moss') return '#1D160C'
  if (preset === 'lumen') return '#25110F'
  return '#FFFFFF'
}

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
  const [, sidebar, accent] = PRESET_SWATCHES[themePreset]
  const foreground = sidebarForegroundForPreset(themePreset)
  const activeForeground = activeForegroundForPreset(themePreset)
  const muted = DARK_SIDEBAR_PRESETS.has(themePreset)
    ? 'rgba(255, 247, 230, 0.66)'
    : 'rgba(35, 49, 43, 0.58)'

  return (
    <div className="space-y-2">
      <div className="text-[12px] font-semibold text-foreground">{t('settings.sidebarAppearance.label')}</div>
      <div
        className="overflow-hidden rounded-md border border-border"
        data-testid="settings-sidebar-preview"
        data-theme-preview={themeMode}
        data-sidebar-preset-preview={themePreset}
        style={{
          background: sidebar,
          color: foreground,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
        }}
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

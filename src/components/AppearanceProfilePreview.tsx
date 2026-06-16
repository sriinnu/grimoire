import type { CSSProperties } from 'react'
import type { EditorFont, EditorLineHeight, ThemePreset } from '../lib/appearance'
import { resolveFontRoles } from '../lib/fontConfig'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import { resolveThemePresetDefinition } from '../themes/themeRegistry'
import { buildProfileTraitViews } from './appearanceProfileTraits'
import { resolveProfileShellStyle, type ProfileWritingStyle } from './appearanceSettingsOptions'

type Translate = ReturnType<typeof createTranslator>

interface AppearanceProfilePreviewProps {
  t: Translate
  themeMode: ThemeMode
  themePreset: ThemePreset
  editorFont: EditorFont
  editorLineHeight: EditorLineHeight
}

/** Compact live sample showing the current experience profile contract. */
export function AppearanceProfilePreview({
  t,
  themeMode,
  themePreset,
  editorFont,
  editorLineHeight,
}: AppearanceProfilePreviewProps) {
  const definition = resolveThemePresetDefinition(themePreset)
  const fontRoles = resolveFontRoles({ themePreset, editorFont })
  const previewLineHeight = editorLineHeight === 'compact'
    ? 1.34
    : editorLineHeight === 'spacious' ? 1.58 : 1.44
  const shellStyle = resolveProfileShellStyle(definition)
  const previewTraits = buildProfileTraitViews({
    canvasStyle: definition.visuals.canvasStyle,
    codeBlockStyle: definition.editor.codeBlockStyle,
    densityScale: definition.density.scale,
    graphStyle: definition.visuals.graphStyle,
    motionProfile: definition.motion.profile,
    shellStyle,
    writingStyle: definition.editor.headingStyle as ProfileWritingStyle,
  })

  return (
    <div
      className="settings-appearance-preview rounded-md border border-border"
      data-testid="settings-appearance-preview"
      data-canvas-preview={definition.visuals.canvasStyle}
      data-code-block-preview={definition.editor.codeBlockStyle}
      data-density-preview={definition.density.scale}
      data-graph-preview={definition.visuals.graphStyle}
      data-motion-preview={definition.motion.profile}
      data-shell-preview={shellStyle}
      data-theme-preview={themeMode}
      data-theme-preset-preview={themePreset}
      data-writing-preview={definition.editor.headingStyle}
    >
      <PreviewChrome codeBlockStyle={definition.editor.codeBlockStyle} graphStyle={definition.visuals.graphStyle} />
      <div className="settings-appearance-preview__facets" aria-label="Experience profile traits">
        {previewTraits.map((trait) => (
          <div key={trait.key} className="settings-appearance-preview__facet">
            {trait.icon}
            <span>{trait.label}</span>
            <strong>{trait.value}</strong>
          </div>
        ))}
      </div>
      <div className="settings-appearance-preview__sample" style={{ fontFamily: fontRoles.editor }}>
        <div style={sampleTitleStyle(fontRoles.display)}>
          {t('settings.appearance.previewTitle')}
        </div>
        <div className="settings-appearance-preview__body" style={{ lineHeight: previewLineHeight }}>
          {t('settings.appearance.previewBody')}
        </div>
      </div>
    </div>
  )
}

function PreviewChrome({ codeBlockStyle, graphStyle }: { codeBlockStyle: string; graphStyle: string }) {
  return (
    <div className="settings-appearance-preview__chrome" aria-hidden="true">
      <div className="settings-appearance-preview__rail">
        <span />
        <span />
        <span />
      </div>
      <div className="settings-appearance-preview__page" data-code-block-preview={codeBlockStyle}>
        <span />
        <span />
        <span />
        <div className="settings-appearance-preview__code-lines">
          <span />
          <span />
        </div>
      </div>
      <div className="settings-appearance-preview__brain" data-graph-preview={graphStyle}>
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function sampleTitleStyle(fontFamily: string): CSSProperties {
  return {
    fontFamily,
    fontSize: 19,
    fontWeight: 650,
    lineHeight: 1.2,
  }
}

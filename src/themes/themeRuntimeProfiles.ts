export const THEME_DENSITY_SCALES = ['compact', 'comfortable', 'spacious'] as const
export const THEME_MOTION_PROFILES = ['calm', 'standard', 'expressive'] as const
export const THEME_CODE_BLOCK_STYLES = ['plain', 'notebook', 'terminal'] as const
export const THEME_GRAPH_STYLES = ['constellation', 'ledger', 'terminal'] as const
export const THEME_CANVAS_STYLES = ['paper', 'blueprint', 'terminal'] as const

export type ThemeCanvasStyle = typeof THEME_CANVAS_STYLES[number]
export type ThemeCodeBlockStyle = typeof THEME_CODE_BLOCK_STYLES[number]
export type ThemeDensityScale = typeof THEME_DENSITY_SCALES[number]
export type ThemeGraphStyle = typeof THEME_GRAPH_STYLES[number]
export type ThemeMotionProfile = typeof THEME_MOTION_PROFILES[number]

/** Layout rhythm imported from a theme definition. */
export interface ThemeDensityDefinition {
  scale: ThemeDensityScale
}

/** Motion rhythm imported from a theme definition. */
export interface ThemeMotionDefinition {
  profile: ThemeMotionProfile
}

/** Graph/canvas visual behavior imported from a theme definition. */
export interface ThemeVisualDefinition {
  canvasStyle: ThemeCanvasStyle
  graphStyle: ThemeGraphStyle
}

/** Runtime code-block variables applied from validated theme-pack editor style. */
export const CODE_BLOCK_TOKENS: Record<ThemeCodeBlockStyle, Record<string, string>> = {
  plain: {
    '--grimoire-code-block-bg': 'color-mix(in srgb, var(--surface-input) 92%, var(--surface-editor))',
    '--grimoire-code-block-border': 'color-mix(in srgb, var(--border-default) 76%, transparent)',
    '--grimoire-code-block-radius': '6px',
    '--grimoire-code-block-shadow': 'none',
  },
  notebook: {
    '--grimoire-code-block-bg': 'linear-gradient(180deg, color-mix(in srgb, var(--surface-card) 82%, var(--surface-editor)), var(--surface-input))',
    '--grimoire-code-block-border': 'color-mix(in srgb, var(--primary) 18%, var(--border-default))',
    '--grimoire-code-block-radius': '8px',
    '--grimoire-code-block-shadow': 'inset 0 1px 0 color-mix(in srgb, var(--text-primary) 5%, transparent)',
  },
  terminal: {
    '--grimoire-code-block-bg': 'linear-gradient(180deg, color-mix(in srgb, var(--surface-input) 76%, black), color-mix(in srgb, var(--surface-input) 88%, black))',
    '--grimoire-code-block-border': 'color-mix(in srgb, var(--primary) 32%, var(--border-default))',
    '--grimoire-code-block-radius': '6px',
    '--grimoire-code-block-shadow': '0 0 24px color-mix(in srgb, var(--primary) 8%, transparent)',
  },
}

/** Runtime graph variables applied from validated theme-pack visual style. */
export const GRAPH_TOKENS: Record<ThemeGraphStyle, Record<string, string>> = {
  constellation: {
    '--grimoire-graph-bg': 'radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--primary) 9%, var(--surface-editor)) 0%, var(--surface-editor) 58%)',
    '--grimoire-graph-grid-stroke': 'color-mix(in srgb, var(--primary) 22%, var(--border-subtle))',
    '--grimoire-graph-hud-bg': 'color-mix(in srgb, var(--surface-popover) 82%, transparent)',
    '--grimoire-graph-label-bg': 'color-mix(in srgb, var(--surface-editor) 86%, transparent)',
    '--grimoire-graph-type-bg': 'color-mix(in srgb, var(--surface-card) 70%, var(--surface-editor))',
    '--grimoire-graph-edge-relationship': 'var(--primary)',
    '--grimoire-graph-edge-wikilink': 'color-mix(in srgb, var(--muted-foreground) 74%, var(--primary))',
    '--grimoire-graph-edge-local': 'color-mix(in srgb, var(--destructive) 62%, var(--muted-foreground))',
    '--grimoire-graph-shadow': '0 18px 42px color-mix(in srgb, #000 16%, transparent)',
  },
  ledger: {
    '--grimoire-graph-bg': 'linear-gradient(180deg, color-mix(in srgb, var(--surface-card) 72%, var(--surface-editor)), var(--surface-editor))',
    '--grimoire-graph-grid-stroke': 'color-mix(in srgb, var(--border-strong) 36%, transparent)',
    '--grimoire-graph-hud-bg': 'color-mix(in srgb, var(--surface-card) 88%, transparent)',
    '--grimoire-graph-label-bg': 'color-mix(in srgb, var(--surface-card) 92%, transparent)',
    '--grimoire-graph-type-bg': 'color-mix(in srgb, var(--surface-input) 76%, var(--surface-card))',
    '--grimoire-graph-edge-relationship': 'color-mix(in srgb, var(--primary) 76%, var(--text-heading))',
    '--grimoire-graph-edge-wikilink': 'color-mix(in srgb, var(--text-secondary) 82%, transparent)',
    '--grimoire-graph-edge-local': 'color-mix(in srgb, var(--destructive) 54%, var(--text-secondary))',
    '--grimoire-graph-shadow': '0 14px 30px color-mix(in srgb, var(--surface-sidebar) 12%, transparent)',
  },
  terminal: {
    '--grimoire-graph-bg': 'linear-gradient(180deg, color-mix(in srgb, var(--surface-editor) 84%, black), var(--surface-editor))',
    '--grimoire-graph-grid-stroke': 'color-mix(in srgb, var(--primary) 18%, transparent)',
    '--grimoire-graph-hud-bg': 'color-mix(in srgb, var(--surface-input) 92%, black)',
    '--grimoire-graph-label-bg': 'color-mix(in srgb, var(--surface-input) 88%, black)',
    '--grimoire-graph-type-bg': 'color-mix(in srgb, var(--primary) 8%, var(--surface-input))',
    '--grimoire-graph-edge-relationship': 'var(--primary)',
    '--grimoire-graph-edge-wikilink': 'color-mix(in srgb, var(--primary) 38%, var(--muted-foreground))',
    '--grimoire-graph-edge-local': 'color-mix(in srgb, var(--destructive) 68%, var(--accent-orange))',
    '--grimoire-graph-shadow': '0 0 32px color-mix(in srgb, var(--primary) 9%, transparent)',
  },
}

/** Runtime canvas variables applied from validated theme-pack visual style. */
export const CANVAS_TOKENS: Record<ThemeCanvasStyle, Record<string, string>> = {
  paper: {
    '--grimoire-canvas-stage-bg': 'var(--surface-editor)',
    '--grimoire-canvas-grid': 'color-mix(in srgb, var(--border) 24%, transparent)',
    '--grimoire-canvas-paper-bg': 'var(--surface-card)',
    '--grimoire-canvas-toolbar-bg': 'color-mix(in srgb, var(--surface-card) 72%, transparent)',
    '--grimoire-canvas-paper-shadow': '0 18px 60px color-mix(in srgb, #000 16%, transparent)',
  },
  blueprint: {
    '--grimoire-canvas-stage-bg': 'color-mix(in srgb, var(--primary) 5%, var(--surface-editor))',
    '--grimoire-canvas-grid': 'color-mix(in srgb, var(--primary) 24%, transparent)',
    '--grimoire-canvas-paper-bg': 'color-mix(in srgb, var(--surface-card) 90%, var(--primary))',
    '--grimoire-canvas-toolbar-bg': 'color-mix(in srgb, var(--surface-card) 68%, var(--primary) 6%)',
    '--grimoire-canvas-paper-shadow': '0 20px 64px color-mix(in srgb, var(--primary) 12%, transparent)',
  },
  terminal: {
    '--grimoire-canvas-stage-bg': 'color-mix(in srgb, var(--surface-editor) 88%, black)',
    '--grimoire-canvas-grid': 'color-mix(in srgb, var(--primary) 14%, transparent)',
    '--grimoire-canvas-paper-bg': 'color-mix(in srgb, var(--surface-input) 88%, black)',
    '--grimoire-canvas-toolbar-bg': 'color-mix(in srgb, var(--surface-input) 82%, black)',
    '--grimoire-canvas-paper-shadow': '0 0 34px color-mix(in srgb, var(--primary) 8%, transparent)',
  },
}

/** Runtime spacing variables applied from validated theme-pack density. */
export const DENSITY_TOKENS: Record<ThemeDensityScale, Record<string, string>> = {
  compact: {
    '--grimoire-density-page-padding': '20px',
    '--grimoire-density-panel-padding': '12px',
    '--grimoire-density-card-gap': '10px',
    '--grimoire-density-row-gap': '6px',
    '--grimoire-density-note-card-margin': '6px 8px 0',
    '--grimoire-density-note-footer-padding': '6px 8px',
    '--grimoire-density-toolbar-padding': '6px 8px',
  },
  comfortable: {
    '--grimoire-density-page-padding': '28px',
    '--grimoire-density-panel-padding': '16px',
    '--grimoire-density-card-gap': '14px',
    '--grimoire-density-row-gap': '8px',
    '--grimoire-density-note-card-margin': '8px 10px 0',
    '--grimoire-density-note-footer-padding': '7px 10px',
    '--grimoire-density-toolbar-padding': '8px 10px',
  },
  spacious: {
    '--grimoire-density-page-padding': '34px',
    '--grimoire-density-panel-padding': '20px',
    '--grimoire-density-card-gap': '18px',
    '--grimoire-density-row-gap': '10px',
    '--grimoire-density-note-card-margin': '10px 12px 0',
    '--grimoire-density-note-footer-padding': '9px 12px',
    '--grimoire-density-toolbar-padding': '10px 12px',
  },
}

/** Runtime animation variables applied from validated theme-pack motion. */
export const MOTION_TOKENS: Record<ThemeMotionProfile, Record<string, string>> = {
  calm: {
    '--motion-duration-fast': '100ms',
    '--motion-duration-base': '140ms',
    '--motion-duration-hover': '140ms',
    '--motion-duration-panel': '180ms',
    '--motion-duration-control': '120ms',
    '--motion-duration-page-settle': '220ms',
    '--motion-duration-ink-settle': '180ms',
    '--motion-duration-state-pulse': '480ms',
    '--motion-distance-panel-y': '4px',
    '--motion-distance-control-y': '2px',
    '--motion-distance-page-y': '3px',
    '--motion-distance-ink-y': '2px',
    '--motion-hover-lift-distance': '-1px',
  },
  standard: {
    '--motion-duration-fast': '120ms',
    '--motion-duration-base': '180ms',
    '--motion-duration-hover': '180ms',
    '--motion-duration-panel': '260ms',
    '--motion-duration-control': '160ms',
    '--motion-duration-page-settle': '360ms',
    '--motion-duration-ink-settle': '320ms',
    '--motion-duration-state-pulse': '720ms',
    '--motion-distance-panel-y': '10px',
    '--motion-distance-control-y': '4px',
    '--motion-distance-page-y': '6px',
    '--motion-distance-ink-y': '3px',
    '--motion-hover-lift-distance': '-2px',
  },
  expressive: {
    '--motion-duration-fast': '140ms',
    '--motion-duration-base': '220ms',
    '--motion-duration-hover': '220ms',
    '--motion-duration-panel': '340ms',
    '--motion-duration-control': '190ms',
    '--motion-duration-page-settle': '430ms',
    '--motion-duration-ink-settle': '390ms',
    '--motion-duration-state-pulse': '900ms',
    '--motion-distance-panel-y': '14px',
    '--motion-distance-control-y': '5px',
    '--motion-distance-page-y': '8px',
    '--motion-distance-ink-y': '4px',
    '--motion-hover-lift-distance': '-3px',
  },
}

/** Semantic theme tokens that Grimoire can safely import, export, and apply live. */
export type ThemeTokenKey =
  | 'accent.green'
  | 'accent.greenSoft'
  | 'accent.hover'
  | 'accent.orange'
  | 'accent.orangeSoft'
  | 'accent.primary'
  | 'accent.purple'
  | 'accent.purpleSoft'
  | 'accent.red'
  | 'accent.redSoft'
  | 'accent.soft'
  | 'accent.yellow'
  | 'accent.yellowSoft'
  | 'border.default'
  | 'border.strong'
  | 'border.subtle'
  | 'sidebar.accent'
  | 'sidebar.accentForeground'
  | 'sidebar.border'
  | 'sidebar.foreground'
  | 'sidebar.primary'
  | 'sidebar.primaryForeground'
  | 'state.hover'
  | 'state.hoverSubtle'
  | 'state.selected'
  | 'surface.app'
  | 'surface.card'
  | 'surface.editor'
  | 'surface.input'
  | 'surface.panel'
  | 'surface.popover'
  | 'surface.sidebar'
  | 'syntax.heading'
  | 'syntax.link'
  | 'text.faint'
  | 'text.heading'
  | 'text.muted'
  | 'text.primary'
  | 'text.secondary'
  | 'text.tertiary'

/** Full token map for one light or dark theme mode. */
export type ThemeTokenMap = Record<ThemeTokenKey, string>

export const CORE_THEME_TOKEN_KEYS = [
  'accent.hover',
  'accent.primary',
  'accent.soft',
  'border.default',
  'border.strong',
  'border.subtle',
  'sidebar.accent',
  'sidebar.accentForeground',
  'sidebar.border',
  'sidebar.foreground',
  'sidebar.primary',
  'sidebar.primaryForeground',
  'state.hover',
  'state.hoverSubtle',
  'state.selected',
  'surface.app',
  'surface.card',
  'surface.editor',
  'surface.input',
  'surface.panel',
  'surface.popover',
  'surface.sidebar',
  'syntax.heading',
  'syntax.link',
  'text.heading',
  'text.primary',
  'text.secondary',
] as const satisfies readonly ThemeTokenKey[]

export const DERIVED_THEME_TOKEN_KEYS = [
  'accent.green',
  'accent.greenSoft',
  'accent.orange',
  'accent.orangeSoft',
  'accent.purple',
  'accent.purpleSoft',
  'accent.red',
  'accent.redSoft',
  'accent.yellow',
  'accent.yellowSoft',
  'text.faint',
  'text.muted',
  'text.tertiary',
] as const satisfies readonly ThemeTokenKey[]

export const REQUIRED_THEME_TOKEN_KEYS = [
  ...CORE_THEME_TOKEN_KEYS,
  ...DERIVED_THEME_TOKEN_KEYS,
] as const satisfies readonly ThemeTokenKey[]

export const TOKEN_CSS_VARIABLES: Record<ThemeTokenKey, string> = {
  'accent.green': '--accent-green',
  'accent.greenSoft': '--accent-green-light',
  'accent.hover': '--accent-blue-hover',
  'accent.orange': '--accent-orange',
  'accent.orangeSoft': '--accent-orange-light',
  'accent.primary': '--accent-blue',
  'accent.purple': '--accent-purple',
  'accent.purpleSoft': '--accent-purple-light',
  'accent.red': '--accent-red',
  'accent.redSoft': '--accent-red-light',
  'accent.soft': '--accent-blue-light',
  'accent.yellow': '--accent-yellow',
  'accent.yellowSoft': '--accent-yellow-light',
  'border.default': '--border-default',
  'border.strong': '--border-strong',
  'border.subtle': '--border-subtle',
  'sidebar.accent': '--sidebar-accent',
  'sidebar.accentForeground': '--sidebar-accent-foreground',
  'sidebar.border': '--sidebar-border',
  'sidebar.foreground': '--sidebar-foreground',
  'sidebar.primary': '--sidebar-primary',
  'sidebar.primaryForeground': '--sidebar-primary-foreground',
  'state.hover': '--state-hover',
  'state.hoverSubtle': '--state-hover-subtle',
  'state.selected': '--state-selected',
  'surface.app': '--surface-app',
  'surface.card': '--surface-card',
  'surface.editor': '--surface-editor',
  'surface.input': '--surface-input',
  'surface.panel': '--surface-panel',
  'surface.popover': '--surface-popover',
  'surface.sidebar': '--surface-sidebar',
  'syntax.heading': '--syntax-heading',
  'syntax.link': '--syntax-link',
  'text.faint': '--text-faint',
  'text.heading': '--text-heading',
  'text.muted': '--text-muted',
  'text.primary': '--text-primary',
  'text.secondary': '--text-secondary',
  'text.tertiary': '--text-tertiary',
}

export const SEMANTIC_TOKEN_ALIASES: Partial<Record<ThemeTokenKey, readonly string[]>> = {
  'accent.primary': ['--primary', '--ring'],
  'accent.red': ['--destructive'],
  'border.default': ['--border'],
  'border.subtle': ['--input'],
  'state.hover': ['--accent'],
  'state.hoverSubtle': ['--muted'],
  'surface.card': ['--secondary'],
  'surface.editor': ['--background'],
  'surface.panel': ['--card'],
  'surface.popover': ['--popover'],
  'surface.sidebar': ['--sidebar'],
  'text.primary': ['--foreground', '--card-foreground', '--popover-foreground', '--secondary-foreground', '--accent-foreground'],
  'text.secondary': ['--muted-foreground'],
}

export const DERIVED_TOKEN_FALLBACKS: Record<(typeof DERIVED_THEME_TOKEN_KEYS)[number], string> = {
  'accent.green': 'var(--accent-blue)',
  'accent.greenSoft': 'color-mix(in srgb, var(--accent-green) 14%, transparent)',
  'accent.orange': 'var(--sidebar-primary)',
  'accent.orangeSoft': 'color-mix(in srgb, var(--accent-orange) 14%, transparent)',
  'accent.purple': 'var(--accent-blue)',
  'accent.purpleSoft': 'color-mix(in srgb, var(--accent-purple) 14%, transparent)',
  'accent.red': 'var(--accent-orange)',
  'accent.redSoft': 'color-mix(in srgb, var(--accent-red) 14%, transparent)',
  'accent.yellow': 'var(--sidebar-primary)',
  'accent.yellowSoft': 'color-mix(in srgb, var(--accent-yellow) 14%, transparent)',
  'text.faint': 'color-mix(in srgb, var(--text-secondary) 62%, transparent)',
  'text.muted': 'color-mix(in srgb, var(--text-secondary) 76%, transparent)',
  'text.tertiary': 'color-mix(in srgb, var(--text-secondary) 88%, transparent)',
}

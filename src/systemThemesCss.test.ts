import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('system theme CSS', () => {
  const css = [
    'system-themes.css',
    'theme-system-tokens.css',
    'theme-semantic-tokens.css',
    'theme-constellation.css',
    'theme-flagship-shared.css',
    'theme-editor-navigator.css',
    'theme-coherence.css',
    'theme-accessibility.css',
  ].map((file) => readFileSync(`${process.cwd()}/src/${file}`, 'utf8')).join('\n')
  const flagshipSharedCss = readFileSync(`${process.cwd()}/src/theme-flagship-shared.css`, 'utf8')
  const coherenceCss = readFileSync(`${process.cwd()}/src/theme-coherence.css`, 'utf8')
  const constellationCss = readFileSync(`${process.cwd()}/src/theme-constellation.css`, 'utf8')
  const editorCss = readFileSync(`${process.cwd()}/src/components/Editor.css`, 'utf8')
  const editorMetaCss = readFileSync(`${process.cwd()}/src/components/EditorMeta.css`, 'utf8')
  const editorThemeCss = readFileSync(`${process.cwd()}/src/components/EditorTheme.css`, 'utf8')
  const polishCss = readFileSync(`${process.cwd()}/src/theme-polish.css`, 'utf8')
  const nonConstellationFlagshipSelector = ':where([data-theme-preset="living-archive"], [data-theme-preset="daylight-atelier"], [data-theme-preset="nocturne"], [data-theme-preset="retro-terminal"])'
  const strongNonConstellationFlagshipSelector = ':is([data-theme-preset="living-archive"], [data-theme-preset="daylight-atelier"], [data-theme-preset="nocturne"], [data-theme-preset="retro-terminal"])'

  function getRuleBody(source: string, selector: string): string {
    const ruleStart = source.indexOf(`${selector} {`)
    expect(ruleStart).toBeGreaterThanOrEqual(0)
    const bodyStart = source.indexOf('{', ruleStart)
    const bodyEnd = source.indexOf('}', bodyStart)
    return source.slice(bodyStart + 1, bodyEnd)
  }

  function getDeclaration(body: string, name: string): string {
    const declaration = body.split('\n').map((line) => line.trim()).find((line) => line.startsWith(`${name}:`))
    expect(declaration).toBeDefined()
    return declaration!.slice(name.length + 1).replace(';', '').trim()
  }

  function classOrAttributeCount(selector: string): number {
    return (selector.match(/(?:\.|\[)/gu) ?? []).length
  }

  function relativeLuminance(hex: string): number {
    const value = Number.parseInt(hex.slice(1), 16)
    const [red, green, blue] = [value >> 16, (value >> 8) & 255, value & 255].map((channel) => {
      const ratio = channel / 255
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  function contrastRatio(background: string, foreground: string): number {
    const [lighter, darker] = [relativeLuminance(background), relativeLuminance(foreground)].sort((a, b) => b - a)
    return (lighter + 0.05) / (darker + 0.05)
  }

  it('defines the flagship presets across root and preview surfaces', () => {
    expect(css).toContain('[data-theme-preset="constellation"]')
    expect(css).toContain('[data-theme-preset="daylight-atelier"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="living-archive"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="retro-terminal"]')
    expect(css).toContain('[data-theme-preset-preview="constellation"]')
    expect(css).toContain('[data-theme-preset-preview="retro-terminal"]')
    expect(css).not.toContain('[data-theme-preset="research-cockpit"]')
    expect(css).not.toContain('[data-theme-preset="manuscript"]')
  })

  it('keeps Settings appearance previews aligned with selected light and dark modes', () => {
    expect(getRuleBody(css, '[data-theme-preset-preview="daylight-atelier"][data-theme-preview="dark"]')).toContain('--surface-editor: #0f1c22')
    expect(getRuleBody(css, '[data-theme-preset-preview="living-archive"][data-theme-preview="dark"]')).toContain('--foreground: #efe6cc')
    expect(getRuleBody(css, '[data-theme-preset-preview="nocturne"][data-theme-preview="light"]')).toContain('--surface-editor: #ffffff')
    expect(css).not.toContain('[data-theme-preset-preview="manuscript"]')
  })

  it('routes navigation and sidebar special effects through theme tokens', () => {
    const navigatorCss = readFileSync(`${process.cwd()}/src/theme-editor-navigator.css`, 'utf8')
    const sidebarCss = readFileSync(`${process.cwd()}/src/sidebar-appearance.css`, 'utf8')

    expect(getRuleBody(navigatorCss, '[data-theme-preset="constellation"] .editor-navigator-popover-shell')).toContain('var(--surface-popover)')
    expect(navigatorCss).not.toContain('#08131f')
    expect(navigatorCss).not.toContain('rgba(84, 225, 210')
    expect(getRuleBody(sidebarCss, '[data-theme-preset="nocturne"] .app-sidebar-panel')).toContain('var(--sidebar-primary)')
    expect(sidebarCss).not.toContain('var(--accent-yellow)')
    expect(sidebarCss).not.toContain('rgba(155, 255, 122')
  })

  it('propagates themes beyond color tokens into shell surfaces and motion', () => {
    expect(css).toContain('.note-list-panel .note-location-chip')
    expect(css).toContain('.note-list-chrome-row')
    expect(css).toContain('.note-list-search-row')
    expect(css).toContain('.project-workspace-strip')
    expect(css).toContain('.project-workspace-chrome')
    expect(css).toContain('.note-list-filter-shelf')
    expect(css).toContain('.graph-canvas-shell')
    expect(css).toContain('.note-signal-chip')
    expect(css).toContain('.constellation-insights')
    expect(css).toContain('.constellation-concept-map')
    expect(css).toContain('.editor-agent-composer')
    expect(css).toContain('[data-ai-message-bubble="user"]')
    expect(css).toContain('[data-testid="agent-input"]')
    expect(css).toContain('.editor-navigator-popover')
    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('.status-bar')
    expect(css).toContain('.settings-navigation-rail')
    expect(css).toContain('.settings-main-surface')
    expect(css).toContain('[data-testid="theme-pack-settings"]')
    expect(css).toContain('[data-testid="locality-firewall-card"]')
    expect(css).toContain('@keyframes grimoire-mark-arrive')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
  })

  it('keeps editor metadata styled even outside flagship presets', () => {
    const body = getRuleBody(editorMetaCss, '.editor-meta-strip')
    const pillBody = getRuleBody(editorMetaCss, '.editor-meta-pill')
    const strongBody = getRuleBody(editorMetaCss, '.editor-meta-pill__value,\n.editor-meta-pill strong')

    expect(body).toContain('display: flex')
    expect(body).toContain('flex-wrap: wrap')
    expect(body).toContain('overflow-x: auto')
    expect(pillBody).toContain('display: inline-flex')
    expect(pillBody).toContain('min-width: 0')
    expect(pillBody).toContain('white-space: nowrap')
    expect(strongBody).toContain('display: block')
    expect(strongBody).toContain('min-width: 0')
    expect(editorMetaCss).toContain('.editor-content-layout--left .editor-meta-strip')
  })

  it('keeps BlockNote floating side controls compact and below the editor top edge', () => {
    const body = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu')
    const buttonBody = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu button')
    const groupBody = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu :is([role="group"], .mantine-Group-root)')

    expect(body).toContain('flex-direction: row !important')
    expect(body).toContain('gap: 2px !important')
    expect(body).toContain('width: max-content !important')
    expect(body).toContain('margin-top: 18px !important')
    expect(body).toContain('translate: -4px 6px')
    expect(buttonBody).toContain('width: 28px !important')
    expect(buttonBody).toContain('height: 28px !important')
    expect(groupBody).toContain('flex-wrap: nowrap !important')
  })

  it('keeps the Living Archive editor pane on one parchment stack', () => {
    const lightBody = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="light"]')
    const darkBody = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="dark"]')

    expect(polishCss).toContain('[data-theme-preset="living-archive"] .editor')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .breadcrumb-bar')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .editor-content-wrapper')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] :is(.inspector-panel, .ai-panel)')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .settings-main-surface')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .ai-panel [data-testid="agent-input"]')
    expect(getRuleBody(css, ':where(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n)')).toContain('--background: var(--surface-editor)')
    expect(lightBody).toContain('--grimoire-document-page: #eee4ce')
    expect(darkBody).toContain('--grimoire-document-page: #162125')
    expect(darkBody).toContain('--background: var(--surface-app)')
    expect(getRuleBody(polishCss, '[data-theme-preset="living-archive"] .editor__blocknote-container .bn-container')).toContain('--bn-colors-editor-background: transparent')
  })

  it('keeps Living Archive H3/H4 headings out of the manuscript display font', () => {
    const h3Body = getRuleBody(polishCss, '[data-theme-preset="living-archive"] .editor__blocknote-container [data-content-type="heading"][data-level="3"] .bn-inline-content')
    const h4Body = getRuleBody(polishCss, '[data-theme-preset="living-archive"] .editor__blocknote-container [data-content-type="heading"][data-level="4"] .bn-inline-content')

    expect(getRuleBody(flagshipSharedCss, '[data-theme-preset="living-archive"] .editor__blocknote-container [data-content-type="heading"][data-level="2"] .bn-inline-content')).toContain('var(--grimoire-display-font-family)')
    expect(flagshipSharedCss).not.toContain('[data-theme-preset="living-archive"] .editor__blocknote-container [data-content-type="heading"] .bn-inline-content')
    expect(h3Body).toContain('var(--grimoire-label-font')
    expect(h4Body).toContain('var(--grimoire-label-font')
    expect(h3Body).toContain('font-style: normal !important')
    expect(h4Body).toContain('font-style: normal !important')
  })

  it('keeps flagship editor backgrounds stronger than lazy Editor.css', () => {
    const lazyBlockNoteSelector = '.editor__blocknote-container .bn-container'
    const flagshipBlockNoteSelector = `${strongNonConstellationFlagshipSelector} .editor__blocknote-container .bn-container`
    const flagshipCanvasSelector = `${strongNonConstellationFlagshipSelector} :is(.editor, .editor-scroll-area)`
    const flagshipMetaSelector = `${strongNonConstellationFlagshipSelector} .editor-meta-strip`

    expect(getRuleBody(editorCss, lazyBlockNoteSelector)).toContain('background: var(--bg-primary)')
    expect(flagshipBlockNoteSelector).not.toContain(':where')
    expect(classOrAttributeCount(flagshipBlockNoteSelector)).toBeGreaterThan(classOrAttributeCount(lazyBlockNoteSelector))
    expect(getRuleBody(css, flagshipMetaSelector)).toContain('display: flex')
    expect(getRuleBody(css, flagshipBlockNoteSelector)).toContain('--bn-colors-editor-background: transparent')
    expect(getRuleBody(css, flagshipCanvasSelector)).toContain('var(--surface-editor)')
  })

  it('keeps light primary button foregrounds at AA contrast', () => {
    for (const selector of [
      '[data-theme-preset="living-archive"][data-theme="light"]',
      '[data-theme-preset="daylight-atelier"][data-theme="light"]',
      '[data-theme-preset="nocturne"][data-theme="light"]',
    ]) {
      const body = getRuleBody(css, selector)
      expect(contrastRatio(getDeclaration(body, '--accent-blue'), getDeclaration(body, '--primary-foreground'))).toBeGreaterThanOrEqual(4.5)
    }
    const archiveLight = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="light"]')
    expect(contrastRatio(getDeclaration(archiveLight, '--accent-blue'), getDeclaration(archiveLight, '--primary-foreground'))).toBeGreaterThanOrEqual(4.5)
    const archiveDark = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="dark"]')
    expect(contrastRatio(getDeclaration(archiveDark, '--grimoire-document-page'), getDeclaration(archiveDark, '--text-primary'))).toBeGreaterThanOrEqual(4.5)
  })

  it('shares signal chips and concept-map atoms across non-constellation flagship themes', () => {
    expect(css).toContain(`${nonConstellationFlagshipSelector} .note-signal-chip`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map__core`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map__node--6`)
  })

  it('keeps flagship workspace motion finite instead of ambient infinite loops', () => {
    expect(flagshipSharedCss).not.toMatch(/\banimation:[^;{}]*\binfinite\b/u)
    expect(flagshipSharedCss).toContain('animation: grimoire-agent-ready var(--motion-duration-state-pulse) var(--motion-ease-cinematic) 1 both')
    expect(flagshipSharedCss).toContain('@keyframes grimoire-agent-ready')
  })

  it('routes flagship status-bar copy through footer contrast tokens', () => {
    const body = getRuleBody(flagshipSharedCss, `${nonConstellationFlagshipSelector} .status-bar`)

    expect(getDeclaration(body, 'color')).toBe('var(--status-bar-muted-foreground, color-mix(in srgb, var(--sidebar-foreground) 76%, transparent)) !important')
  })

  it('keeps constellation surfaces token-driven instead of hard-coded panel islands', () => {
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] .app-shell')).toContain('var(--surface-app)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] .note-list-panel')).toContain('var(--surface-panel)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] :is(.editor, .editor-scroll-area)')).toContain('var(--surface-editor)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] :is(.inspector-panel, .ai-panel)')).toContain('var(--surface-panel)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] .status-bar')).toContain('var(--surface-sidebar)')
    expect(getRuleBody(flagshipSharedCss, `${strongNonConstellationFlagshipSelector} .editor-content-wrapper`)).toContain('var(--surface-card)')
    expect(flagshipSharedCss).toContain(':is(.project-workspace-chrome, .note-list-filter-shelf)')
    expect(flagshipSharedCss).toContain('box-shadow: none')
    expect(constellationCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })

  it('routes flagship workspace chrome through shared material tokens', () => {
    expect(coherenceCss).toContain('--grimoire-panel-material')
    expect(coherenceCss).toContain('--grimoire-card-material')
    expect(coherenceCss).toContain('--grimoire-editor-material')
    expect(coherenceCss).toContain('--grimoire-dialog-material')
    expect(coherenceCss).toContain('--grimoire-settings-main-material')
    expect(coherenceCss).toContain('--grimoire-agent-card-material')
    expect(coherenceCss).toContain('--grimoire-private-local-accent')
    expect(coherenceCss).toContain('--ai-message-user-bg')
    expect(coherenceCss).toContain('--ai-reference-pill-bg')
    expect(coherenceCss).toContain('--status-bar-control-material')
    expect(coherenceCss).toContain('--status-bar-foreground')
    expect(coherenceCss).toContain('--status-bar-muted-foreground')
    expect(coherenceCss).toContain('--status-bar-raw-accent-orange')
    expect(coherenceCss).toContain('--status-bar-warning-fg')
    expect(coherenceCss).toContain('.status-bar :is(button, [role="button"])')
    expect(coherenceCss).toContain('color: var(--status-bar-muted-foreground) !important')
    expect(coherenceCss).toContain('button[aria-expanded="true"]')
    expect(coherenceCss).toContain('[data-testid="status-utility-group"]')
    expect(coherenceCss).toContain(':is(button, [role="button"]) {\n  color: inherit !important')
    expect(getRuleBody(coherenceCss, ':is(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n) :is(.note-list-panel, .inspector-panel, .ai-panel)')).toContain('var(--grimoire-panel-material)')
    expect(getRuleBody(coherenceCss, ':is(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n) .settings-panel-shell')).toContain('var(--grimoire-dialog-material)')
    expect(getRuleBody(coherenceCss, ':is(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n) .settings-main-surface')).toContain('var(--grimoire-settings-main-material)')
    expect(getRuleBody(coherenceCss, ':is(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n) :is(.editor-content-wrapper, .note-list-panel [data-note-path], .constellation-insights, .inspector-card, .vault-dashboard__panel, .vault-dashboard__stat)')).toContain('var(--grimoire-card-material)')
    expect(getRuleBody(coherenceCss, ':is(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n) :is(.project-workspace-chrome, .note-list-filter-shelf)')).toContain('background: transparent')
    expect(coherenceCss).toContain('[data-reference-pill="true"]')
    expect(coherenceCss).toContain('[data-testid="status-modified-count"] span span')
    expect(coherenceCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })

  it('declares Nocturne sidebar contrast tokens explicitly in both modes', () => {
    for (const selector of [
      '[data-theme-preset="nocturne"][data-theme="light"]',
      '[data-theme-preset="nocturne"][data-theme="dark"]',
    ]) {
      const body = getRuleBody(css, selector)

      expect(getDeclaration(body, '--sidebar-accent')).toBeTruthy()
      expect(getDeclaration(body, '--sidebar-accent-foreground')).toBeTruthy()
      expect(getDeclaration(body, '--sidebar-border')).toBeTruthy()
      expect(contrastRatio(getDeclaration(body, '--surface-sidebar'), getDeclaration(body, '--sidebar-foreground'))).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(getDeclaration(body, '--sidebar-primary'), getDeclaration(body, '--sidebar-primary-foreground'))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('declares high-contrast and forced-colors overrides for core surfaces', () => {
    expect(css).toContain('@media (prefers-contrast: more)')
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('--grimoire-workspace-texture: none')
    expect(css).toContain('forced-color-adjust: auto')
    expect(css).toContain('CanvasText !important')
    expect(css).toContain('ButtonBorder !important')
    expect(css).toContain(':where(:focus, :focus-visible')
    expect(css).toContain('outline: 2px solid Highlight')
    expect(css).toContain('.settings-panel-shell')
    expect(css).toContain('.editor-navigator-popover-shell')
    expect(css).toContain('.status-bar')
  })
})

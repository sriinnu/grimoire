import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('system theme CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
  const css = [
    'system-themes.css', 'theme-system-tokens.css', 'theme-semantic-tokens.css', 'theme-constellation.css',
    'theme-flagship-shared.css', 'theme-editor-navigator.css', 'theme-coherence.css', 'theme-status-bar.css',
    'theme-surface-coherence.css', 'theme-agent-council.css', 'theme-ai-brief.css', 'theme-accessibility.css',
  ].map((file) => readText(`${process.cwd()}/src/${file}`)).join('\n')
  const dashboardLayoutCss = readText(`${process.cwd()}/src/components/dashboard/VaultDashboardLayout.css`)
  const aiMarkdownCss = readText(`${process.cwd()}/src/ai-markdown.css`)
  const baseCss = readText(`${process.cwd()}/src/theme-base.css`)
  const themeSystemTokensCss = readText(`${process.cwd()}/src/theme-system-tokens.css`)
  const flagshipSharedCss = readText(`${process.cwd()}/src/theme-flagship-shared.css`)
  const coherenceCss = readText(`${process.cwd()}/src/theme-coherence.css`)
  const statusBarCss = readText(`${process.cwd()}/src/theme-status-bar.css`)
  const constellationCss = readText(`${process.cwd()}/src/theme-constellation.css`)
  const editorCss = readText(`${process.cwd()}/src/components/Editor.css`)
  const editorHeadingCss = readText(`${process.cwd()}/src/components/EditorHeadingProfiles.css`)
  const editorMetaCss = readText(`${process.cwd()}/src/components/EditorMeta.css`)
  const editorThemeCss = readText(`${process.cwd()}/src/components/EditorTheme.css`)
  const graphAnimationsCss = readText(`${process.cwd()}/src/graph-animations.css`)
  const agentCouncilThemeCss = readText(`${process.cwd()}/src/theme-agent-council.css`)
  const canvasAttachmentCss = readText(`${process.cwd()}/src/components/canvas/CanvasAttachment.css`)
  const mainTsx = readText(`${process.cwd()}/src/main.tsx`)
  const noteListChromeCss = ['NoteListChrome.css', 'ProjectWorkspaceChrome.css', 'NoteListFilterRail.css']
    .map((file) => readText(`${process.cwd()}/src/components/note-list/${file}`)).join('\n')
  const polishCss = readText(`${process.cwd()}/src/theme-polish.css`)
  const strongNonConstellationFlagshipSelector = ':is([data-theme-preset="living-archive"], [data-theme-preset="daylight-notebook"], [data-theme-preset="morning-notebook"], [data-theme-preset="nocturne"], [data-theme-preset="code-notebook"])'

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
  const classOrAttributeCount = (selector: string): number => (selector.match(/(?:\.|\[)/gu) ?? []).length
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

  it('routes navigation and sidebar special effects through theme tokens', () => {
    const navigatorCss = readText(`${process.cwd()}/src/theme-editor-navigator.css`)
    const sidebarCss = readText(`${process.cwd()}/src/sidebar-appearance.css`)

    expect(getRuleBody(navigatorCss, '[data-theme-preset="constellation"] .editor-navigator-popover-shell')).toContain('var(--surface-popover)')
    expect(navigatorCss).not.toContain('#08131f')
    expect(navigatorCss).not.toContain('rgba(84, 225, 210')
    const nocturneSidebar = getRuleBody(sidebarCss, '[data-theme-preset="nocturne"] .app-sidebar-panel')
    expect(nocturneSidebar).toContain('var(--sidebar-foreground)')
    expect(nocturneSidebar).not.toContain('var(--sidebar-primary)')
    expect(sidebarCss).not.toContain('var(--accent-yellow)')
    expect(sidebarCss).not.toContain('rgba(155, 255, 122')
  })
  it('routes density variables into dashboard and note-list rhythm', () => {
    expect(baseCss).toContain('--grimoire-density-panel-padding: 16px')
    expect(dashboardLayoutCss).toContain('padding: var(--grimoire-density-page-padding, 28px)')
    expect(dashboardLayoutCss).toContain('gap: var(--grimoire-density-card-gap, 14px)')
    expect(flagshipSharedCss).toContain('margin: var(--grimoire-density-note-card-margin, 8px 10px 0)')
    expect(noteListChromeCss).toContain('padding: var(--grimoire-density-toolbar-padding, 8px 10px)')
    expect(noteListChromeCss).toContain('padding: var(--grimoire-density-note-footer-padding, 7px 10px)')
  })
  it('routes code blocks through theme-pack code treatment variables', () => {
    expect(baseCss).toContain('--grimoire-code-block-bg')
    expect(editorThemeCss).toContain('var(--grimoire-code-block-bg, var(--surface-input))')
    expect(editorThemeCss).toContain('var(--grimoire-code-block-border, var(--border-default))')
    expect(aiMarkdownCss).toContain('var(--grimoire-code-block-bg, var(--muted))')
    expect(aiMarkdownCss).toContain('var(--grimoire-code-block-shadow, none)')
  })

  it('routes full theme profiles into shell UX materials', () => {
    expect(getRuleBody(coherenceCss, '[data-theme-density="compact"]')).toContain('--grimoire-shell-radius: 6px')
    expect(getRuleBody(coherenceCss, '[data-theme-density="spacious"]')).toContain('--grimoire-shell-radius: 10px')
    expect(getRuleBody(coherenceCss, '[data-theme-motion="calm"]')).toContain('--grimoire-card-shadow: none')
    expect(getRuleBody(coherenceCss, '[data-theme-motion="expressive"]')).toContain('--grimoire-context-menu-shadow')
    expect(getRuleBody(coherenceCss, '[data-theme-graph="constellation"]')).toContain('--grimoire-right-brain-material')
    expect(getRuleBody(coherenceCss, '[data-theme-code-block="terminal"]')).toContain('--grimoire-editor-page-material')
    expect(coherenceCss).toContain('--grimoire-context-menu-material')
    const contextMenuBody = getRuleBody(coherenceCss, ':is([data-theme-preset]) .grimoire-context-menu-surface')
    expect(contextMenuBody).toContain('var(--grimoire-context-menu-material)')
    expect(contextMenuBody).toContain('backdrop-filter: none')
    expect(contextMenuBody).not.toContain('var(--grimoire-dialog-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .graph-canvas-shell')).toContain('var(--grimoire-graph-bg)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .editor-content-wrapper')).toContain('var(--grimoire-editor-page-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.ai-panel, .inspector-panel)')).toContain('var(--grimoire-right-brain-material)')
  })

  it('routes graph and canvas surfaces through theme-pack visual variables', () => {
    expect(baseCss).toContain('--grimoire-graph-bg')
    expect(baseCss).toContain('--grimoire-canvas-stage-bg')
    expect(baseCss).toContain('--grimoire-html-preview-bg')
    expect(baseCss).toContain('--grimoire-html-preview-border')
    expect(getRuleBody(graphAnimationsCss, '.graph-canvas-shell')).toContain('var(--grimoire-graph-bg')
    expect(getRuleBody(graphAnimationsCss, '.graph-canvas-hud span,\n.graph-canvas-agent-rail span')).toContain('var(--grimoire-graph-hud-bg')
    expect(graphAnimationsCss).toContain('.graph-canvas-package-card')
    expect(graphAnimationsCss).toContain('.graph-canvas-agent-rail')
    expect(graphAnimationsCss).toContain('var(--grimoire-graph-edge-relationship')
    expect(graphAnimationsCss).toContain('var(--grimoire-graph-edge-local')
    expect(getRuleBody(canvasAttachmentCss, '.canvas-attachment__toolbar')).toContain('var(--grimoire-canvas-toolbar-bg')
    expect(getRuleBody(canvasAttachmentCss, '.canvas-attachment__stage')).toContain('var(--grimoire-canvas-stage-bg')
    expect(getRuleBody(canvasAttachmentCss, '.canvas-attachment__surface')).toContain('var(--grimoire-canvas-paper-bg')
    expect(getRuleBody(editorThemeCss, '.html-preview-frame')).toContain('var(--grimoire-html-preview-bg')
    expect(graphAnimationsCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })
  it('keeps editor metadata styled even outside flagship presets', () => {
    const body = getRuleBody(editorMetaCss, '.editor-meta-strip')
    const pillBody = getRuleBody(editorMetaCss, '.editor-meta-pill')
    const strongBody = getRuleBody(editorMetaCss, '.editor-meta-pill__value,\n.editor-meta-pill strong')

    expect(body).toContain('display: flex')
    // Single cool-hairline meta row now (word count pinned right), not wrapping.
    expect(body).toContain('flex-wrap: nowrap')
    expect(body).toContain('overflow-x: auto')
    expect(pillBody).toContain('display: inline-flex')
    expect(pillBody).toContain('min-width: 0')
    expect(pillBody).toContain('white-space: nowrap')
    expect(strongBody).toContain('display: block')
    expect(strongBody).toContain('min-width: 0')
    expect(editorMetaCss).toContain('.editor-content-layout--left .editor-meta-strip')
  })

  it('routes JSON heading and metadata profiles into structural editor CSS', () => {
    expect(editorHeadingCss).toContain('[data-theme-heading="manuscript"]')
    expect(editorHeadingCss).toContain('[data-theme-heading="terminal"]')
    expect(editorHeadingCss).toContain('var(--grimoire-display-font-family')
    expect(editorHeadingCss).toContain('var(--grimoire-mono-font-family')
    expect(editorHeadingCss).toContain('border-bottom-style: dashed')
    expect(editorMetaCss).toContain('[data-theme-metadata-strip="quiet"] .editor-meta-pill')
    expect(editorMetaCss).toContain('[data-theme-metadata-strip="terminal"] .editor-meta-pill')
  })
  it('keeps BlockNote floating side controls compact and below the editor top edge', () => {
    const body = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu')
    const buttonBody = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu button')
    const groupBody = getRuleBody(editorThemeCss, '.editor__blocknote-container .bn-side-menu :is([role="group"], .mantine-Group-root)')

    expect(body).toContain('flex-direction: row !important')
    expect(body).toContain('--grimoire-block-side-control-size: 22px')
    expect(body).toContain('--grimoire-block-side-control-gap: 1px')
    expect(body).toContain('gap: var(--grimoire-block-side-control-gap) !important')
    expect(body).toContain('width: max-content !important')
    expect(body).toContain('max-width: calc((var(--grimoire-block-side-control-size) * 2) + var(--grimoire-block-side-control-gap) + 4px) !important')
    expect(body).toContain('margin-top: 0 !important')
    expect(body).toContain('overflow: visible !important')
    // De-carded, Notion-style: no floating panel, just two quiet icons.
    expect(body).toContain('padding: 0 !important')
    expect(body).toContain('background: transparent')
    expect(body).toContain('box-shadow: none')
    expect(body).toContain('translate: -8px 0')
    expect(buttonBody).toContain('width: var(--grimoire-block-side-control-size) !important')
    expect(buttonBody).toContain('height: var(--grimoire-block-side-control-size) !important')
    expect(buttonBody).toContain('border-radius: 6px !important')
    expect(groupBody).toContain('flex-wrap: nowrap !important')
    expect(groupBody).toContain('align-items: center !important')
    expect(groupBody).toContain('gap: var(--grimoire-block-side-control-gap) !important')
  })

  it('keeps the Graphite Archive editor pane on one paper stack', () => {
    const lightBody = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="light"]')
    const darkBody = getRuleBody(polishCss, '[data-theme-preset="living-archive"][data-theme="dark"]')

    expect(polishCss).toContain('[data-theme-preset="living-archive"] .editor')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .breadcrumb-bar')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .editor-content-wrapper')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] :is(.inspector-panel, .ai-panel)')
    expect(polishCss).not.toContain('--grimoire-brand-gold')
    expect(polishCss).not.toContain('--grimoire-parchment')
    expect(polishCss).not.toContain('warm paper')
    expect(polishCss).toContain('--grimoire-settings-main-material')
    expect(polishCss).toContain('[data-theme-preset="living-archive"] .ai-panel [data-testid="agent-input"]')
    expect(getRuleBody(css, ':where(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-notebook"],\n  [data-theme-preset="morning-notebook"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="code-notebook"]\n)')).toContain('--background: var(--surface-editor)')
    expect(lightBody).toContain('--grimoire-document-page: var(--grimoire-page-tint-2)')
    expect(darkBody).toContain('--grimoire-document-page: #191d22')
    expect(darkBody).toContain('--background: var(--surface-app)')
    expect(getRuleBody(polishCss, '[data-theme-preset="living-archive"] .editor__blocknote-container .bn-container')).toContain('--bn-colors-editor-background: transparent')
  })

  it('keeps Graphite Archive H3/H4 headings out of the manuscript display font', () => {
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

  it('keeps the light Midnight Aurora primary button foreground at AA contrast', () => {
    const body = getRuleBody(css, '[data-theme-preset="morning-notebook"][data-theme="light"]')
    // Aurora light: #0c7d72 teal accent + #ffffff primary-foreground = 5.01, passes AA.
    expect(contrastRatio(getDeclaration(body, '--accent-blue'), getDeclaration(body, '--primary-foreground'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps flagship workspace motion finite instead of ambient infinite loops', () => {
    expect(flagshipSharedCss).not.toMatch(/\banimation:[^;{}]*\binfinite\b/u)
    expect(flagshipSharedCss).toContain('animation: grimoire-agent-ready var(--motion-duration-state-pulse) var(--motion-ease-cinematic) 1 both')
    expect(flagshipSharedCss).toContain('@keyframes grimoire-agent-ready')
  })

  it('keeps flagship notebook accent-green aliases tied to blue accents', () => {
    const flagshipNotebookSelectors = [
      '[data-theme-preset="constellation"]',
      '[data-theme-preset="daylight-notebook"][data-theme="light"]',
      '[data-theme-preset="daylight-notebook"][data-theme="dark"]',
      '[data-theme-preset="morning-notebook"][data-theme="light"]',
      '[data-theme-preset="morning-notebook"][data-theme="dark"]',
      '[data-theme-preset="living-archive"][data-theme="light"]',
      '[data-theme-preset="living-archive"][data-theme="dark"]',
      '[data-theme-preset="nocturne"][data-theme="light"]',
      '[data-theme-preset="nocturne"][data-theme="dark"]',
      '[data-theme-preset="code-notebook"]',
    ]

    for (const selector of flagshipNotebookSelectors) {
      const body = getRuleBody(themeSystemTokensCss, selector)
      const accentGreenDeclaration = body
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('--accent-green:'))

      expect(accentGreenDeclaration, selector).toBeDefined()
      expect(accentGreenDeclaration, selector).toContain('var(--accent-blue)')
      expect(accentGreenDeclaration, selector).not.toMatch(/#[0-9a-fA-F]{3,6}/u)
    }
  })

  it('keeps graph package motion finite and reduced-motion safe', () => {
    expect(graphAnimationsCss).not.toMatch(/grimoire-graph-node-package-orbit[\s\S]*?\binfinite\b/u)
    expect(graphAnimationsCss).not.toMatch(/grimoire-graph-package-tether[\s\S]*?\binfinite\b/u)
    expect(graphAnimationsCss).toContain('animation: grimoire-graph-package-settle 900ms var(--motion-ease-cinematic) 1 both')
    expect(graphAnimationsCss).toContain('animation: grimoire-graph-package-tether 720ms var(--motion-ease-cinematic) 1 both')
    expect(graphAnimationsCss).toContain('@media (prefers-reduced-motion: reduce)')
    expect(graphAnimationsCss).toContain('.grimoire-graph-package-tether')
  })

  it('keeps status bar and settings shell material ownership in shared theme layers', () => {
    for (const source of [flagshipSharedCss, constellationCss, polishCss]) {
      expect(source).not.toContain('.status-bar')
      expect(source).not.toContain('.settings-panel-shell')
      expect(source).not.toContain('.settings-navigation-rail')
      expect(source).not.toContain('.settings-main-surface')
      expect(source).not.toContain('[data-testid="theme-pack-settings"]')
      expect(source).not.toContain('[data-testid="locality-firewall-card"]')
    }

    const statusBarBody = getRuleBody(statusBarCss, '.status-bar')

    expect(statusBarCss).toContain('[data-theme="dark"]')
    expect(statusBarCss).toContain('--status-bar-material: var(--grimoire-status-material')
    expect(getDeclaration(statusBarBody, 'background')).toBe('var(--status-bar-material) !important')
    expect(getDeclaration(statusBarBody, 'border-top')).toBe('1px solid var(--status-bar-hairline) !important')
    expect(statusBarBody).toContain('var(--status-bar-tone-line)')
    expect(statusBarBody).toContain('var(--status-bar-background)')
  })

  it('keeps constellation surfaces token-driven instead of hard-coded panel islands', () => {
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] .app-shell')).toContain('var(--surface-app)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] .note-list-panel')).toContain('var(--surface-panel)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] :is(.editor, .editor-scroll-area)')).toContain('var(--surface-editor)')
    expect(getRuleBody(constellationCss, '[data-theme-preset="constellation"] :is(.inspector-panel, .ai-panel)')).toContain('var(--surface-panel)')
    expect(getRuleBody(flagshipSharedCss, `${strongNonConstellationFlagshipSelector} .editor-content-wrapper`)).toContain('var(--surface-card)')
    expect(flagshipSharedCss).toContain(':is(.project-workspace-chrome__overview, .project-workspace-chrome__docs, .note-list-filter-group)')
    expect(flagshipSharedCss).not.toContain(':is(.project-workspace-chrome, .note-list-filter-shelf)')
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
    expect(agentCouncilThemeCss).toContain('.grimoire-agent-council__map')
    expect(agentCouncilThemeCss).toContain('.grimoire-agent-council__map-step')
    expect(coherenceCss).toContain('--grimoire-private-local-accent')
    expect(coherenceCss).toContain('--ai-message-user-bg')
    expect(coherenceCss).toContain('--ai-reference-pill-bg')
    expect(statusBarCss).toContain('--status-bar-control-material')
    expect(statusBarCss).toContain('--status-bar-background')
    expect(statusBarCss).toContain('--status-bar-foreground')
    expect(statusBarCss).toContain('--status-bar-muted-foreground')
    expect(statusBarCss).toContain('--status-bar-tone-line')
    expect(statusBarCss).toContain('--status-bar-raw-accent-orange')
    expect(statusBarCss).toContain('--status-bar-warning-fg')
    expect(statusBarCss).toContain('--status-bar-popover-muted-foreground')
    expect(coherenceCss).toContain('--grimoire-dialog-overlay')
    expect(coherenceCss).toContain('--grimoire-dialog-shadow')
    expect(coherenceCss).toContain('--grimoire-shell-radius')
    expect(coherenceCss).toContain('--grimoire-portability-material')
    expect(coherenceCss).toContain('--grimoire-portability-preview-material')
    expect(coherenceCss).toContain('--grimoire-portability-warn-fg')
    expect(coherenceCss).toContain('--grimoire-portability-safe-fg')
    expect(coherenceCss).toContain('.grimoire-dialog-overlay')
    expect(coherenceCss).toContain('.grimoire-command-surface')
    expect(coherenceCss).toContain('.grimoire-object-storage-preview')
    expect(statusBarCss).toContain('[data-testid="status-workspace-group"], [data-testid="status-workflow-group"], [data-testid="status-utility-group"]) :is(button, [role="button"])')
    expect(statusBarCss).toContain('.status-bar-summary-chip[data-status-summary-tone="success"]')
    expect(statusBarCss).not.toContain('[data-testid="status-spanda-group"], [data-testid="status-agent-group"]')
    expect(statusBarCss).toContain('.status-bar :is([role="menu"], [data-testid="git-status-popup"])')
    expect(statusBarCss).toContain('.status-bar[data-status-tone="healthy"]')
    expect(statusBarCss).toContain('.status-bar[data-status-tone="attention"]')
    expect(statusBarCss).toContain('.status-bar[data-status-tone="danger"]')
    expect(statusBarCss).toContain('color: var(--status-bar-muted-foreground) !important')
    expect(statusBarCss).toContain('button[aria-expanded="true"]')
    expect(statusBarCss).toContain('[data-testid="status-utility-group"]')
    expect(statusBarCss).toContain(':is(button:not([data-status-action-tone]), [role="button"]:not([data-status-action-tone])) {\n  color: inherit !important')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.note-list-panel, .inspector-panel, .ai-panel)')).toContain('var(--grimoire-panel-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .settings-panel-shell')).toContain('var(--grimoire-dialog-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .grimoire-dialog-overlay')).toContain('var(--grimoire-dialog-overlay)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.grimoire-dialog-content, .grimoire-command-surface)')).toContain('var(--grimoire-dialog-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .grimoire-dialog-content')).toContain('var(--grimoire-density-panel-padding')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.grimoire-portability-card, .grimoire-portability-action-deck, .grimoire-import-autopsy)')).toContain('var(--grimoire-portability-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.grimoire-portability-lanes, .grimoire-portability-inline-panel, .grimoire-object-storage-preview, .grimoire-import-autopsy__bucket, .grimoire-import-autopsy__manifest, .grimoire-import-autopsy__manifest-row, .grimoire-import-autopsy__step, .grimoire-preview-stat)')).toContain('var(--grimoire-portability-preview-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) .settings-main-surface')).toContain('var(--grimoire-settings-main-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.editor-content-wrapper, .note-list-panel [data-note-path], .constellation-insights, .inspector-card, .vault-dashboard__panel:not(.vault-dashboard__panel--capture):not(.vault-dashboard__assistant-brief), .vault-dashboard__stat)')).toContain('var(--grimoire-card-material)')
    expect(getRuleBody(coherenceCss, ':is([data-theme-preset]) :is(.project-workspace-chrome, .note-list-filter-shelf)')).toContain('background: transparent')
    expect(coherenceCss).toContain('[data-reference-pill="true"]')
    expect(statusBarCss).toContain('[data-testid="status-modified-count"] span span')
    expect(coherenceCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
    expect(agentCouncilThemeCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })

  it('loads system theme layers before screenshot polish so final preset tuning wins', () => {
    expect(mainTsx.indexOf("import './system-themes.css'")).toBeGreaterThanOrEqual(0)
    expect(mainTsx.indexOf("import './theme-polish.css'")).toBeGreaterThan(mainTsx.indexOf("import './system-themes.css'"))
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
    expect(css).toContain('.sidebar-artwork__glyph')
    expect(css).toContain('mix-blend-mode: normal !important')
    expect(css).toContain('.settings-panel-shell')
    expect(css).toContain('.editor-navigator-popover-shell')
    expect(css).toContain('.status-bar')
  })
})

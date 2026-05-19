import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('system theme CSS', () => {
  const css = [
    'system-themes.css',
    'theme-system-tokens.css',
    'theme-constellation.css',
    'theme-flagship-shared.css',
    'theme-editor-navigator.css',
  ].map((file) => readFileSync(`${process.cwd()}/src/${file}`, 'utf8')).join('\n')
  const editorCss = readFileSync(`${process.cwd()}/src/components/Editor.css`, 'utf8')
  const nonConstellationFlagshipSelector = ':where([data-theme-preset="living-archive"], [data-theme-preset="research-cockpit"], [data-theme-preset="nocturne"], [data-theme-preset="retro-terminal"])'

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
    expect(css).toContain('[data-theme-preset="living-archive"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="research-cockpit"]')
    expect(css).toContain('[data-theme-preset="retro-terminal"]')
    expect(css).toContain('[data-theme-preset-preview="constellation"]')
    expect(css).toContain('[data-theme-preset-preview="retro-terminal"]')
  })

  it('propagates themes beyond color tokens into shell surfaces and motion', () => {
    expect(css).toContain('.note-list-panel [data-note-location]::before')
    expect(css).toContain('.note-signal-chip')
    expect(css).toContain('.constellation-insights')
    expect(css).toContain('.constellation-concept-map')
    expect(css).toContain('.editor-agent-composer')
    expect(css).toContain('.editor-navigator-popover')
    expect(css).toContain('.sidebar-artwork__agent-card')
    expect(css).toContain('.status-bar')
    expect(css).toContain('@keyframes grimoire-mark-arrive')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
  })

  it('keeps flagship editor backgrounds stronger than lazy Editor.css', () => {
    const lazyBlockNoteSelector = '.editor__blocknote-container .bn-container'
    const flagshipBlockNoteSelector = ':is([data-theme-preset="living-archive"], [data-theme-preset="research-cockpit"], [data-theme-preset="nocturne"], [data-theme-preset="retro-terminal"]) .editor__blocknote-container .bn-container'
    const flagshipCanvasSelector = ':is([data-theme-preset="living-archive"], [data-theme-preset="research-cockpit"], [data-theme-preset="nocturne"], [data-theme-preset="retro-terminal"]) :is(.editor, .editor-scroll-area)'

    expect(getRuleBody(editorCss, lazyBlockNoteSelector)).toContain('background: var(--bg-primary)')
    expect(flagshipBlockNoteSelector).not.toContain(':where')
    expect(classOrAttributeCount(flagshipBlockNoteSelector)).toBeGreaterThan(classOrAttributeCount(lazyBlockNoteSelector))
    expect(getRuleBody(css, flagshipBlockNoteSelector)).toContain('--bn-colors-editor-background: transparent')
    expect(getRuleBody(css, flagshipCanvasSelector)).toContain('var(--surface-editor)')
  })

  it('keeps light primary button foregrounds at AA contrast', () => {
    for (const selector of [
      '[data-theme-preset="living-archive"][data-theme="light"]',
      '[data-theme-preset="nocturne"][data-theme="light"]',
    ]) {
      const body = getRuleBody(css, selector)
      expect(contrastRatio(getDeclaration(body, '--accent-blue'), getDeclaration(body, '--primary-foreground'))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('shares signal chips and concept-map atoms across non-constellation flagship themes', () => {
    expect(css).toContain(`${nonConstellationFlagshipSelector} .note-signal-chip`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map__core`)
    expect(css).toContain(`${nonConstellationFlagshipSelector} .constellation-concept-map__node--6`)
  })
})

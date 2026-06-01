import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface ThemePresetMode {
  tokens: Record<string, string>
}

interface ThemePreset {
  id: string
  modes: Record<string, ThemePresetMode>
}

describe('status bar theme CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')
  const css = readText(`${process.cwd()}/src/theme-status-bar.css`)
  const presets = JSON.parse(readFileSync(`${process.cwd()}/src/themes/presets.json`, 'utf8')) as ThemePreset[]
  const statusBarComponentDir = `${process.cwd()}/src/components/status-bar`

  function getRuleBody(selector: string): string {
    const ruleStart = css.indexOf(`${selector} {`)
    expect(ruleStart).toBeGreaterThanOrEqual(0)
    const bodyStart = css.indexOf('{', ruleStart)
    const bodyEnd = css.indexOf('}', bodyStart)
    return css.slice(bodyStart + 1, bodyEnd)
  }

  function relativeLuminance(hex: string): number {
    const value = Number.parseInt(hex.slice(1), 16)
    const channels = [value >> 16, (value >> 8) & 255, value & 255]
    const [red, green, blue] = channels.map((channel) => {
      const ratio = channel / 255
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }

  function contrastRatio(background: string, foreground: string): number {
    const [lighter, darker] = [relativeLuminance(background), relativeLuminance(foreground)].sort((a, b) => b - a)
    return (lighter + 0.05) / (darker + 0.05)
  }

  it('remaps Tailwind text variables inside the bottom bar', () => {
    const body = getRuleBody('.status-bar')

    expect(body).toContain('--foreground: var(--status-bar-foreground)')
    expect(body).toContain('--muted-foreground: var(--status-bar-muted-foreground)')
    expect(body).toContain('--border: var(--status-bar-control-border)')
    expect(body).toContain('--sidebar: var(--status-bar-background)')
    expect(body).toContain('--color-foreground: var(--status-bar-foreground)')
    expect(body).toContain('--color-muted-foreground: var(--status-bar-muted-foreground)')
    expect(body).toContain('--color-popover-foreground: var(--status-bar-popover-fg)')
    expect(body).toContain('color: var(--status-bar-muted-foreground')
    expect(css).toContain('--status-bar-popover-muted-foreground')
  })

  it('keeps semantic status tones theme-owned after generic button color resets', () => {
    const genericResetIndex = css.indexOf('[data-testid="status-mcp"]')
    const groupedResetIndex = css.indexOf(':is(button:not([data-status-action-tone]), [role="button"]:not([data-status-action-tone]))')
    expect(genericResetIndex).toBeGreaterThanOrEqual(0)
    expect(groupedResetIndex).toBeGreaterThan(genericResetIndex)

    for (const [tone, token] of [
      ['warning', '--status-bar-warning-fg'],
      ['success', '--status-bar-success-fg'],
      ['danger', '--status-bar-danger-fg'],
      ['agent', '--status-bar-agent-fg'],
      ['accent', '--status-bar-accent-fg'],
    ]) {
      const selector = `[data-status-action-tone="${tone}"]`
      const ruleIndex = css.indexOf(selector)
      expect(ruleIndex, selector).toBeGreaterThan(genericResetIndex)
      expect(css.slice(ruleIndex, css.indexOf('}', ruleIndex))).toContain(`color: var(${token}) !important`)
    }

    expect(css).toContain('[data-status-pill-tone="warning"]')
    expect(css).toContain('[data-status-pill-tone="success"]')
    expect(css).toContain('[data-status-pill-tone="danger"]')
  })

  it('keeps status-bar component inline colors on footer-owned tokens', () => {
    const problems = readdirSync(statusBarComponentDir)
      .filter((file) => file.endsWith('.tsx'))
      .flatMap((file) => {
        const source = readText(`${statusBarComponentDir}/${file}`)
        return ['var(--foreground)', 'var(--muted-foreground)']
          .filter((token) => source.includes(token))
          .map((token) => `${file}: ${token}`)
      })

    expect(problems).toEqual([])
  })

  it('applies footer contrast tokens outside flagship presets too', () => {
    expect(css).toContain(':root,\n[data-theme="light"],\n[data-theme="dark"],')
    expect(css).toContain('--status-bar-hairline: var(--grimoire-hairline')
    expect(css).toContain('--status-bar-material: var(--grimoire-status-material')
    expect(css).toContain('[data-testid="status-workspace-group"], [data-testid="status-workflow-group"], [data-testid="status-spanda-group"], [data-testid="status-agent-group"], [data-testid="status-utility-group"]) :is(button, [role="button"])')
    expect(css).toContain('.status-bar :is([data-testid="status-workspace-group"], [data-testid="status-workflow-group"], [data-testid="status-spanda-group"], [data-testid="status-agent-group"], [data-testid="status-utility-group"])')
  })

  it('keeps popover muted text separate from the footer rail muted token', () => {
    const popoverRule = getRuleBody('.status-bar :is([role="menu"], [data-testid="git-status-popup"])')

    expect(popoverRule).toContain('--muted-foreground: var(--status-bar-popover-muted-foreground)')
    expect(popoverRule).toContain('--color-muted-foreground: var(--status-bar-popover-muted-foreground)')
    expect(popoverRule).toContain('color: var(--status-bar-popover-fg) !important')
  })

  it('keeps every preset sidebar pair readable enough for the status bar', () => {
    for (const preset of presets) {
      for (const [mode, modeConfig] of Object.entries(preset.modes)) {
        const tokens = modeConfig.tokens
        const background = tokens['surface.sidebar']
        const foreground = tokens['sidebar.foreground']
        const primary = tokens['sidebar.primary']
        const primaryForeground = tokens['sidebar.primaryForeground']

        expect(contrastRatio(background, foreground), `${preset.id} ${mode} sidebar text`).toBeGreaterThanOrEqual(4.5)
        expect(contrastRatio(primary, primaryForeground), `${preset.id} ${mode} primary text`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

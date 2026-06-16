import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')

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

describe('system theme preview CSS', () => {
  const css = [
    'system-themes.css',
    'theme-system-tokens.css',
    'theme-semantic-tokens.css',
    'theme-constellation.css',
    'theme-flagship-shared.css',
    'theme-editor-navigator.css',
    'theme-coherence.css',
    'theme-status-bar.css',
    'theme-surface-coherence.css',
    'theme-agent-council.css',
    'theme-ai-brief.css',
    'theme-accessibility.css',
  ].map((file) => readText(`${process.cwd()}/src/${file}`)).join('\n')
  const themeSystemTokensCss = readText(`${process.cwd()}/src/theme-system-tokens.css`)

  it('defines the flagship presets across root and preview surfaces', () => {
    expect(css).toContain('[data-theme-preset="constellation"]')
    expect(css).toContain('[data-theme-preset="daylight-notebook"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="morning-notebook"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="living-archive"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="code-notebook"]')
    expect(css).toContain('[data-theme-preset-preview="constellation"]')
    expect(css).toContain('[data-theme-preset-preview="morning-notebook"]')
    expect(css).toContain('[data-theme-preset-preview="code-notebook"]')
    expect(css).not.toContain('[data-theme-preset="research-cockpit"]')
    expect(css).not.toContain('[data-theme-preset="manuscript"]')
  })

  it('keeps Settings appearance previews aligned with selected light and dark modes', () => {
    expect(getRuleBody(css, '[data-theme-preset-preview="daylight-notebook"][data-theme-preview="dark"]')).toContain('--surface-editor: #13171c')
    expect(getRuleBody(css, '[data-theme-preset-preview="living-archive"][data-theme-preview="dark"]')).toContain('--foreground: #e1e7ec')
    expect(getRuleBody(css, '[data-theme-preset-preview="nocturne"][data-theme-preview="light"]')).toContain('--surface-editor: #fdfdff')
    expect(getRuleBody(css, '[data-theme-preset-preview="code-notebook"]')).toContain('--surface-editor: #0a0c11')
    expect(getRuleBody(css, '[data-theme-preset-preview="code-notebook"]')).toContain('--primary: #8fa8ff')
    expect(css).not.toContain('[data-theme-preset-preview="manuscript"]')
    expect(css).not.toContain('#9bff7a')
    expect(css).not.toContain('#dcf8cf')
    expect(css).not.toContain('#8daa80')
    expect(css).not.toContain('--surface-editor: #090908')
    expect(css).not.toContain('--primary: #e8c86f')
    expect(css).not.toContain('--surface-app: #edf5f4')
    expect(css).not.toContain('--surface-sidebar: #263f49')
    expect(css).not.toContain('--state-selected: #d7ece9')
  })

  it('keeps the dark Notebook Map preset steel-blue instead of green teal', () => {
    const constellationBody = getRuleBody(themeSystemTokensCss, '[data-theme-preset="constellation"]')
    const previewBody = getRuleBody(css, '[data-theme-preset-preview="constellation"]')

    expect(getDeclaration(constellationBody, '--accent-blue')).toBe('#78a6ff')
    expect(getDeclaration(constellationBody, '--sidebar-primary')).toBe('#9cb8df')
    expect(getDeclaration(constellationBody, '--syntax-link')).toBe('#9fc0ff')
    expect(getDeclaration(previewBody, '--primary')).toBe('#78a6ff')
    expect(css).not.toContain('#54e1d2')
    expect(css).not.toContain('#5eead4')
    expect(css).not.toContain('rgba(84, 225, 210')
  })
})

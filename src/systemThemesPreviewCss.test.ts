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

describe('system theme preview CSS', () => {
  const css = [
    'system-themes.css',
    'theme-system-tokens.css',
    'theme-semantic-tokens.css',
    'theme-flagship-shared.css',
    'theme-editor-navigator.css',
    'theme-coherence.css',
    'theme-status-bar.css',
    'theme-surface-coherence.css',
    'theme-agent-council.css',
    'theme-ai-brief.css',
    'theme-accessibility.css',
  ].map((file) => readText(`${process.cwd()}/src/${file}`)).join('\n')

  it('defines the flagship presets across root and preview surfaces', () => {
    expect(css).toContain('[data-theme-preset="morning-notebook"][data-theme="light"]')
    expect(css).toContain('[data-theme-preset="morning-notebook"][data-theme="dark"]')
    expect(css).toContain('[data-theme-preset-preview="morning-notebook"]')
    // Retired presets are gone from the shipped CSS entirely.
    for (const retired of ['constellation', 'daylight-notebook', 'living-archive', 'nocturne', 'code-notebook']) {
      expect(css).not.toContain(`[data-theme-preset="${retired}"]`)
      expect(css).not.toContain(`[data-theme-preset-preview="${retired}"]`)
    }
    expect(css).not.toContain('[data-theme-preset="research-cockpit"]')
    expect(css).not.toContain('[data-theme-preset="manuscript"]')
  })

  it('keeps Settings appearance previews aligned with selected light and dark modes', () => {
    expect(getRuleBody(css, '[data-theme-preset-preview="morning-notebook"]')).toContain('--primary: #3a4ba8')
    expect(getRuleBody(css, '[data-theme-preset-preview="morning-notebook"][data-theme-preview="dark"]')).toContain('--surface-editor: #12110f')
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
})

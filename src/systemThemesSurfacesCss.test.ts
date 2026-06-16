import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const NON_GRAPH_FLAGSHIP_SELECTOR = ':where([data-theme-preset="living-archive"], [data-theme-preset="daylight-notebook"], [data-theme-preset="morning-notebook"], [data-theme-preset="nocturne"], [data-theme-preset="code-notebook"])'

const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')

function getRuleBody(source: string, selector: string): string {
  const ruleStart = source.indexOf(`${selector} {`)
  expect(ruleStart).toBeGreaterThanOrEqual(0)
  const bodyStart = source.indexOf('{', ruleStart)
  const bodyEnd = source.indexOf('}', bodyStart)
  return source.slice(bodyStart + 1, bodyEnd)
}

describe('system theme surface CSS', () => {
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
  const constellationCss = readText(`${process.cwd()}/src/theme-constellation.css`)
  const editorHeadingCss = readText(`${process.cwd()}/src/components/EditorHeadingProfiles.css`)
  const editorMetaCss = readText(`${process.cwd()}/src/components/EditorMeta.css`)
  const editorThemeCss = readText(`${process.cwd()}/src/components/EditorTheme.css`)
  const flagshipSharedCss = readText(`${process.cwd()}/src/theme-flagship-shared.css`)

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
    expect(css).toContain('.linked-concept-map')
    expect(css).toContain('.editor-agent-composer')
    expect(css).toContain('[data-ai-message-bubble="user"]')
    expect(css).toContain('[data-testid="agent-input"]')
    expect(css).toContain('.editor-navigator-popover')
    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('.status-bar')
    expect(css).toContain('.grimoire-ai-brief')
    expect(css).toContain('.grimoire-ai-brief__runway-step')
    expect(css).toContain('.settings-navigation-rail')
    expect(css).toContain('.settings-mobile-navigation')
    expect(css).toContain('.settings-main-surface')
    expect(css).toContain('.grimoire-dialog-overlay')
    expect(css).toContain('.grimoire-dialog-content')
    expect(css).toContain('.grimoire-command-surface')
    expect(css).toContain('.grimoire-portability-action-deck')
    expect(css).toContain('.grimoire-import-autopsy')
    expect(editorThemeCss).toContain('.html-preview-frame')
    expect(css).toContain('[data-testid="theme-pack-settings"]')
    expect(css).toContain('[data-testid="locality-firewall-card"]')
    expect(css).toContain('@keyframes grimoire-mark-arrive')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
    expect(css).toContain('body.windows-chrome .app-sidebar-rail')
    expect(css).toContain('padding-top: var(--sidebar-rail-safe-top')
    expect(editorHeadingCss).toContain('[data-theme-heading="graph"]')
    expect(editorMetaCss).toContain('[data-theme-metadata-strip="quiet"]')
    expect(editorMetaCss).toContain('[data-theme-metadata-strip="terminal"]')
  })

  it('keeps linked concepts notebook-stacked outside Notebook Map', () => {
    expect(css).toContain(`${NON_GRAPH_FLAGSHIP_SELECTOR} .note-signal-chip`)
    expect(css).toContain(`${NON_GRAPH_FLAGSHIP_SELECTOR} .linked-concept-map`)
    expect(css).toContain(`${NON_GRAPH_FLAGSHIP_SELECTOR} .linked-concept-map__core`)
    expect(css).toContain(`${NON_GRAPH_FLAGSHIP_SELECTOR} .linked-concept-map__node`)
    expect(getRuleBody(flagshipSharedCss, `${NON_GRAPH_FLAGSHIP_SELECTOR} .linked-concept-map`)).toContain('display: grid')
    expect(getRuleBody(flagshipSharedCss, `${NON_GRAPH_FLAGSHIP_SELECTOR} .linked-concept-map__node`)).toContain('position: static')
    expect(flagshipSharedCss).not.toContain('linear-gradient(28deg')
    expect(constellationCss).toContain('[data-theme-preset="constellation"] .linked-concept-map__node--6')
  })
})

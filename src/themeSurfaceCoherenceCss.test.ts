import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('theme surface coherence CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const surfaceCss = readFileSync(`${process.cwd()}/src/theme-surface-coherence.css`, 'utf8')
  const graphControlPanel = readFileSync(`${process.cwd()}/src/components/GraphControlPanel.tsx`, 'utf8')
  const graphModal = readFileSync(`${process.cwd()}/src/components/GraphModal.tsx`, 'utf8')

  function getRuleBody(selector: string): string {
    const ruleStart = surfaceCss.indexOf(`${selector} {`)
    expect(ruleStart).toBeGreaterThanOrEqual(0)
    const bodyStart = surfaceCss.indexOf('{', ruleStart)
    const bodyEnd = surfaceCss.indexOf('}', bodyStart)
    return surfaceCss.slice(bodyStart + 1, bodyEnd)
  }

  it('loads after base theme coherence and before accessibility overrides', () => {
    const coherenceIndex = systemThemesCss.indexOf("@import './theme-coherence.css';")
    const surfaceIndex = systemThemesCss.indexOf("@import './theme-surface-coherence.css';")
    const agentCouncilIndex = systemThemesCss.indexOf("@import './theme-agent-council.css';")
    const aiBriefIndex = systemThemesCss.indexOf("@import './theme-ai-brief.css';")
    const memoryLedgerIndex = systemThemesCss.indexOf("@import './theme-memory-ledger.css';")
    const accessibilityIndex = systemThemesCss.indexOf("@import './theme-accessibility.css';")
    expect(coherenceIndex).toBeGreaterThanOrEqual(0)
    expect(surfaceIndex).toBeGreaterThanOrEqual(0)
    expect(agentCouncilIndex).toBeGreaterThanOrEqual(0)
    expect(aiBriefIndex).toBeGreaterThanOrEqual(0)
    expect(memoryLedgerIndex).toBeGreaterThanOrEqual(0)
    expect(accessibilityIndex).toBeGreaterThanOrEqual(0)
    expect(coherenceIndex).toBeLessThan(surfaceIndex)
    expect(surfaceIndex).toBeLessThan(agentCouncilIndex)
    expect(agentCouncilIndex).toBeLessThan(aiBriefIndex)
    expect(aiBriefIndex).toBeLessThan(memoryLedgerIndex)
    expect(memoryLedgerIndex).toBeLessThan(accessibilityIndex)
  })

  it('declares shared material, spacing, radius, shadow, graph, rail, and mobile tokens', () => {
    const body = getRuleBody(':where(\n  [data-theme-preset="constellation"],\n  [data-theme-preset="daylight-atelier"],\n  [data-theme-preset="living-archive"],\n  [data-theme-preset="nocturne"],\n  [data-theme-preset="retro-terminal"]\n)')

    for (const token of [
      '--grimoire-surface-padding',
      '--grimoire-surface-gap',
      '--grimoire-surface-row-gap',
      '--grimoire-surface-radius',
      '--grimoire-surface-shadow',
      '--grimoire-rail-material',
      '--grimoire-graph-material',
      '--grimoire-graph-node-label-material',
      '--grimoire-graph-node-chip-material',
      '--grimoire-graph-agent-orbit-material',
      '--grimoire-mobile-material',
    ]) {
      expect(body).toContain(token)
    }
  })

  it('routes dashboard and graph islands through shared surface tokens', () => {
    expect(surfaceCss).toContain('.vault-dashboard__flow')
    expect(surfaceCss).toContain('background: var(--grimoire-rail-material)')
    expect(surfaceCss).toContain(':is(.vault-dashboard__flow-step, .vault-dashboard__ask-preview)')
    expect(surfaceCss).toContain('[data-testid="graph-control-panel"]')
    expect(surfaceCss).toContain('[data-testid="graph-agent-runway"]')
    expect(surfaceCss).toContain('[data-testid="graph-agent-handoff"]')
    expect(surfaceCss).toContain('.graph-surface-inner')
    expect(surfaceCss).toContain('.graph-agent-card')
    expect(surfaceCss).toContain('.graph-agent-chip')
    expect(surfaceCss).toContain('.grimoire-graph-filter-shell')
    expect(surfaceCss).toContain('background: var(--grimoire-graph-material)')
    expect(surfaceCss).toContain('background: var(--grimoire-graph-inner-material)')
    expect(surfaceCss).toContain('@media (max-width: 720px)')
    expect(surfaceCss).not.toContain('[data-testid="graph-agent-runway"] [class*="bg-muted"]')
    expect(surfaceCss).not.toContain('[data-testid="graph-agent-handoff"] [class*="bg-background"]')
    expect(surfaceCss).not.toContain('[class*="bg-"]')
  })

  it('routes graph canvas nodes and agent orbit through the same material family', () => {
    expect(surfaceCss).toContain('.graph-canvas-shell')
    expect(surfaceCss).toContain('.graph-canvas-package-card')
    expect(surfaceCss).toContain('.grimoire-graph-node-title-backdrop')
    expect(surfaceCss).toContain('fill: var(--grimoire-graph-node-label-material)')
    expect(surfaceCss).toContain('.grimoire-graph-node-type-pill')
    expect(surfaceCss).toContain('fill: var(--grimoire-graph-node-chip-material)')
    expect(surfaceCss).toContain('.grimoire-graph-node-core')
    expect(surfaceCss).toContain('filter: var(--grimoire-graph-node-shadow)')
    expect(surfaceCss).toContain('.grimoire-graph-agent-orbit__lane circle')
    expect(surfaceCss).toContain('fill: var(--grimoire-graph-agent-orbit-material)')
  })

  it('preserves graph agent readiness states after broad material overrides', () => {
    expect(surfaceCss).toContain('.graph-canvas-package-card[data-state="ready"]')
    expect(surfaceCss).toContain('.graph-canvas-agent-rail span[data-state="ready"]')
    expect(surfaceCss).toContain('.graph-canvas-agent-rail span[data-state="guarded"]')
    expect(surfaceCss).toContain('.graph-canvas-agent-rail span[data-state="blocked"]')
    expect(surfaceCss).toContain('color: var(--foreground)')
    expect(surfaceCss).toContain(':is(.graph-agent-card, .graph-agent-chip)[data-state="ready"]')
    expect(surfaceCss).toContain(':is(.graph-agent-card, .graph-agent-chip)[data-state="guarded"]')
    expect(surfaceCss).toContain(':is(.graph-agent-card, .graph-agent-chip)[data-state="blocked"]')
    expect(surfaceCss).toContain('.grimoire-graph-agent-orbit__lane[data-state="ready"] circle')
    expect(surfaceCss).toContain('.grimoire-graph-agent-orbit__lane[data-state="guarded"] circle')
    expect(surfaceCss).toContain('.grimoire-graph-agent-orbit__lane[data-state="blocked"] circle')
    expect(surfaceCss).toContain('.graph-canvas-legend__item[data-tone="safe"] .graph-canvas-legend__mark')
  })

  it('keeps graph controls addressable without relying on generated utility classes', () => {
    expect(graphControlPanel).toContain('data-testid="graph-control-panel"')
    expect(graphModal).toContain('grimoire-graph-filter-shell')
  })

  it('stays token-driven instead of adding hard-coded color islands', () => {
    expect(surfaceCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })
})

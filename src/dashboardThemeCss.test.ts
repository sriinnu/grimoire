import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('dashboard theme CSS', () => {
  const appCss = readFileSync(`${process.cwd()}/src/App.css`, 'utf8')
  const coherenceCss = readFileSync(`${process.cwd()}/src/theme-coherence.css`, 'utf8')
  const surfaceCoherenceCss = readFileSync(`${process.cwd()}/src/theme-surface-coherence.css`, 'utf8')
  const dashboardCss = readFileSync(`${process.cwd()}/src/components/dashboard/VaultDashboard.css`, 'utf8')
  const dreamForgeCss = readFileSync(`${process.cwd()}/src/components/dashboard/DreamForgePanel.css`, 'utf8')
  const todayRunwayCss = readFileSync(`${process.cwd()}/src/components/dashboard/DashboardTodayRunway.css`, 'utf8')

  it('routes dashboard and Dream Forge surfaces through theme-owned materials', () => {
    expect(appCss).toContain('background: var(--grimoire-dashboard-material')
    expect(coherenceCss).toContain('--grimoire-dashboard-material')
    expect(coherenceCss).toContain('--grimoire-private-local-material')
    expect(surfaceCoherenceCss).toContain('--grimoire-rail-material')
    expect(surfaceCoherenceCss).toContain('.vault-dashboard__flow')
    expect(surfaceCoherenceCss).toContain('.vault-dashboard__ask-preview')
    expect(todayRunwayCss).toContain('background: var(--grimoire-rail-material')
    expect(todayRunwayCss).toContain('background: var(--grimoire-rail-card-material')
    expect(todayRunwayCss).toContain('box-shadow: var(--grimoire-surface-shadow')
    expect(coherenceCss).toContain('--grimoire-private-local-border')
    expect(coherenceCss).toContain('--grimoire-private-local-glow')
    expect(dreamForgeCss).toContain('background: var(--grimoire-private-local-material')
    expect(dreamForgeCss).toContain('border-color: var(--grimoire-private-local-border')
    expect(dreamForgeCss).toContain('box-shadow: var(--grimoire-private-local-glow')
    expect(dreamForgeCss).toContain('var(--grimoire-private-chip-bg')
    expect(dreamForgeCss).toContain('var(--grimoire-private-chip-fg')
    expect(dreamForgeCss).toContain('.vault-dashboard__dream-contract')
    expect(dreamForgeCss).toContain('.vault-dashboard__dream-timeline')
  })

  it('keeps Dream Forge motion finite and reduced-motion safe', () => {
    expect(dreamForgeCss).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(dreamForgeCss).toContain('animation: grimoire-dream-signal-arrive')
    expect(dreamForgeCss).not.toMatch(/\banimation:[^;{}]*\binfinite\b/u)
    expect(todayRunwayCss).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(todayRunwayCss).toContain('animation: grimoire-flow-next-arrive')
    expect(todayRunwayCss).not.toMatch(/\banimation:[^;{}]*\binfinite\b/u)
  })

  it('routes Time Loom through shared signal and private-local materials', () => {
    expect(dashboardCss).toContain('.vault-dashboard__daily-thread')
    expect(dashboardCss).toContain('.vault-dashboard__daily-thread-lane[data-state="private"]')
    expect(dashboardCss).toContain('.vault-dashboard__time-map')
    expect(dashboardCss).toContain('background: var(--grimoire-signal-bg')
    expect(dashboardCss).toContain('var(--grimoire-private-chip-bg')
    expect(dashboardCss).toContain('animation: grimoire-time-node-arrive')
  })
})

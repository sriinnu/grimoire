import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('agent council theme CSS', () => {
  const agentCss = readFileSync(`${process.cwd()}/src/theme-agent-council.css`, 'utf8')
  const coherenceCss = readFileSync(`${process.cwd()}/src/theme-coherence.css`, 'utf8')
  const polishCss = readFileSync(`${process.cwd()}/src/theme-polish.css`, 'utf8')

  it('keeps council map tokens computable instead of mixing gradient tokens as colors', () => {
    expect(agentCss).toContain('--grimoire-agent-council-inner-material: color-mix(in srgb, var(--surface-card) 82%, var(--surface-panel))')
    expect(agentCss).toContain('--grimoire-agent-council-private-material: var(--grimoire-private-local-material)')
    expect(agentCss).toContain('--grimoire-agent-council-friction-material: color-mix(in srgb, var(--surface-card) 86%, var(--status-bar-warning-fg, var(--primary)) 8%)')
    expect(agentCss).toContain('--grimoire-agent-council-answer-material: color-mix(in srgb, var(--surface-card) 84%, var(--grimoire-signal-accent) 10%)')
    expect(agentCss).toContain('--grimoire-context-capsule-route-material:')
    expect(agentCss).toContain('--grimoire-context-capsule-step-material: var(--grimoire-agent-council-inner-material)')
    expect(agentCss).toContain('--grimoire-crystallize-runway-material: var(--grimoire-context-capsule-route-material)')
    expect(agentCss).toContain('--grimoire-crystallize-stage-material: var(--grimoire-agent-council-inner-material)')
    expect(agentCss).toContain('--grimoire-crystallize-blocked-material:')
    expect(agentCss).not.toContain('color-mix(in srgb, var(--grimoire-agent-card-material)')
    expect(agentCss).not.toContain('color-mix(in srgb, var(--grimoire-signal-bg)')
    expect(agentCss).not.toContain('--grimoire-private-local-bg')
  })

  it('owns friction-to-answer materials in the theme layer', () => {
    expect(agentCss).toContain('.grimoire-agent-council__friction-step')
    expect(agentCss).toContain('.grimoire-agent-council__friction-step[data-state="guarded"]')
    expect(agentCss).toContain('.grimoire-agent-council__readiness')
    expect(agentCss).toContain('.grimoire-agent-council__readiness-lane[data-state="private"]')
    expect(agentCss).toContain('.grimoire-agent-council__readiness-lane[data-state="blocked"]')
    expect(agentCss).toContain('.grimoire-agent-council__answer[data-answer-state="guarded"]')
    expect(agentCss).toContain('.grimoire-agent-council__answer[data-answer-state="blocked"]')
  })

  it('keeps Context Capsule route materials in the same theme layer', () => {
    expect(agentCss).toContain('.grimoire-context-capsule')
    expect(agentCss).toContain('.grimoire-context-capsule-dialog')
    expect(agentCss).toContain('.grimoire-context-capsule__route')
    expect(agentCss).toContain('.grimoire-context-capsule__step')
    expect(agentCss).toContain('.grimoire-context-capsule__stat')
  })

  it('themes graph package and runway envelope metrics as one source-safe handoff surface', () => {
    expect(agentCss).toContain('.graph-agent-runway__summary')
    expect(agentCss).toContain('.graph-agent-package__envelope')
    expect(agentCss).toContain('.graph-agent-runway__metric')
    expect(agentCss).toContain('.graph-agent-package__metric')
    expect(agentCss).toContain('.graph-agent-runway__connector')
    expect(agentCss).toContain('.graph-agent-runway__marker')
    expect(agentCss).toContain('grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr))')
    expect(agentCss).toContain('.grimoire-agent-council__graph-lane')
    expect(agentCss).toContain('[data-state="waiting"]')
    expect(agentCss).toContain('@media (max-width: 720px)')
  })

  it('routes Crystallize review runway through theme-owned materials', () => {
    expect(agentCss).toContain('.grimoire-crystallize-runway')
    expect(agentCss).toContain('.grimoire-crystallize-runway__stage')
    expect(agentCss).toContain('.grimoire-crystallize-runway__stage[data-state="blocked"]')
    expect(agentCss).toContain('background: var(--grimoire-crystallize-runway-material)')
    expect(agentCss).toContain('background: var(--grimoire-crystallize-stage-material)')
    expect(agentCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })

  it('remaps inspector and AI panel utility tokens to the active panel material family', () => {
    expect(coherenceCss).toContain(') :is(.ai-panel, .inspector-panel) {')
    expect(coherenceCss).toContain('--background: var(--surface-panel)')
    expect(coherenceCss).toContain('--card: var(--surface-card)')
    expect(coherenceCss).toContain('--muted: color-mix(in srgb, var(--surface-card) 72%, var(--surface-panel))')
  })

  it('lets Graphite Archive feed its panel material into shared panel material', () => {
    expect(polishCss).toContain('--grimoire-panel-material: var(--grimoire-panel-gradient), var(--surface-panel)')
  })
})

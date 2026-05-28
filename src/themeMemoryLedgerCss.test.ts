import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Memory Ledger theme CSS', () => {
  const css = readFileSync(`${process.cwd()}/src/theme-memory-ledger.css`, 'utf8')
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')

  it('loads after agent handoff materials and before accessibility overrides', () => {
    const agentCouncilIndex = systemThemesCss.indexOf("@import './theme-agent-council.css';")
    const aiBriefIndex = systemThemesCss.indexOf("@import './theme-ai-brief.css';")
    const memoryLedgerIndex = systemThemesCss.indexOf("@import './theme-memory-ledger.css';")
    const accessibilityIndex = systemThemesCss.indexOf("@import './theme-accessibility.css';")

    expect(agentCouncilIndex).toBeGreaterThanOrEqual(0)
    expect(aiBriefIndex).toBeGreaterThan(agentCouncilIndex)
    expect(memoryLedgerIndex).toBeGreaterThan(aiBriefIndex)
    expect(memoryLedgerIndex).toBeLessThan(accessibilityIndex)
  })

  it('routes Memory Ledger records through theme-owned state materials', () => {
    expect(css).toContain('--grimoire-memory-ledger-material')
    expect(css).toContain('--grimoire-memory-ledger-inner-material')
    expect(css).toContain('--grimoire-memory-ledger-audit-material')
    expect(css).toContain('--grimoire-memory-ledger-protected-material')
    expect(css).toContain('--grimoire-memory-ledger-verified')
    expect(css).toContain('--grimoire-memory-ledger-warning')
    expect(css).toContain('[data-memory-tone="danger"]')
    expect(css).toContain('.memory-ledger-badge[data-memory-tone]')
    expect(css).toContain('.grimoire-memory-panel[data-locality="local-only"]')
    expect(css).toContain('.grimoire-memory-signal')
    expect(css).toContain('.grimoire-memory-audit')
    expect(css).toContain('.grimoire-memory-audit__icon')
    expect(css).toContain('background: currentColor')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })

  it('routes Locality Firewall lanes through stateful theme materials', () => {
    expect(css).toContain('--grimoire-firewall-material')
    expect(css).toContain('--grimoire-firewall-blocked-material')
    expect(css).toContain('--grimoire-firewall-guarded-material')
    expect(css).toContain('--grimoire-firewall-review-material')
    expect(css).toContain('.grimoire-locality-firewall[data-locality="local-only"]')
    expect(css).toContain('[data-egress-state="blocked"]')
    expect(css).toContain('[data-egress-state="withheld"]')
    expect(css).toContain('[data-egress-state="review"]')
  })

  it('routes Mobile Review through the same local-first theme material contract', () => {
    expect(css).toContain('--grimoire-mobile-review-material')
    expect(css).toContain('--grimoire-mobile-review-blocked-material')
    expect(css).toContain('--grimoire-mobile-review-inner-material')
    expect(css).toContain('.grimoire-mobile-review[data-mobile-review-state="blocked"]')
    expect(css).toContain('.grimoire-mobile-review__stat')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })
})

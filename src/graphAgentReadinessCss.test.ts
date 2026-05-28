import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readinessCss = readFileSync(`${process.cwd()}/src/graph-agent-readiness.css`, 'utf8')

describe('graph agent readiness CSS', () => {
  it('loads after graph canvas layout styles', () => {
    const indexCss = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')
    const graphIndex = indexCss.indexOf('@import "./graph-animations.css";')
    const readinessIndex = indexCss.indexOf('@import "./graph-agent-readiness.css";')

    expect(graphIndex).toBeGreaterThanOrEqual(0)
    expect(readinessIndex).toBeGreaterThan(graphIndex)
  })

  it('makes agent readiness chips self-explanatory without hiding lanes', () => {
    expect(readinessCss).toContain('.graph-canvas-agent-rail strong')
    expect(readinessCss).toContain('.graph-canvas-agent-rail em')
    expect(readinessCss).toContain('.graph-canvas-agent-rail__mark')
    expect(readinessCss).toContain('.graph-agent-command-center')
    expect(readinessCss).toContain('.graph-agent-command-center__stack')
    expect(readinessCss).toContain('span[data-state="ready"] .graph-canvas-agent-rail__mark')
    expect(readinessCss).toContain('span[data-state="guarded"] .graph-canvas-agent-rail__mark')
    expect(readinessCss).toContain('span[data-state="blocked"] .graph-canvas-agent-rail__mark')
    expect(readinessCss).toContain('span[data-state="guarded"] em')
    expect(readinessCss).toContain('span[data-state="blocked"] em')
    expect(readinessCss).toContain('.grimoire-graph-agent-orbit__health')
    expect(readinessCss).toContain('data-availability="missing"')
    expect(readinessCss).toContain('data-availability="checking"')
    expect(readinessCss).toContain('.graph-canvas-legend__item[data-tone="health"] .graph-canvas-legend__mark')
    expect(readinessCss).toContain('.grimoire-graph-node:focus-visible')
    expect(readinessCss).toContain('.grimoire-graph-node:focus-visible .grimoire-graph-node-core')
    expect(readinessCss).not.toContain('display: none')
  })
})

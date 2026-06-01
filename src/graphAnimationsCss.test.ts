import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const graphCss = readFileSync(`${process.cwd()}/src/graph-animations.css`, 'utf8')

function ruleBody(selector: string): string {
  const start = graphCss.indexOf(`${selector} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  const bodyStart = graphCss.indexOf('{', start)
  const bodyEnd = graphCss.indexOf('}', bodyStart)
  return graphCss.slice(bodyStart + 1, bodyEnd)
}

describe('graph animation and layout CSS', () => {
  it('reserves graph canvas rails instead of overlaying HUD and legend over nodes', () => {
    expect(ruleBody('.graph-canvas-shell')).toContain('grid-template-rows: auto minmax(0, 1fr) auto')
    expect(ruleBody('.graph-canvas-hud')).toContain('position: relative')
    expect(ruleBody('.graph-canvas-hud')).not.toContain('position: absolute')
    expect(ruleBody('.graph-canvas-legend')).toContain('position: relative')
    expect(ruleBody('.graph-canvas-legend')).not.toContain('position: absolute')
  })

  it('keeps graph canvas rails responsive without hiding package state', () => {
    expect(graphCss).toContain('@media (max-width: 720px)')
    expect(graphCss).toContain('.graph-canvas-agent-rail')
    expect(graphCss).toContain('margin-left: 0')
    expect(graphCss).not.toContain('display: none')
  })
})

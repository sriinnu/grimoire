import { describe, expect, it } from 'vitest'
import { GRAPH_CENTER_X, GRAPH_CENTER_Y, type PositionedGraphNode } from '../utils/graphDisplay'
import { createSpringEngine } from './graphForceEngine'

function node(id: string, x: number, y: number, active = false): PositionedGraphNode {
  return {
    id,
    path: `${id}.md`,
    title: id,
    type: 'note',
    degree: 1,
    active,
    neighborhood: true,
    color: '#64748b',
    lightColor: '#cbd5e1',
    x,
    y,
  }
}

describe('createSpringEngine', () => {
  it('hard-pins the selected note to the graph center', () => {
    const engine = createSpringEngine()
    engine.seed([node('active', 120, 140, true), node('other', 760, 420)], [])
    engine.setPinned('active')

    engine.tick(1)

    expect(engine.positions().get('active')).toEqual({ x: GRAPH_CENTER_X, y: GRAPH_CENTER_Y })
    expect(engine.maxVelocity()).toBeGreaterThanOrEqual(0)
  })

  it('holds dragged notes at their pointer position until released', () => {
    const engine = createSpringEngine()
    engine.seed([node('dragged', 300, 240)], [])
    engine.pin('dragged', 420, 280)

    engine.tick(1)
    expect(engine.positions().get('dragged')).toEqual({ x: 420, y: 280 })

    engine.unpin('dragged')
    engine.tick(1)
    expect(engine.positions().get('dragged')).not.toEqual({ x: 420, y: 280 })
  })

  it('drops removed nodes and preserves surviving positions when reseeded', () => {
    const engine = createSpringEngine()
    engine.seed([node('keep', 320, 260), node('remove', 680, 360)], [])
    engine.pin('keep', 410, 290)
    engine.tick(1)
    engine.seed([node('keep', 10, 10), node('new', 720, 400)], [])

    expect(engine.positions().get('keep')).toEqual({ x: 410, y: 290 })
    expect(engine.positions().has('remove')).toBe(false)
    expect(engine.positions().get('new')).toEqual({ x: 720, y: 400 })
  })
})

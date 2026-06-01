import { describe, expect, it } from 'vitest'
import { getPrivateAgentLane, listPrivateAgentLanes } from './privateAgentLanes'

describe('privateAgentLanes', () => {
  it('tracks Chitragupta, Woosh, and Tring CLI as private local lanes', () => {
    expect(listPrivateAgentLanes().map((lane) => lane.id)).toEqual([
      'chitragupta',
      'woosh',
      'tring_cli',
    ])
  })

  it('keeps every private lane local-only by default', () => {
    for (const lane of listPrivateAgentLanes()) {
      expect(lane.privacy).toBe('private-local')
      expect(lane.crossesVaultBoundaryByDefault).toBe(false)
      expect(lane.publicSurface).toBe('health-permissions-outputs')
    }
  })

  it('does not publish implementation paths or credentials through lane metadata', () => {
    const serialized = JSON.stringify(listPrivateAgentLanes())

    expect(serialized).not.toContain('/Users/')
    expect(serialized).not.toMatch(/token|secret|password|api[_-]?key/i)
  })

  it('resolves a lane by stable id', () => {
    expect(getPrivateAgentLane('tring_cli').label).toBe('Tring CLI')
  })
})

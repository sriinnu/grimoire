import { describe, expect, it } from 'vitest'
import { isListConversion, listRunAround, turnIntoTargets, type PlanBlock } from './turnIntoPlan'

function doc(blocks: PlanBlock[]) {
  const byId = new Map(blocks.map((block) => [block.id, block]))
  const index = (id: string) => blocks.findIndex((block) => block.id === id)
  return {
    getPrevBlock: (id: string) => blocks[index(id) - 1],
    getNextBlock: (id: string) => blocks[index(id) + 1],
    block: (id: string) => byId.get(id)!,
  }
}

const b = (id: string, type: string, children?: PlanBlock[]): PlanBlock => ({ id, type, children })

describe('isListConversion', () => {
  it('is true only between two different list kinds', () => {
    expect(isListConversion('numberedListItem', 'bulletListItem')).toBe(true)
    expect(isListConversion('bulletListItem', 'checkListItem')).toBe(true)
    expect(isListConversion('bulletListItem', 'bulletListItem')).toBe(false)
    expect(isListConversion('numberedListItem', 'paragraph')).toBe(false)
    expect(isListConversion('paragraph', 'bulletListItem')).toBe(false)
  })
})

describe('listRunAround', () => {
  it('collects the contiguous run of same-kind siblings around the block, in order', () => {
    const d = doc([
      b('p', 'paragraph'),
      b('n1', 'numberedListItem'),
      b('n2', 'numberedListItem'),
      b('n3', 'numberedListItem'),
      b('q', 'quote'),
      b('n4', 'numberedListItem'),
    ])
    expect(listRunAround(d.block('n2'), d).map((x) => x.id)).toEqual(['n1', 'n2', 'n3'])
    expect(listRunAround(d.block('n4'), d).map((x) => x.id)).toEqual(['n4'])
  })

  it('stops at a sibling of a different list kind', () => {
    const d = doc([b('u1', 'bulletListItem'), b('n1', 'numberedListItem'), b('n2', 'numberedListItem'), b('c1', 'checkListItem')])
    expect(listRunAround(d.block('n1'), d).map((x) => x.id)).toEqual(['n1', 'n2'])
  })

  it('includes nested sub-lists of the same kind and leaves other kinds alone', () => {
    const d = doc([
      b('n1', 'numberedListItem', [b('n1a', 'numberedListItem', [b('n1a1', 'numberedListItem')]), b('n1b', 'bulletListItem')]),
      b('n2', 'numberedListItem', [b('n2a', 'checkListItem')]),
    ])
    expect(listRunAround(d.block('n1'), d).map((x) => x.id)).toEqual(['n1', 'n1a', 'n1a1', 'n2'])
  })

  it('works when the editor offers no sibling lookups', () => {
    expect(listRunAround(b('n1', 'numberedListItem'), {}).map((x) => x.id)).toEqual(['n1'])
  })
})

describe('turnIntoTargets', () => {
  const d = doc([b('n1', 'numberedListItem'), b('n2', 'numberedListItem'), b('n3', 'numberedListItem')])

  it('turns the whole list for list-to-list conversions', () => {
    expect(turnIntoTargets(d.block('n2'), 'bulletListItem', d).map((x) => x.id)).toEqual(['n1', 'n2', 'n3'])
    expect(turnIntoTargets(d.block('n2'), 'checkListItem', d).map((x) => x.id)).toEqual(['n1', 'n2', 'n3'])
  })

  it('touches only the focused item when leaving the list family', () => {
    for (const target of ['paragraph', 'heading', 'quote', 'codeBlock']) {
      expect(turnIntoTargets(d.block('n2'), target, d).map((x) => x.id)).toEqual(['n2'])
    }
  })

  it('touches only the focused block when it is not a list item', () => {
    const p = doc([b('p1', 'paragraph'), b('p2', 'paragraph')])
    expect(turnIntoTargets(p.block('p1'), 'bulletListItem', p).map((x) => x.id)).toEqual(['p1'])
    expect(turnIntoTargets(p.block('p1'), 'heading', p).map((x) => x.id)).toEqual(['p1'])
  })
})

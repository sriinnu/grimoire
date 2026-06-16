import { describe, expect, it } from 'vitest'
import { clampFixedMenuPosition } from './fixedMenuPosition'

describe('clampFixedMenuPosition', () => {
  it('keeps fixed menus inside the viewport gap', () => {
    const position = clampFixedMenuPosition(1020, 760, {
      width: 196,
      height: 86,
      gap: 8,
    })

    expect(position).toEqual({ left: 820, top: 674 })
  })

  it('keeps tiny viewport menus anchored to the gap instead of going negative', () => {
    const position = clampFixedMenuPosition(80, 40, {
      width: 1200,
      height: 900,
      gap: 8,
    })

    expect(position).toEqual({ left: 8, top: 8 })
  })
})

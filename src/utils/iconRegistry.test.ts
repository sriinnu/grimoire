import { describe, it, expect } from 'vitest'
import { resolveIcon } from './iconRegistry'
import { ICON_OPTIONS } from './iconOptions'
import { Calendar, CookingPot, FileText, GearSix, Leaf, Megaphone, Sparkle, User } from '@phosphor-icons/react'

describe('resolveIcon', () => {
  it('returns FileText for null', () => {
    expect(resolveIcon(null)).toBe(FileText)
  })

  it('returns FileText for unknown icon name', () => {
    expect(resolveIcon('nonexistent-icon')).toBe(FileText)
  })

  it('resolves gear-six to GearSix', () => {
    expect(resolveIcon('gear-six')).toBe(GearSix)
  })

  it('resolves cooking-pot to CookingPot', () => {
    expect(resolveIcon('cooking-pot')).toBe(CookingPot)
  })

  it('keeps common saved type icons in the hot runtime map', () => {
    expect(resolveIcon('calendar')).toBe(Calendar)
    expect(resolveIcon('leaf')).toBe(Leaf)
    expect(resolveIcon('megaphone')).toBe(Megaphone)
    expect(resolveIcon('sparkles')).toBe(Sparkle)
    expect(resolveIcon('user')).toBe(User)
  })
})

describe('ICON_OPTIONS', () => {
  it('includes gear-six', () => {
    expect(ICON_OPTIONS.some((o) => o.name === 'gear-six')).toBe(true)
  })
})

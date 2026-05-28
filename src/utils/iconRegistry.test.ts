import { describe, it, expect } from 'vitest'
import { resolveIcon } from './iconRegistry'
import { ICON_OPTIONS } from './iconOptions'
import { Calendar, CookingPot, FileText, GearSix, Leaf, Megaphone, Sparkle, User } from '@phosphor-icons/react'
import {
  BrainIcon,
  GrimoireStarIcon,
  PuranasIcon,
  RishiIcon,
  SecondBrainIcon,
  ShaastrasIcon,
  VedasIcon,
} from '../components/icons/grimoireKnowledgeIcons'

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

  it('resolves Grimoire-native knowledge icons from saved frontmatter names', () => {
    expect(resolveIcon('brain')).toBe(BrainIcon)
    expect(resolveIcon('second-brain')).toBe(SecondBrainIcon)
    expect(resolveIcon('vedas')).toBe(VedasIcon)
    expect(resolveIcon('shaastras')).toBe(ShaastrasIcon)
    expect(resolveIcon('puranas')).toBe(PuranasIcon)
    expect(resolveIcon('rishi')).toBe(RishiIcon)
    expect(resolveIcon('star')).toBe(GrimoireStarIcon)
  })
})

describe('ICON_OPTIONS', () => {
  it('includes gear-six', () => {
    expect(ICON_OPTIONS.some((o) => o.name === 'gear-six')).toBe(true)
  })

  it('shows Grimoire-native knowledge icons in the picker', () => {
    const iconsByName = new Map(ICON_OPTIONS.map((option) => [option.name, option.Icon]))

    expect(iconsByName.get('brain')).toBe(BrainIcon)
    expect(iconsByName.get('star')).toBe(GrimoireStarIcon)
    expect(iconsByName.get('vedas')).toBe(VedasIcon)
  })
})

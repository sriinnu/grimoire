import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  BrainIcon,
  GrimoireStarIcon,
  PuranasIcon,
  RishiIcon,
  SecondBrainIcon,
  ShaastrasIcon,
  VedasIcon,
} from './grimoireKnowledgeIcons'

const KNOWLEDGE_ICONS = [
  ['brain', BrainIcon],
  ['puranas', PuranasIcon],
  ['rishi', RishiIcon],
  ['second-brain', SecondBrainIcon],
  ['shaastras', ShaastrasIcon],
  ['star', GrimoireStarIcon],
  ['vedas', VedasIcon],
] as const

describe('grimoire knowledge icons', () => {
  it.each(KNOWLEDGE_ICONS)('renders the %s glyph with themed color channels', (name, Icon) => {
    render(<Icon color="#123456" data-testid="knowledge-icon" size={32} weight="bold" />)

    const svg = screen.getByTestId('knowledge-icon')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-knowledge-icon', name)
    expect(svg).toHaveAttribute('height', '32')
    expect(svg).toHaveAttribute('stroke-width', '2.15')
    expect(svg.style.getPropertyValue('--knowledge-icon-primary')).toBe('#123456')
    expect(svg.querySelector('[stroke="var(--knowledge-icon-accent)"], [fill="var(--knowledge-icon-accent)"]')).not.toBeNull()
  })
})

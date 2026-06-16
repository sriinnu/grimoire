import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileText } from '@phosphor-icons/react'
import { SectionContent } from './SidebarSectionContent'

describe('SidebarSectionContent', () => {
  it('renders custom section icons inside a theme-tonal glyph shell', () => {
    const { container } = render(
      <SectionContent
        group={{
          label: 'Vedas',
          type: 'Vedas',
          Icon: FileText,
          customColor: 'yellow',
          iconValue: 'vedas',
        }}
        itemCount={8}
        selection={{ kind: 'sectionGroup', type: 'Vedas' }}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    )

    const glyph = container.querySelector('.sidebar-section-glyph')
    const iconWrapper = container.querySelector('.sidebar-section-glyph__icon')
    expect(glyph).toHaveAttribute('data-active', 'true')
    expect(glyph?.getAttribute('style')).toContain('--sidebar-section-tone')
    expect(iconWrapper).toHaveStyle({ height: '18px', width: '18px' })
    expect(container.querySelector('[data-knowledge-icon="vedas"]')).not.toBeNull()
    expect(iconWrapper).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__aura')).toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__route')).toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__thread')).toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__bead')).toBeNull()
  })

  it('renders starter vault section icons on the first paint', () => {
    const { container } = render(
      <SectionContent
        group={{
          label: 'Ideas',
          type: 'Topic',
          Icon: FileText,
          customColor: 'blue',
          iconValue: 'books',
        }}
        itemCount={3}
        selection={{ kind: 'sectionGroup', type: 'Note' }}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
      />,
    )

    expect(container.querySelector('.sidebar-section-glyph__icon svg')).not.toBeNull()
  })
})

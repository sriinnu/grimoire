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
    expect(glyph).toHaveAttribute('data-active', 'true')
    expect(glyph?.getAttribute('style')).toContain('--sidebar-section-tone')
    expect(container.querySelector('[data-knowledge-icon="vedas"]')).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__icon')).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__aura')).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__route')).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__thread')).not.toBeNull()
    expect(container.querySelector('.sidebar-section-glyph__bead')).not.toBeNull()
  })
})

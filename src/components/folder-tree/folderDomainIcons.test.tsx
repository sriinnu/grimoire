import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AgentFolderGlyphIcon,
  AstralFolderGlyphIcon,
  DataFolderGlyphIcon,
  DefaultFolderGlyphIcon,
  DefaultFolderOpenGlyphIcon,
  DevFolderGlyphIcon,
  DocsFolderGlyphIcon,
  JournalFolderGlyphIcon,
  PrivateFolderGlyphIcon,
  ResearchFolderGlyphIcon,
  StorageFolderGlyphIcon,
  TemplateFolderGlyphIcon,
  VaultFolderGlyphIcon,
} from './folderDomainIcons'

const DOMAIN_FOLDER_GLYPHS = [
  ['agent', AgentFolderGlyphIcon],
  ['astral', AstralFolderGlyphIcon],
  ['data', DataFolderGlyphIcon],
  ['folder', DefaultFolderGlyphIcon],
  ['folder-open', DefaultFolderOpenGlyphIcon],
  ['dev', DevFolderGlyphIcon],
  ['docs', DocsFolderGlyphIcon],
  ['journal', JournalFolderGlyphIcon],
  ['private', PrivateFolderGlyphIcon],
  ['research', ResearchFolderGlyphIcon],
  ['storage', StorageFolderGlyphIcon],
  ['template', TemplateFolderGlyphIcon],
  ['vault', VaultFolderGlyphIcon],
] as const

describe('domain folder glyph icons', () => {
  it.each(DOMAIN_FOLDER_GLYPHS)('renders the %s folder glyph with theme channels', (name, Icon) => {
    render(<Icon color="#456789" data-testid="domain-folder-glyph" size={30} weight="duotone" />)

    const svg = screen.getByTestId('domain-folder-glyph')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('data-domain-folder-glyph', name)
    expect(svg).toHaveAttribute('height', '30')
    expect(svg).toHaveAttribute('stroke-width', '1.9')
    expect(svg.style.getPropertyValue('--domain-folder-primary')).toBe('#456789')
    expect(svg.style.getPropertyValue('--domain-folder-route')).toContain('var(--accent-blue')
    expect(svg.style.getPropertyValue('--domain-folder-warm')).toContain('var(--accent-yellow')
    expect(svg.style.getPropertyValue('--domain-folder-memory')).toContain('var(--accent-purple')
    expect(svg.style.getPropertyValue('--domain-folder-bright')).toContain('var(--sidebar-primary-foreground')
    expect(svg.querySelector('[stroke="var(--domain-folder-aura)"], [fill="var(--domain-folder-aura)"]')).not.toBeNull()
    expect(svg.querySelector('[stroke="var(--domain-folder-memory)"], [fill="var(--domain-folder-bright)"]')).not.toBeNull()
  })
})

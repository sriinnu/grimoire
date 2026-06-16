import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const DEFAULT_NOTEBOOK_SURFACES = [
  'src/components/sidebar/SidebarArtwork.tsx',
  'src/sidebar-artwork-themes.css',
  'src/sidebar-artwork-atlas.css',
  'src/sidebar-artwork-polish.css',
  'src/sidebar-appearance.css',
  'src/themes/presets.json',
  'src/lib/i18n.ts',
  'src/lib/i18nLocaleTranslations.ts',
  'src/utils/typeIconImages.ts',
  'src/components/TypeImagePicker.tsx',
  'src/components/GrimoireRefreshAnimation.tsx',
  'src/components/GrimoireRefreshAnimation.css',
  'src/components/EditorLoadingState.tsx',
  'src/components/EditorLoadingState.css',
  'src/system-themes.css',
  'src/fonts.css',
  'src/sidebar-brand.css',
  'src/utils/sidebarSections.ts',
  'src/components/sidebar/SidebarSections.tsx',
  'src/components/sidebar/SidebarVisibilityPopover.tsx',
  'src/components/sidebar/SidebarSectionContent.tsx',
] as const

const BANNED_DEFAULT_COPY = [
  'Daylight Atelier',
  'daylight-atelier',
  'prabhat-studio',
  'retro-terminal',
  'daylightAtelier',
  'prabhatStudio',
  'retroTerminal',
  'settings.themePreset.group.studio',
  'settings.themePreset.group.lab',
  'Bright studio panels',
  'Graph Lab',
  'Local Console',
  'local console',
  'Cloud Blocked',
  'Open Threads',
  'Private Lanes',
  'Local metadata',
  'Next Mark',
  'Agent Context',
  'Only listed public references can travel',
  'Spelllink badge',
  'Spark badge',
  'Ritual badge',
  'Studio badge',
  'Built-in type image badges',
  '-badge',
  'spelllink',
  'spark-badge',
  'ritual-badge',
  'studio-badge',
  'lab-badge',
  'portal-badge',
  '#9bff7a',
  '#62f2b6',
  '#dcf8cf',
  '#8daa80',
  'Grimoire Caveat',
  'Opening the vault',
  'Shelves',
  'Customize sections',
  'Show in sidebar',
  'Rename section',
  'Customize icon & color',
  'Projects',
  'Responsibilities',
  'Procedures',
] as const

const BANNED_DEFAULT_ART = [
  'sidebar-artwork__rishi',
  'sidebar-artwork__palm-leaf',
  'sidebar-artwork__purana-scroll',
  'sidebar-artwork__ribbon--veda',
  'sidebar-artwork__scripture-bind',
  'sidebar-artwork__glyph--sigil',
  'sidebar-artwork__glyph--vault-atlas',
  'sidebar-artwork__glyph--living-grimoire',
  '--art-rishi',
  '--art-veda',
  '--art-shastra',
  '--art-purana',
  '--art-spark',
  '--art-second-brain',
  'grimoire-refresh__spark',
  'grimoire-refresh__orbit',
  'grimoire-refresh__glint',
  'grimoire-book-hop',
  'grimoire-spark',
  'editor-loading__wand',
  'editor-loading__wand-tip',
  'editor-loading__spark',
] as const

function readSurface(path: string): string {
  return readFileSync(`${process.cwd()}/${path}`, 'utf8')
}

describe('default notebook language', () => {
  it('keeps default UI copy out of fantasy, lab, and studio language', () => {
    const combined = DEFAULT_NOTEBOOK_SURFACES.map(readSurface).join('\n')

    for (const phrase of BANNED_DEFAULT_COPY) {
      expect(combined).not.toContain(phrase)
    }
  })

  it('keeps default sidebar artwork as notebook marks instead of literal mythology glyphs', () => {
    const art = [
      'src/components/sidebar/SidebarArtwork.tsx',
      'src/sidebar-artwork-themes.css',
      'src/sidebar-artwork-atlas.css',
      'src/sidebar-artwork-polish.css',
      'src/sidebar-appearance.css',
    ].map(readSurface).join('\n')

    expect(art).toContain('notebook-mark')
    for (const term of BANNED_DEFAULT_ART) {
      expect(art).not.toContain(term)
    }
  })

  it('keeps the sidebar wordmark handwritten without novelty marker styling', () => {
    const brand = readSurface('src/sidebar-brand.css')

    expect(brand).toContain('var(--grimoire-wordmark-font-family)')
    expect(brand).not.toContain('"Noteworthy"')
    expect(brand).not.toContain('"Snell Roundhand"')
    expect(brand).not.toContain('"Apple Chancery"')
    expect(brand).toContain('font-family: var(--grimoire-wordmark-font-family)')
    expect(brand).toContain('.sidebar-brand-wordmark__letter')
    expect(brand).not.toContain('.sidebar-brand-wordmark::after')
    expect(brand).not.toContain('letter-spacing: 0.012em')
  })
})

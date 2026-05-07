import { describe, expect, it } from 'vitest'
import {
  FONT_ASSETS,
  applyFontRolesToDocument,
  resolveFontAssetIds,
  resolveFontRoles,
} from './fontConfig'

describe('fontConfig', () => {
  it('uses Caveat as the manuscript display font', () => {
    const roles = resolveFontRoles({
      themePreset: 'manuscript',
      editorFont: 'system',
    })

    expect(roles.display).toContain("'Caveat'")
    expect(resolveFontAssetIds({
      themePreset: 'manuscript',
      editorFont: 'system',
    })).toEqual(['caveat'])
  })

  it('keeps editor font preference separate from display font', () => {
    const roles = resolveFontRoles({
      themePreset: 'manuscript',
      editorFont: 'serif',
    })

    expect(roles.display).toContain("'Caveat'")
    expect(roles.editor).toContain('Iowan Old Style')
  })

  it('applies resolved font roles as root CSS variables', () => {
    applyFontRolesToDocument(document, {
      themePreset: 'manuscript',
      editorFont: 'mono',
    })

    expect(document.documentElement.style.getPropertyValue('--grimoire-display-font-family')).toContain("'Caveat'")
    expect(document.documentElement.style.getPropertyValue('--grimoire-editor-font-family')).toContain('SF Mono')
  })

  it('points the Caveat asset at the local bundled font file', () => {
    expect(FONT_ASSETS.caveat.family).toBe('Caveat')
    expect(FONT_ASSETS.caveat.source).toContain('Caveat-VariableFont_wght.ttf')
  })
})

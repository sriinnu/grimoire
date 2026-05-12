import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  FONT_ASSETS,
  applyFontRolesToDocument,
  resolveFontAssetIds,
  resolveFontRoles,
} from './fontConfig'

describe('fontConfig', () => {
  it('uses bundled Caveat as the display font across presets', () => {
    const roles = resolveFontRoles({
      themePreset: 'future',
      editorFont: 'system',
    })

    expect(roles.display).toContain("'Grimoire Caveat'")
    expect(resolveFontAssetIds({
      themePreset: 'future',
      editorFont: 'system',
    })).toEqual(['caveat'])
  })

  it('keeps editor font preference separate from display font', () => {
    const roles = resolveFontRoles({
      themePreset: 'manuscript',
      editorFont: 'serif',
    })

    expect(roles.display).toContain("'Grimoire Caveat'")
    expect(roles.editor).toContain('Iowan Old Style')
  })

  it('can use Caveat as the editor font when handwritten is selected', () => {
    const roles = resolveFontRoles({
      themePreset: 'manuscript',
      editorFont: 'handwritten',
    })

    expect(roles.editor).toContain("'Grimoire Caveat'")
  })

  it('applies resolved font roles as root CSS variables', () => {
    applyFontRolesToDocument(document, {
      themePreset: 'manuscript',
      editorFont: 'mono',
    })

    expect(document.documentElement.style.getPropertyValue('--grimoire-display-font-family')).toContain("'Grimoire Caveat'")
    expect(document.documentElement.style.getPropertyValue('--grimoire-editor-font-family')).toContain('SF Mono')
  })

  it('points the Caveat asset at the local bundled font file', () => {
    expect(FONT_ASSETS.caveat.family).toBe('Grimoire Caveat')
    expect(FONT_ASSETS.caveat.source).toContain('Caveat-VariableFont_wght.ttf')
  })

  it('declares Caveat through CSS so Tauri and web load the same bundled file', () => {
    const css = readFileSync(`${process.cwd()}/src/fonts.css`, 'utf8')

    expect(css).toContain("@font-face")
    expect(css).toContain("font-family: 'Grimoire Caveat'")
    expect(css).toContain("../assets/fonts/Caveat-VariableFont_wght.ttf")
  })
})

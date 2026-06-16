import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  applyFontRolesToDocument,
  resolveFontAssetIds,
  resolveFontRoles,
} from './fontConfig'

describe('fontConfig', () => {
  it('does not ship handwritten font assets for curated defaults', () => {
    const roles = resolveFontRoles({
      themePreset: 'living-archive',
      editorFont: 'system',
    })

    expect(roles.display).toContain("'Literata'")
    expect(resolveFontAssetIds({
      themePreset: 'code-notebook',
      editorFont: 'system',
    })).toEqual([])
    expect(resolveFontAssetIds({
      themePreset: 'living-archive',
      editorFont: 'literary',
    })).toEqual([])
  })

  it('keeps editor font preference separate from display font', () => {
    const roles = resolveFontRoles({
      themePreset: 'living-archive',
      editorFont: 'readable',
    })

    expect(roles.display).toContain("'Literata'")
    expect(roles.editor).toContain('Atkinson Hyperlegible')
  })

  it('uses built-in theme-pack typography roles before user editor overrides', () => {
    const daylightRoles = resolveFontRoles({
      themePreset: 'daylight-notebook',
      editorFont: 'system',
    })
    const retroRoles = resolveFontRoles({
      themePreset: 'code-notebook',
      editorFont: 'mono',
    })

    expect(daylightRoles.display).toContain('New York')
    expect(daylightRoles.label).toContain('SF Pro')
    expect(retroRoles.ui).toContain('SF Pro')
    expect(retroRoles.editor).toContain('Berkeley Mono')
    expect(retroRoles.editor).toMatch(/^'Grimoire Berkeley Mono'/)
    expect(retroRoles.editor).toContain('TX-02 Berkeley Mono')
    expect(retroRoles.editor).toContain('SF Mono')
    expect(retroRoles.mono).toContain('Berkeley Mono')
    expect(retroRoles.mono).toMatch(/^'Grimoire Berkeley Mono'/)
    expect(retroRoles.mono).toContain('SF Mono')
  })

  it('curates editor choices to book, editorial, manuscript, sans, and mono stacks', () => {
    const roles = resolveFontRoles({
      themePreset: 'living-archive',
      editorFont: 'literary',
    })

    expect(roles.editor).toContain("'Literata'")
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'system' }).editor).toContain('SF Pro')
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'readable' }).editor).toContain('Atkinson Hyperlegible')
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'humanist' }).editor).toContain('Avenir Next')
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'editorial' }).editor).toContain('New York')
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'manuscript' }).editor).toContain('Palatino')
    expect(resolveFontRoles({ themePreset: 'living-archive', editorFont: 'mono' }).editor).toContain('Berkeley Mono')
  })

  it('applies resolved font roles as root CSS variables', () => {
    applyFontRolesToDocument(document, {
      themePreset: 'living-archive',
      editorFont: 'mono',
    })

    expect(document.documentElement.style.getPropertyValue('--grimoire-display-font-family')).toContain("'Literata'")
    expect(document.documentElement.style.getPropertyValue('--grimoire-editor-font-family')).toContain('TX-02 Berkeley Mono')
    expect(document.documentElement.style.getPropertyValue('--grimoire-mono-font-family')).toContain('TX-02 Berkeley Mono')
    expect(document.documentElement.style.getPropertyValue('--grimoire-mono-font-family')).toMatch(/^'Grimoire Berkeley Mono'/)
  })

  it('does not declare the old handwritten Caveat face', () => {
    const css = readFileSync(`${process.cwd()}/src/fonts.css`, 'utf8')

    expect(css).not.toContain('Grimoire Caveat')
    expect(css).not.toContain('Caveat-VariableFont_wght.ttf')
  })

  it('declares Berkeley Mono as a local-only app mono face', () => {
    const css = readFileSync(`${process.cwd()}/src/fonts.css`, 'utf8')

    expect(css).toContain("font-family: 'Grimoire Berkeley Mono'")
    expect(css).toContain("local('TX-02 Berkeley Mono')")
    expect(css).toContain("local('TX-02 Berkeley Mono Regular')")
    expect(css).toContain("local('Berkeley Mono')")
    expect(css).not.toContain("url('../assets/fonts/Berkeley")
  })
})

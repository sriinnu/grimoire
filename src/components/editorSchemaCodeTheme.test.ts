import { describe, expect, it, vi } from 'vitest'
import { withDualThemeTokens } from './editorSchema'

describe('code block highlighting', () => {
  it('asks Shiki for light and dark tokens instead of the first loaded (dark) theme', () => {
    const codeToTokens = vi.fn(() => ({ tokens: [] }))
    const getLoadedLanguages = vi.fn(function (this: unknown) { return this === fake ? ['ts'] : [] })
    const fake = { codeToTokens, getLoadedLanguages }

    const wrapped = withDualThemeTokens(fake as never)
    wrapped.codeToTokens('let a = 1', { lang: 'ts', theme: 'github-dark' } as never)

    expect(codeToTokens).toHaveBeenCalledWith('let a = 1', {
      lang: 'ts',
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
    // Other methods pass through, still bound to the real highlighter.
    expect(wrapped.getLoadedLanguages()).toEqual(['ts'])
  })
})

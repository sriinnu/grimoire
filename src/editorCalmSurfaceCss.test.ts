import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const editorCss = readFileSync(`${process.cwd()}/src/components/Editor.css`, 'utf8')
const editorThemeCss = readFileSync(`${process.cwd()}/src/components/EditorTheme.css`, 'utf8')

function cssSection(start: string, end: string): string {
  const startIndex = editorCss.indexOf(start)
  expect(startIndex).toBeGreaterThanOrEqual(0)

  const endIndex = editorCss.indexOf(end, startIndex + start.length)
  expect(endIndex).toBeGreaterThan(startIndex)

  return editorCss.slice(startIndex, endIndex)
}

describe('editor calm writing surface CSS', () => {
  it('disables library motion on the BlockNote root, descendants, and pseudos', () => {
    const guard = cssSection(
      '.editor__blocknote-container,',
      '/* Reduce padding at narrow editor widths',
    )

    expect(guard).toContain('.editor__blocknote-container,')
    expect(guard).toContain('.editor__blocknote-container *,')
    expect(guard).toContain('.editor__blocknote-container *::before,')
    expect(guard).toContain('.editor__blocknote-container *::after')
    expect(guard).toContain('transition: none !important')
    expect(guard).toContain('animation: none !important')
  })

  it('keeps the final theme override calm for selection and checklist controls', () => {
    const selectionIndex = editorThemeCss.indexOf('.editor__blocknote-container .bn-editor ::selection')
    const checklistIndex = editorThemeCss.indexOf('.editor__blocknote-container [data-content-type="checkListItem"] input[type="checkbox"]')
    const guardIndex = editorThemeCss.lastIndexOf('.editor__blocknote-container,')
    const guard = editorThemeCss.slice(guardIndex)

    expect(selectionIndex).toBeGreaterThanOrEqual(0)
    expect(checklistIndex).toBeGreaterThanOrEqual(0)
    expect(guardIndex).toBeGreaterThan(selectionIndex)
    expect(guardIndex).toBeGreaterThan(checklistIndex)
    expect(guard).toContain('.editor__blocknote-container *::before,')
    expect(guard).toContain('.editor__blocknote-container *::after')
    expect(guard).toContain('transition: none !important')
    expect(guard).toContain('animation: none !important')
  })
})

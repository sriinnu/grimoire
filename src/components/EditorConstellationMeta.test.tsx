import { readFileSync } from 'node:fs'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { EditorConstellationMeta } from './EditorConstellationMeta'

const editorMetaCss = readFileSync(`${process.cwd()}/src/components/EditorMeta.css`, 'utf8')

describe('EditorConstellationMeta', () => {
  afterEach(() => {
    cleanup()
    document.documentElement.removeAttribute('data-theme-metadata-fields')
  })

  it('renders metadata values inside constrained pill value slots', () => {
    render(
      <EditorConstellationMeta
        content="# Long note"
        entry={makeEntry({
          isA: 'Project',
          status: 'Active',
          properties: {
            Owner: 'Sriinnu With A Very Long Local Project Context Name',
          },
        })}
      />,
    )

    const strip = screen.getByTestId('editor-meta-strip')
    expect(within(strip).getByText('type')).toHaveClass('editor-meta-pill__label')
    expect(within(strip).getByText('Project')).toHaveClass('editor-meta-pill__value')
    expect(within(strip).getByText(/Very Long Local Project/)).toHaveClass('editor-meta-pill__value')
  })

  it('keeps the metadata strip scrollable instead of mashing chips together', () => {
    expect(editorMetaCss).toContain('.editor-meta-strip')
    expect(editorMetaCss).toContain('overflow-x: auto')
    expect(editorMetaCss).toContain('scrollbar-gutter: stable')
    expect(editorMetaCss).toContain('.editor-meta-pill__value')
    expect(editorMetaCss).toContain('max-width: min(12rem, 44vw)')
  })

  it('honors theme-pack metadata field visibility', () => {
    document.documentElement.setAttribute('data-theme-metadata-fields', 'type modified locality')

    render(
      <EditorConstellationMeta
        content="# Long note"
        entry={makeEntry({
          isA: 'Project',
          status: 'Active',
          properties: {
            Owner: 'Sriinnu',
            priority: 'High',
          },
        })}
      />,
    )

    const strip = screen.getByTestId('editor-meta-strip')
    expect(within(strip).getByText('Project')).toBeInTheDocument()
    expect(within(strip).getByText('local markdown')).toBeInTheDocument()
    expect(within(strip).queryByText('Active')).toBeNull()
    expect(within(strip).queryByText('Sriinnu')).toBeNull()
    expect(within(strip).queryByText('High')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { extractNoteHeadings, findNoteSearchMatches, findNoteWikilinks } from './noteNavigation'

describe('note navigation utilities', () => {
  it('extracts document headings outside frontmatter and code fences', () => {
    const headings = extractNoteHeadings(`---
title: Search Notes
---
# Opening

\`\`\`
## Ignored
\`\`\`

## Details
### Details
`)

    expect(headings).toEqual([
      { level: 1, text: 'Opening', slug: 'opening', line: 4 },
      { level: 2, text: 'Details', slug: 'details', line: 10 },
      { level: 3, text: 'Details', slug: 'details-2', line: 11 },
    ])
  })

  it('returns line-oriented search matches with previews', () => {
    const matches = findNoteSearchMatches('Alpha\nA long alpha line for local navigation\nbeta', 'alpha')

    expect(matches).toEqual([
      { id: '1:0', line: 1, column: 1, occurrenceIndex: 0, match: 'Alpha', preview: 'Alpha' },
      {
        id: '2:7',
        line: 2,
        column: 8,
        occurrenceIndex: 1,
        match: 'alpha',
        preview: 'A long alpha line for local navigation',
      },
    ])
  })

  it('does not search until the query has text', () => {
    expect(findNoteSearchMatches('# Title', '   ')).toEqual([])
  })

  it('finds navigable wikilinks outside code spans and fences', () => {
    const matches = findNoteWikilinks([
      'See [[Core Note]] and [[projects/alpha|Alpha Project]].',
      'Skip `[[Inline Code]]`.',
      '```',
      '[[Fenced Code]]',
      '```',
    ].join('\n'))

    expect(matches).toEqual([
      expect.objectContaining({
        line: 1,
        column: 5,
        match: 'Core Note',
        target: 'Core Note',
        label: 'Core Note',
      }),
      expect.objectContaining({
        line: 1,
        column: 23,
        match: 'Alpha Project',
        target: 'projects/alpha',
        label: 'Alpha Project',
      }),
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { applyCrystallizePatchToContent } from './crystallizeProposal'

describe('crystallize active note patching', () => {
  it('applies frontmatter metadata without erasing existing Markdown fields', () => {
    const next = applyCrystallizePatchToContent(
      [
        '---',
        'title: Grimoire',
        'status: Active',
        'crystallized_memories:',
        '  - "[[Earlier Memory]]"',
        '---',
        '# Grimoire',
      ].join('\n'),
      'last_crystallized_at: "2026-05-16T12:00:00.000Z"\ncrystallized_memories:\n  - "[[New Memory]]"',
      '## Crystallized Follow-up\n\nNext',
    )

    expect(next).toContain('title: Grimoire\nstatus: Active')
    expect(next).toContain('last_crystallized_at: "2026-05-16T12:00:00.000Z"')
    expect(next).toContain('crystallized_memories:\n  - "[[Earlier Memory]]"\n  - "[[New Memory]]"')
    expect(next).toContain('# Grimoire\n\n## Crystallized Follow-up\n\nNext\n')
  })

  it('creates frontmatter when a plain Markdown note is crystallized', () => {
    const next = applyCrystallizePatchToContent(
      '# Plain Note',
      'last_crystallized_at: "2026-05-16T12:00:00.000Z"\ncrystallized_memories:\n  - "[[New Memory]]"',
      '',
    )

    expect(next).toBe([
      '---',
      'last_crystallized_at: "2026-05-16T12:00:00.000Z"',
      'crystallized_memories:',
      '  - "[[New Memory]]"',
      '---',
      '',
      '# Plain Note',
    ].join('\n'))
  })

  it('honors edited hunk fields and preserves inline crystallized memories', () => {
    const next = applyCrystallizePatchToContent(
      '---\ntitle: Grimoire\ncrystallized_memories: ["[[Earlier Memory]]"]\n---\n# Grimoire',
      [
        'last_crystallized_at: "2026-05-17T12:00:00.000Z"',
        'crystallized_memories:',
        '  - "[[New Memory]]"',
        'crystallize_review: "tonight"',
      ].join('\n'),
      '',
    )

    expect(next).toContain('crystallized_memories:\n  - "[[Earlier Memory]]"\n  - "[[New Memory]]"')
    expect(next).toContain('crystallize_review: "tonight"')
  })
})

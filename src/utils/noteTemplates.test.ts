import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATES,
  DREAM_TEMPLATE_OPTIONS,
  DREAM_TEMPLATES,
  JOURNAL_TEMPLATE_OPTIONS,
  JOURNAL_TEMPLATES,
} from './noteTemplates'

describe('note templates', () => {
  it('ships multiple reusable journal and dream templates', () => {
    expect(Object.keys(JOURNAL_TEMPLATES)).toEqual(['daily', 'evening', 'weekly', 'decision'])
    expect(Object.keys(DREAM_TEMPLATES)).toEqual(['capture', 'lucid', 'nightmare', 'symbol'])
    expect(DEFAULT_TEMPLATES.Journal).toBe(JOURNAL_TEMPLATES.daily)
    expect(DEFAULT_TEMPLATES.Dream).toBe(DREAM_TEMPLATES.capture)
    expect(DEFAULT_TEMPLATES.Journal).toContain('## Open Loops')
    expect(DEFAULT_TEMPLATES.Dream).toContain('## Emotional Weather')
    expect(JOURNAL_TEMPLATE_OPTIONS.map((option) => option.id)).toEqual(['daily', 'evening', 'weekly', 'decision'])
    expect(DREAM_TEMPLATE_OPTIONS.map((option) => option.id)).toEqual(['capture', 'lucid', 'nightmare', 'symbol'])
  })
})

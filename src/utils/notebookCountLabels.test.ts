import { describe, expect, it } from 'vitest'
import { formatCalendarCount, formatStateCount, formatTypeCount, formatTypeLabel, pluralizeCount } from './notebookCountLabels'

describe('notebook count labels', () => {
  it('formats type counts in human notebook language', () => {
    expect(formatTypeCount('Note', 18)).toBe('18 notes')
    expect(formatTypeCount('Person', 4)).toBe('4 people')
    expect(formatTypeCount('Project', 2)).toBe('2 works')
    expect(formatTypeCount('Responsibility', 2)).toBe('2 care areas')
    expect(formatTypeCount('Procedure', 1)).toBe('1 way')
    expect(formatTypeCount('Experiment', 3)).toBe('3 trials')
    expect(formatTypeCount('Event', 1)).toBe('1 moment')
    expect(formatTypeCount('Topic', 3)).toBe('3 ideas')
    expect(formatTypeCount('Commit', 2)).toBe('2 saved points')
    expect(formatTypeCount('Agent', 2)).toBe('2 pages')
  })

  it('keeps status counts from becoming fake nouns', () => {
    expect(formatStateCount('Open', 19)).toBe('19 open')
    expect(formatStateCount('Unmarked', 2)).toBe('2 unmarked')
  })

  it('formats mixed calendar agenda counts safely', () => {
    expect(formatCalendarCount('Dream', 1)).toBe('1 dream')
    expect(formatCalendarCount('Open', 1)).toBe('1 open')
    expect(formatCalendarCount('Held local', 2)).toBe('2 held local')
  })

  it('keeps generic plural phrases available', () => {
    expect(pluralizeCount(1, 'page waiting', 'pages waiting')).toBe('1 page waiting')
    expect(pluralizeCount(4, 'page waiting', 'pages waiting')).toBe('4 pages waiting')
  })

  it('formats split count and label surfaces without exposing system types', () => {
    expect(formatTypeLabel('Agent', 2)).toBe('pages')
    expect(formatTypeLabel('Person', 1)).toBe('person')
    expect(formatTypeLabel('Person', 4)).toBe('people')
  })
})

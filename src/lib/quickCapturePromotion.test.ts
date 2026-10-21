import { describe, expect, it } from 'vitest'
import {
  classifyCaptureDraft,
  shouldShowPromotion,
  type Promotion,
} from './quickCapturePromotion'

const LONG_PREFIX = 'This draft keeps going and going until it is comfortably past the character threshold for sure. '

function promo(overrides: Partial<Promotion>): Promotion {
  return { lane: 'note', confidence: 'high', alternatives: [], reason: '', ...overrides }
}

describe('classifyCaptureDraft', () => {
  it('returns null when the user picked a lane explicitly', () => {
    expect(classifyCaptureDraft('- [ ] buy oat milk', 'task')).toBeNull()
    expect(classifyCaptureDraft('what is this note about?', 'ask')).toBeNull()
  })

  it('treats the note default as no explicit pick', () => {
    expect(classifyCaptureDraft('- [ ] buy oat milk', 'note')).toMatchObject({ lane: 'task' })
    expect(classifyCaptureDraft('- [ ] buy oat milk', null)).toMatchObject({ lane: 'task' })
  })

  it('classifies checklist markers as task', () => {
    expect(classifyCaptureDraft('- [ ] call the dentist')).toMatchObject({ lane: 'task', confidence: 'high' })
    expect(classifyCaptureDraft('todo: finish the report')).toMatchObject({ lane: 'task' })
  })

  it('classifies imperative line-start verbs as task', () => {
    expect(classifyCaptureDraft('buy oat milk on the way home')).toMatchObject({ lane: 'task' })
    expect(classifyCaptureDraft('send the contract\nfix the flaky test')).toMatchObject({ lane: 'task' })
    expect(classifyCaptureDraft('I want to buy a boat someday')).toBeNull()
  })

  it('classifies questions as ask', () => {
    expect(classifyCaptureDraft('what did I decide about the memory layer?')).toMatchObject({ lane: 'ask' })
    expect(classifyCaptureDraft('How do wikilinks resolve')).toMatchObject({ lane: 'ask' })
    expect(classifyCaptureDraft('can I sync two vaults')).toMatchObject({ lane: 'ask' })
  })

  it('classifies dream language as dream', () => {
    expect(classifyCaptureDraft('I dreamed about a library with no shelves')).toMatchObject({ lane: 'dream' })
    expect(classifyCaptureDraft('last night I was flying over the vault')).toMatchObject({ lane: 'dream' })
  })

  it('classifies memory language as memory', () => {
    expect(classifyCaptureDraft("remember that the build needs pnpm")).toMatchObject({ lane: 'memory' })
    expect(classifyCaptureDraft("don't forget the anniversary")).toMatchObject({ lane: 'memory' })
    expect(classifyCaptureDraft('never forget why you started')).toMatchObject({ lane: 'memory' })
  })

  it('classifies first-person reflection as journal with low confidence', () => {
    expect(classifyCaptureDraft('I feel scattered today')).toMatchObject({ lane: 'journal', confidence: 'low' })
    expect(classifyCaptureDraft('This morning I felt calm')).toMatchObject({ lane: 'journal' })
    expect(classifyCaptureDraft('grateful for the quiet')).toMatchObject({ lane: 'journal' })
  })

  it('returns null for plain prose', () => {
    expect(classifyCaptureDraft('Operating thesis on memory-native tools')).toBeNull()
    expect(classifyCaptureDraft('')).toBeNull()
    expect(classifyCaptureDraft('   ')).toBeNull()
  })

  it('orders alternatives note → journal → task → memory (max 3), excluding the lane', () => {
    expect(classifyCaptureDraft('I feel good today')?.alternatives).toEqual(['note', 'task', 'memory'])
    expect(classifyCaptureDraft('- [ ] fix it')?.alternatives).toEqual(['note', 'journal', 'memory'])
    expect(classifyCaptureDraft('what is up?')?.alternatives).toEqual(['note', 'journal', 'task'])
  })

  it('includes a short plain-English reason', () => {
    expect(classifyCaptureDraft('- [ ] buy milk')?.reason).toBe('checklist markers found')
    expect(classifyCaptureDraft('buy milk')?.reason).toBe('action verb at line start')
    expect(classifyCaptureDraft('what is this?')?.reason).toBe('shaped like a question')
  })
})

describe('shouldShowPromotion', () => {
  it('never shows without a promotion', () => {
    expect(shouldShowPromotion('x'.repeat(500), null)).toBe(false)
  })

  it('shows high-confidence promotions at 100+ chars', () => {
    const draft = `${LONG_PREFIX}\n- [ ] buy oat milk`
    const promo = classifyCaptureDraft(draft)
    expect(promo?.lane).toBe('task')
    expect(draft.length).toBeGreaterThanOrEqual(100)
    expect(shouldShowPromotion(draft, promo)).toBe(true)
  })

  it('shows high-confidence promotions at 30+ words even under 100 chars', () => {
    const draft = '- [ ] buy ' + 'word '.repeat(30).trim()
    const promo = classifyCaptureDraft(draft)
    expect(shouldShowPromotion(draft, promo)).toBe(true)
  })

  it('hides high-confidence promotions below both thresholds', () => {
    const draft = '- [ ] buy oat milk'
    const promo = classifyCaptureDraft(draft)
    expect(shouldShowPromotion(draft, promo)).toBe(false)
  })

  it('requires both thresholds for low-confidence promotions', () => {
    const charsOnly = `${LONG_PREFIX}I feel good ${'and reflective '.repeat(4)}`
    const wordsOnly = `I feel ${Array.from({ length: 29 }, () => 'w').join(' ')}`
    const both = `${LONG_PREFIX}I feel ` + 'word '.repeat(30).trim()

    const promoChars = classifyCaptureDraft(charsOnly)
    const promoWords = classifyCaptureDraft(wordsOnly)
    const promoBoth = classifyCaptureDraft(both)

    expect(promoChars?.confidence).toBe('low')
    expect(charsOnly.length).toBeGreaterThanOrEqual(120)
    expect((charsOnly.trim().match(/\S+/g) ?? []).length).toBeLessThan(30)
    expect(shouldShowPromotion(charsOnly, promoChars)).toBe(false)

    expect(promoWords?.confidence).toBe('low')
    expect((wordsOnly.trim().match(/\S+/g) ?? []).length).toBeGreaterThanOrEqual(30)
    expect(wordsOnly.length).toBeLessThan(120)
    expect(shouldShowPromotion(wordsOnly, promoWords)).toBe(false)

    expect(both.length).toBeGreaterThanOrEqual(120)
    expect((both.trim().match(/\S+/g) ?? []).length).toBeGreaterThanOrEqual(30)
    expect(shouldShowPromotion(both, promoBoth)).toBe(true)
  })

  it('respects the low gate for a manual promotion object', () => {
    expect(shouldShowPromotion('x'.repeat(130), promo({ confidence: 'low' }))).toBe(false)
    expect(shouldShowPromotion(`${'x '.repeat(30)}${'y'.repeat(120)}`, promo({ confidence: 'low' }))).toBe(true)
  })
})

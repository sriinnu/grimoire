import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatShortcutDisplay, formatShortcutHint } from './appCommandCatalog'

function pretend(userAgent: string, maxTouchPoints = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('')
  Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true })
}

const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605'
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537'
const LINUX = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605'
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605' // iPadOS masquerades as a Mac

describe('formatShortcutDisplay', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps Mac glyphs on macOS', () => {
    pretend(MAC)
    expect(formatShortcutDisplay({ display: '⌘⇧I' })).toBe('⌘⇧I')
    expect(formatShortcutDisplay({ display: '⌘↵' })).toBe('⌘↵')
  })

  it('spells chords out on Windows in Ctrl+Alt+Shift order', () => {
    pretend(WINDOWS)
    expect(formatShortcutDisplay({ display: '⌘⇧I' })).toBe('Ctrl+Shift+I')
    expect(formatShortcutDisplay({ display: '⇧⌘Z' })).toBe('Ctrl+Shift+Z')
    expect(formatShortcutDisplay({ display: '⌘⌥W' })).toBe('Ctrl+Alt+W')
    expect(formatShortcutDisplay({ display: '⌃1' })).toBe('Ctrl+1')
    expect(formatShortcutDisplay({ display: '⌘↵' })).toBe('Ctrl+Enter')
    expect(formatShortcutDisplay({ display: '⎋' })).toBe('Esc')
    expect(formatShortcutDisplay({ display: '⌘P / ⌘O' })).toBe('Ctrl+P / Ctrl+O')
  })

  it('treats Linux like Windows', () => {
    pretend(LINUX)
    expect(formatShortcutDisplay({ display: '⌘⇧Space' })).toBe('Ctrl+Shift+Space')
  })
})

describe('formatShortcutHint', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns a chord on desktop and nothing on touch platforms', () => {
    pretend(WINDOWS)
    expect(formatShortcutHint('⌘↵')).toBe('Ctrl+Enter')
    pretend(IPHONE)
    expect(formatShortcutHint('⌘↵')).toBeNull()
    pretend(IPAD, 5)
    expect(formatShortcutHint('⌘↵')).toBeNull()
    pretend(MAC, 0)
    expect(formatShortcutHint('⌘↵')).toBe('⌘↵')
  })
})

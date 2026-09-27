import { describe, expect, it } from 'vitest'
import { appendCaptureBullet, formatCaptureBullet, formatCaptureTime } from './quickCapture'

const at = new Date(2026, 8, 26, 14, 5)

describe('quick capture formatting', () => {
  it('uses a zero-padded local 24h clock', () => {
    expect(formatCaptureTime(at)).toBe('14:05')
    expect(formatCaptureTime(new Date(2026, 0, 1, 7, 3))).toBe('07:03')
  })

  it('formats a single-line capture as a timestamped bullet', () => {
    expect(formatCaptureBullet('  call the plumber  ', at)).toBe('- 14:05 call the plumber')
  })

  it('keeps multi-line captures inside one list item', () => {
    expect(formatCaptureBullet('idea\r\n\n  second line\nthird', at)).toBe('- 14:05 idea\n  second line\n  third')
  })

  it('returns null for blank input', () => {
    expect(formatCaptureBullet('   \n\t\n', at)).toBeNull()
  })
})

describe('appendCaptureBullet', () => {
  const bullet = '- 14:05 new'

  it('starts an empty note with the bullet', () => {
    expect(appendCaptureBullet('', bullet)).toBe('- 14:05 new\n')
  })

  it('separates the first bullet from a heading or frontmatter with a blank line', () => {
    expect(appendCaptureBullet('---\ntype: Journal\n---\n# Journal 2026-09-26\n', bullet))
      .toBe('---\ntype: Journal\n---\n# Journal 2026-09-26\n\n- 14:05 new\n')
    expect(appendCaptureBullet('---\ntype: Journal\n---\n', bullet)).toBe('---\ntype: Journal\n---\n\n- 14:05 new\n')
  })

  it('stacks onto an existing trailing list', () => {
    expect(appendCaptureBullet('# Today\n\n- 09:00 coffee\n\n\n', bullet)).toBe('# Today\n\n- 09:00 coffee\n- 14:05 new\n')
    expect(appendCaptureBullet('- 09:00 a\n  more', bullet)).toBe('- 09:00 a\n  more\n- 14:05 new\n')
  })
})
